import secrets
from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class Printer(BaseModel):
    CONN_CHOICES = [
        ("usb", "USB"),
        ("network", "Network / IP"),
        ("bluetooth", "Bluetooth"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="printers")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="printers")
    name = models.CharField(max_length=255)
    connection_type = models.CharField(max_length=20, choices=CONN_CHOICES)
    last_status = models.CharField(max_length=255, null=True, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)
    token = models.CharField(max_length=255, unique=True, null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def save(self, *args, **kwargs):
        if not self.token:
            self.token = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.branch.name} - {self.name} ({self.connection_type})"

class KotPrintJob(BaseModel):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("printed", "Printed"),
        ("failed", "Failed"),
    ]

    ticket = models.ForeignKey("queuing.Ticket", on_delete=models.CASCADE, related_name="print_jobs")
    printer = models.ForeignKey(Printer, on_delete=models.CASCADE, related_name="print_jobs")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")
    printed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Print Job #{self.id} for Ticket {self.ticket.token_number} ({self.status})"

class Kiosk(BaseModel):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="kiosks")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="kiosks")
    kiosk_identifier = models.CharField(max_length=255)
    pin = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")

    session_token = models.CharField(max_length=255, null=True, blank=True)
    connected_at = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("branch", "kiosk_identifier")

    def is_session_active(self):
        if not self.session_token:
            return False
        if not self.last_seen:
            return False
        from django.utils import timezone
        # Expire session if no heartbeat for more than 45 seconds
        if (timezone.now() - self.last_seen).total_seconds() > 45:
            self.session_token = None
            self.connected_at = None
            self.last_seen = None
            self.save()
            return False
        return True

    def __str__(self):
        return f"{self.branch.name} - {self.kiosk_identifier}"
