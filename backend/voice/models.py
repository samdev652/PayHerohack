import uuid
from django.db import models
from traders.models import Trader

class VoiceCommandLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trader = models.ForeignKey(Trader, on_delete=models.SET_NULL, null=True, blank=True, related_name='voice_logs')
    transcribed_text = models.TextField()
    parsed_intent = models.JSONField()
    action_taken = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log: {self.transcribed_text[:30]}... ({self.action_taken})"
