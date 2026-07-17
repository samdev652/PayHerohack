from django.urls import path
from .views_auth import RegisterView, LoginView, TraderTokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('refresh/', TraderTokenRefreshView.as_view(), name='token_refresh'),
]
