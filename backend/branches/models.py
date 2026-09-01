from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class Branch(BaseModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    slug = models.CharField(max_length=255)
    address = models.TextField()
    city = models.CharField(max_length=100)
    geo_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    geo_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    geofence_radius_meters = models.IntegerField(default=200)
    geofence_enabled = models.BooleanField(default=True)
    timezone = models.CharField(max_length=100, default="Asia/Kolkata")
    operating_hours = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    kiosk_password_hash = models.CharField(max_length=128, null=True, blank=True)
    kiosk_idle_timeout_seconds = models.IntegerField(default=8)
    mode = models.CharField(
        max_length=50,
        choices=[
            ("SERVICE_BASED", "Service-Based"),
            ("NON_SERVICE_BASED", "Non-Service-Based"),
        ],
        default="NON_SERVICE_BASED"
    )
    channel_type = models.CharField(
        max_length=50,
        choices=[
            ("ONSITE_ONLY", "Onsite Only"),
            ("ONLINE_ONLY", "Online Only"),
            ("HYBRID", "Hybrid"),
        ],
        default="ONSITE_ONLY"
    )

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("company", "slug")

    def save(self, *args, **kwargs):
        if self.kiosk_password_hash and not self.kiosk_password_hash.startswith("pbkdf2_sha256$"):
            from django.contrib.auth.hashers import make_password
            self.kiosk_password_hash = make_password(self.kiosk_password_hash)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver([post_save, post_delete], sender=Branch)
def sync_company_solution(sender, instance, **kwargs):
    company = instance.company
    if not company:
        return
    active_branches = company.branches.filter(status="active")
    has_online = active_branches.filter(channel_type__in=["ONLINE_ONLY", "HYBRID"]).exists()
    has_onsite = active_branches.filter(channel_type__in=["ONSITE_ONLY", "HYBRID"]).exists()

    if has_online and has_onsite:
        new_sol = "HYBRID"
    elif has_online:
        new_sol = "ONLINE"
    else:
        new_sol = "ONSITE"

    if company.solution != new_sol:
        company.solution = new_sol
        company.save(update_fields=["solution"])

