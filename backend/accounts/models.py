from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from core.models import BaseModel
from core.managers import TenantManager

class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'super_admin')
        return self.create_user(email, password, **extra_fields)

from encrypted_model_fields.fields import EncryptedCharField

class User(AbstractUser):
    ROLE_CHOICES = [
        ("super_admin", "Platform Super Admin"),
        ("company_admin", "Company Admin"),
        ("branch_admin", "Branch Admin"),
        ("desk_staff", "Desk Staff"),
    ]

    username = None
    email = models.EmailField(unique=True)
    phone = EncryptedCharField(max_length=50, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="desk_staff")
    company = models.ForeignKey("companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="users")
    is_2fa_enabled = models.BooleanField(default=False)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"{self.email} ({self.role})"

class UserInvite(BaseModel):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("expired", "Expired"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="invites")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="invites")
    email_or_phone = EncryptedCharField(max_length=255)
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES)
    token = models.CharField(max_length=255, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    expires_at = models.DateTimeField()

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Invite for {self.email_or_phone} as {self.role}"

class OTPVerification(BaseModel):
    PURPOSE_CHOICES = [
        ("booking", "Booking Verification"),
        ("login", "Login Verification"),
    ]

    phone = EncryptedCharField(max_length=50, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    otp_hash = models.CharField(max_length=255)
    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    attempts = models.IntegerField(default=0)

    def __str__(self):
        return f"OTP for {self.email or self.phone} ({self.purpose})"
