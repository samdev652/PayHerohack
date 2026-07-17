# Sema 🎙️📈

> *Sema turns an informal trader's PayHero Wallet into something they can run their entire business with, just by talking to it in English. Typing into an app is friction mama mbogas, kiosk owners, and boda riders don't have time for. This is a big part of why 5.85 million informal Kenyan businesses exist, yet only 0.8% of them can ever get a bank loan, since banks have nothing to judge them by.*

**Sema fixes this by letting traders just talk.**

Traders speak a sentence like *"Sold Mary mangoes for 1,000"*, and the AI backend (powered by Google Gemma/Gemini) turns that into a structured, logged sale or expense. When money needs to actually move—sending cash to a supplier or collecting payment from a customer—**PayHero** handles the real M-Pesa STK push and B2C payouts. Every transaction is confirmed and safeguarded before it goes through.

Over time, that everyday spoken record becomes something no informal trader currently has: a real, verifiable financial history they can show a bank or SACCO to finally access credit. Sema turns an ordinary day of talking about sales into the paper trail that unlocks their business's growth.


## 🏗️ Architecture & Stack

Sema is built for speed, simplicity, and robust financial tracking:

### Frontend (Next.js & Tailwind)
* **Voice-First UI**: A hyper-focused, minimal interface built for voice interaction.
* **Real-time Status Loop**: Real-time microphone listening, instant AI processing feedback, and speech synthesis confirmation.
* **Premium Dashboard**: A frosted-glass, high-impact financial ledger using `recharts` for visual profit trends over time.

### Backend (Django REST Framework)
* **AI Intent Parsing**: Voice transcripts are sent to **Gemma 4-31B** (via Google Generative AI API) to perform natural language extraction into structured JSON intents (`log_sale`, `log_expense`, `send_payment`, `request_payment`).
* **PayHero Financial Engine**: Real M-Pesa movement.
  * **STK Push (Collections)**: Handled via PayHero API with callback webhook processing.
  * **B2C Payouts**: Secure, password-gated backend transfers for paying suppliers or bills.
* **Idempotent Webhooks**: Asynchronous webhooks from PayHero update the ledger automatically, while the frontend polls for completion.

## 🚀 Key Workflows

1. **Voice Input**
   - User taps mic and says: *"Send 1000 to John"*
2. **Intent Parsing**
   - Django backend passes the text to the AI model.
   - The model structures it: `{ "intent": "send_payment", "amount": 1000, "counterparty_name": "John", "requires_confirmation": true }`
3. **Confirmation (High-Value)**
   - The frontend prompts the user for a security pin/password before executing a payout.
4. **Execution & Webhook**
   - Django calls PayHero to execute the payout.
   - PayHero hits the Django webhook with a `SUCCESS` status.
   - The ledger updates, and the Dashboard chart updates the daily profit trend.
