from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class DisplayDevice(BaseModel):
    STATUS_CHOICES = [
        ("online", "Online"),
        ("offline", "Offline"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="display_devices")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="display_devices")
    pairing_code = models.CharField(max_length=20, unique=True)
    desk_group = models.JSONField(default=list, blank=True)
    layout = models.CharField(max_length=100, default="default")
    last_seen_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="offline")

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"{self.branch.name} - Device {self.pairing_code} ({self.status})"
