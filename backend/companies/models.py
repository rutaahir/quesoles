from django.db import models
from core.models import BaseModel

from encrypted_model_fields.fields import EncryptedCharField

class Company(BaseModel):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("pending", "Pending"),
        ("active", "Active"),
        ("suspended", "Suspended"),
        ("rejected", "Rejected"),
    ]

    name = models.CharField(max_length=255)
    industry = models.CharField(max_length=255)
    contact_email = models.EmailField(unique=True)
    contact_phone = EncryptedCharField(max_length=50)
    logo_url = models.TextField(null=True, blank=True)
    tagline = models.CharField(max_length=255, null=True, blank=True)
    support_phone = EncryptedCharField(max_length=50, null=True, blank=True)
    support_email = models.EmailField(null=True, blank=True)
    brand_colors = models.JSONField(default=dict, blank=True)
    address = models.CharField(max_length=500, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    website = models.URLField(max_length=255, null=True, blank=True)
    ONBOARDING_STATUS_CHOICES = [
        ("pending_payment", "Pending Payment"),
        ("active", "Active"),
        ("suspended", "Suspended"),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    onboarding_status = models.CharField(max_length=30, choices=ONBOARDING_STATUS_CHOICES, default="active")
    package = models.ForeignKey("billing.Package", on_delete=models.SET_NULL, null=True, blank=True, related_name="companies")
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    solution = models.CharField(max_length=50, default="ONSITE_ONLINE")

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            if not base_slug:
                base_slug = "company"
            slug = base_slug
            counter = 1
            while Company.objects.filter(slug=slug).exclude(id=self.id).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name
