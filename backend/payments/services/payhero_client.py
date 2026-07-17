import logging
import requests
import threading
import time
from decouple import config
from django.conf import settings

logger = logging.getLogger(__name__)

def mock_payhero_webhook(reference: str, callback_url: str):
    """Simulates a successful PayHero webhook response after 5 seconds for hackathon demos"""
    def send_webhook():
        time.sleep(5)
        payload = {
            "response": {
                "Status": "Success",
                "ExternalReference": reference
            }
        }
        try:
            requests.post(callback_url, json=payload)
            logger.info(f"Mock webhook fired successfully for {reference}")
        except Exception as e:
            logger.error(f"Mock webhook failed: {e}")
            
    threading.Thread(target=send_webhook).start()

PAYHERO_API_URL = "https://backend.payhero.co.ke/api/v2/payments"
PAYHERO_PAYOUT_URL = "https://backend.payhero.co.ke/api/v2/payouts"

def get_headers():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Basic {settings.PAYHERO_AUTH_TOKEN}" 
    }

def initiate_stk_push(phone_number: str, amount: float, reference: str, callback_url: str):
    """
    Triggers an STK Push to the user (customer pays trader).
    """
    if not settings.PAYHERO_CHANNEL_ID:
        logger.info(f"DEMO MODE: Mocking STK Push to {phone_number} for KES {amount}")
        mock_payhero_webhook(reference, callback_url)
        return {"success": True, "status": "Mocked STK Push Initialized"}

    payload = {
        "amount": amount,
        "phone_number": phone_number,
        "channel_id": settings.PAYHERO_CHANNEL_ID,
        "provider": "m-pesa",
        "external_reference": reference,
        "callback_url": callback_url
    }
    
    try:
        response = requests.post(PAYHERO_API_URL, json=payload, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"PayHero STK Push failed: {e}")
        return {"success": False, "error": str(e)}

def initiate_payout(phone_number: str, amount: float, reference: str, callback_url: str):
    """
    Triggers a payout from the PayHero wallet to the user (trader pays supplier).
    """
    if not settings.PAYHERO_CHANNEL_ID:
        logger.info(f"DEMO MODE: Mocking Payout to {phone_number} for KES {amount}")
        mock_payhero_webhook(reference, callback_url)
        return {"success": True, "status": "Mocked Payout Initialized"}

    payload = {
        "amount": amount,
        "phone_number": phone_number,
        "channel_id": settings.PAYHERO_CHANNEL_ID,
        "provider": "m-pesa",
        "external_reference": reference,
        "callback_url": callback_url
    }
    
    try:
        response = requests.post(PAYHERO_PAYOUT_URL, json=payload, headers=get_headers(), timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"PayHero Payout failed: {e}")
        return {"success": False, "error": str(e)}
