import uuid
from django.db import models

class Trader(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    password_hash = models.CharField(max_length=255)
    business_name = models.CharField(max_length=255)
    
    LANGUAGE_CHOICES = [
        ('sw', 'Swahili'),
        ('en', 'English'),
        ('sheng', 'Sheng'),
    ]
    preferred_language = models.CharField(max_length=10, choices=LANGUAGE_CHOICES, default='en')
    created_at = models.DateTimeField(auto_now_add=True)
    
    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return f"{self.name} - {self.business_name} (Trader)"

class Contact(models.Model):
    trader = models.ForeignKey(Trader, on_delete=models.CASCADE, related_name='contacts')
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    
    def __str__(self):
        return f"{self.name} - {self.phone_number}"
