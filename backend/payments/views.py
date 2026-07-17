import logging
from django.shortcuts import get_object_or_404
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import PaymentTransaction
from traders.models import Trader

logger = logging.getLogger(__name__)

class PayHeroWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data
        logger.info(f"Received PayHero Webhook: {payload}")
        
        external_reference = payload.get("external_reference") or payload.get("ExternalReference")
        checkout_request_id = payload.get("CheckoutRequestID") or payload.get("reference")
        payhero_status = payload.get("status", "").upper()
        is_success = payhero_status in ["SUCCESS", "COMPLETED", "SUCCESSFUL"]

        if not external_reference:
            return Response(status=200)

        try:
            transaction = PaymentTransaction.objects.get(id=external_reference)
        except (PaymentTransaction.DoesNotExist, ValueError):
            # Try by payhero_reference if external_reference is not UUID
            try:
                transaction = PaymentTransaction.objects.get(payhero_reference=external_reference)
            except PaymentTransaction.DoesNotExist:
                return Response(status=200)

        # Idempotency
        if transaction.status not in ("PENDING", "AWAITING_CONFIRMATION"):
            return Response(status=200)

        transaction.status = "SUCCESS" if is_success else "FAILED"
        if checkout_request_id:
            transaction.payhero_reference = checkout_request_id
        transaction.save()

        return Response(status=200)

class PaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, payment_id):
        transaction = get_object_or_404(PaymentTransaction, id=payment_id)
        if transaction.trader != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        return Response({"status": transaction.status})


class RecentPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, trader_id=None):
        trader = request.user
        payments = PaymentTransaction.objects.filter(trader=trader).order_by('-created_at')[:10]
        data = [
            {
                "id": str(p.id),
                "transaction_type": p.transaction_type,
                "amount": str(p.amount),
                "counterparty_name": p.counterparty_name,
                "status": p.status,
                "created_at": p.created_at.isoformat()
            }
            for p in payments
        ]
        return Response(data)

class ConfirmPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, payment_id):
        transaction = get_object_or_404(PaymentTransaction, id=payment_id)
        
        # Verify ownership
        if transaction.trader != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        password = request.data.get('password')
        if not password:
            return Response({"error": "Password required for confirmation"}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.contrib.auth.hashers import check_password
        if not check_password(password, request.user.password_hash):
            return Response({"error": "Invalid password"}, status=status.HTTP_403_FORBIDDEN)
            
        if transaction.status != 'AWAITING_CONFIRMATION':
            return Response({"error": "Payment is not awaiting confirmation"}, status=status.HTTP_400_BAD_REQUEST)
            
        transaction.status = 'PENDING'
        transaction.save()
        
        from .services.payhero_client import initiate_stk_push, initiate_payout
        
        # Payout logic since confirm is for high-value sends
        res = initiate_payout(
            phone_number=transaction.counterparty_phone, 
            amount=float(transaction.amount), 
            reference=str(transaction.id), 
            callback_url=settings.PAYHERO_CALLBACK_URL
        )
        
        if res.get('success'):
            transaction.payhero_reference = res.get('reference') or res.get('CheckoutRequestID')
            transaction.save()
        else:
            transaction.status = 'FAILED'
            transaction.save()
            return Response({"error": "Payout failed", "details": res}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"status": "Payment confirmed and initiated"})
