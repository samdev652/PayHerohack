from rest_framework import serializers
from .models import LedgerEntry

class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = '__all__'

class VoiceCommandRequestSerializer(serializers.Serializer):
    transcribed_text = serializers.CharField()
