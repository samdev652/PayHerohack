from django.urls import path
from .views import VoiceCommandView, LedgerEntriesView, LedgerSummaryView, LedgerStatementView

urlpatterns = [
    path('voice-command/', VoiceCommandView.as_view(), name='voice_command'),
    path('<uuid:trader_id>/entries/', LedgerEntriesView.as_view(), name='ledger_entries'),
    path('<uuid:trader_id>/summary/', LedgerSummaryView.as_view(), name='ledger_summary'),
    path('<uuid:trader_id>/statement/', LedgerStatementView.as_view(), name='ledger_statement'),
]
