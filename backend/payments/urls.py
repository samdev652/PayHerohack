from django.urls import path
from .views import PayHeroWebhookView, RecentPaymentsView, ConfirmPaymentView, PaymentStatusView

urlpatterns = [
    path('webhook/', PayHeroWebhookView.as_view(), name='payhero_webhook'),
    path('<uuid:trader_id>/recent/', RecentPaymentsView.as_view(), name='recent_payments'),
    path('<uuid:payment_id>/confirm/', ConfirmPaymentView.as_view(), name='confirm_payment'),
    path('<uuid:payment_id>/status/', PaymentStatusView.as_view(), name='payment_status'),
]
