import re
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password, check_password
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from .models import Trader

def normalize_phone(phone: str) -> str:
    # 07XXXXXXXX -> +2547XXXXXXXX
    cleaned = re.sub(r'[^\d]', '', phone)
    if cleaned.startswith('0'):
        cleaned = '254' + cleaned[1:]
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned
    return cleaned

class RegisterView(APIView):
    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')
        name = request.data.get('name')
        business_name = request.data.get('business_name')

        if not all([identifier, password, name, business_name]):
            return Response({"error": "Missing fields"}, status=status.HTTP_400_BAD_REQUEST)

        if len(password) < 8:
            return Response({"error": "Password must be at least 8 characters"}, status=status.HTTP_400_BAD_REQUEST)

        email = None
        phone_number = None

        if '@' in identifier:
            email = identifier.lower()
            if Trader.objects.filter(email=email).exists():
                return Response({"error": "Identifier already in use"}, status=status.HTTP_400_BAD_REQUEST)
        else:
            phone_number = normalize_phone(identifier)
            if Trader.objects.filter(phone_number=phone_number).exists():
                return Response({"error": "Identifier already in use"}, status=status.HTTP_400_BAD_REQUEST)

        trader = Trader.objects.create(
            name=name,
            business_name=business_name,
            email=email,
            phone_number=phone_number,
            password_hash=make_password(password)
        )

        refresh = RefreshToken.for_user(trader)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "trader_id": str(trader.id)
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    def post(self, request):
        identifier = request.data.get('identifier')
        password = request.data.get('password')

        if not identifier or not password:
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        trader = None
        if '@' in identifier:
            trader = Trader.objects.filter(email=identifier.lower()).first()
        else:
            trader = Trader.objects.filter(phone_number=normalize_phone(identifier)).first()

        if not trader or not check_password(password, trader.password_hash):
            return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(trader)

        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "trader_id": str(trader.id)
        })

class TraderTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])

        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM)
        if not user_id or not Trader.objects.filter(id=user_id).exists():
            raise AuthenticationFailed(
                self.error_messages.get("no_active_account", "User not found"),
                "no_active_account",
            )

        data = {"access": str(refresh.access_token)}

        if api_settings.ROTATE_REFRESH_TOKENS:
            if api_settings.BLACKLIST_AFTER_ROTATION:
                try:
                    refresh.blacklist()
                except AttributeError:
                    pass

            refresh.set_jti()
            refresh.set_exp()
            refresh.set_iat()

            data["refresh"] = str(refresh)

        return data

class TraderTokenRefreshView(TokenRefreshView):
    serializer_class = TraderTokenRefreshSerializer
