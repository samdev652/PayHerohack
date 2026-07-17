import uuid
from django.db import models
from traders.models import Trader

class PaymentTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(Trader, on_delete=models.CASCADE, related_name='payment_transactions')
    
    TRANSACTION_TYPE_CHOICES = [
        ('STK_PUSH', 'STK Push'),
        ('PAYOUT', 'Payout'),
        ('PAYMENT_REQUEST', 'Payment Request'),
    ]
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    counterparty_phone = models.CharField(max_length=20, null=True, blank=True)
    counterparty_name = models.CharField(max_length=255, null=True, blank=True)
    payhero_reference = models.CharField(max_length=255, null=True, blank=True)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('AWAITING_CONFIRMATION', 'Awaiting Confirmation'),
    ]
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    raw_voice_text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.status}"
