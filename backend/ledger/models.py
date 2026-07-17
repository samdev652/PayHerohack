import uuid
from django.db import models
from traders.models import Trader

class LedgerEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(Trader, on_delete=models.CASCADE, related_name='ledger_entries')
    
    ENTRY_TYPE_CHOICES = [
        ('SALE', 'Sale'),
        ('EXPENSE', 'Expense'),
    ]
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    item_description = models.CharField(max_length=255, null=True, blank=True)
    counterparty_name = models.CharField(max_length=255, null=True, blank=True)
    raw_voice_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.entry_type} - {self.amount} - {self.trader.name}"
