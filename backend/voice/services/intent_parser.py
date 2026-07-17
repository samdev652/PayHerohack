import json
import logging
from decouple import config
import google.generativeai as genai
from voice.models import VoiceCommandLog

logger = logging.getLogger(__name__)

import os
api_key = config('GEMINI_API_KEY', default='')
if api_key:
    os.environ['GOOGLE_API_KEY'] = api_key
    genai.configure(api_key=api_key)

SYSTEM_INSTRUCTION = """\
You are a business assistant that parses spoken commands from users
into structured JSON. Commands will be in English.

Common patterns to recognize:
- Sales: "Sold [name] [item] for [amount]" / "I just sold [item] for [amount]"
- Expenses: "Bought [item] for [amount]" / "I spent [amount] on [item]"
- Send money: "Send [name] [amount]" / "Transfer [amount] to [name]"
- Request payment: "Ask [name] to pay [amount]" / "Request [amount] from [name]"
- Summary request: "How am I doing today" / "Summary"

Respond ONLY with valid JSON, no markdown formatting, no explanation, matching exactly
this schema:

{
  "intent": "log_sale" | "log_expense" | "send_payment" | "request_payment" | "get_summary" | "unknown",
  "amount": number or null,
  "counterparty_name": string or null,
  "item_description": string or null,
  "confidence": "high" | "medium" | "low",
  "requires_confirmation": boolean (true ONLY if intent == "send_payment" and amount >= 1000, otherwise false),
  "spoken_confirmation": "A short, natural English confirmation sentence. If requires_confirmation is true, it MUST end with asking the trader to confirm with 'yes'. Example: 'I heard you, sending 1000 to John. Please say yes to confirm.'"
}

If the command is ambiguous or you cannot extract an amount, set intent to "unknown"
and confidence to "low", and write a spoken_confirmation asking the trader to repeat
more clearly.
"""

def parse_voice_command(transcribed_text: str, trader_context: dict) -> dict:
    fallback_response = {
        "intent": "unknown",
        "confidence": "low",
        "spoken_confirmation": "Sorry, I didn't understand that. Please try again."
    }

    try:
        model = genai.GenerativeModel(
            'gemma-4-31b-it',
            system_instruction=SYSTEM_INSTRUCTION
        )
        
        prompt = (
            f"Trader Context:\n"
            f"Name: {trader_context.get('name', 'Unknown')}\n"
            f"Business Name: {trader_context.get('business_name', 'Unknown')}\n"
            f"Preferred Language: en\n\n"
            f"Transcribed Text: \"{transcribed_text}\""
        )

        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Extract JSON block robustly
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            json_str = text[start_idx:end_idx+1]
            parsed_intent = json.loads(json_str)
        else:
            raise ValueError("No JSON object found in response")
        
    except Exception as e:
        logger.error(f"Failed to parse intent: {e}")
        try:
            logger.error(f"Raw text was: {text}")
        except:
            pass
        parsed_intent = fallback_response
        
    # Log the command
    try:
        trader_id = trader_context.get('id')
        action_taken = parsed_intent.get('intent', 'unknown')
        
        VoiceCommandLog.objects.create(
            trader_id=trader_id,
            transcribed_text=transcribed_text,
            parsed_intent=parsed_intent,
            action_taken=action_taken
        )
    except Exception as e:
        logger.error(f"Failed to log voice command: {e}")

    return parsed_intent
