from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

from encrypted_model_fields.fields import EncryptedCharField
from core.crypto import blind_index

class Appointment(BaseModel):
    STATUS_CHOICES = [
        ("booked", "Booked"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("no_show", "No Show"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="appointments")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="appointments")
    service = models.ForeignKey("queuing.Service", on_delete=models.CASCADE, related_name="appointments")
    customer_name = models.CharField(max_length=255)
    customer_phone = EncryptedCharField(max_length=50)  # OTP-verified
    customer_phone_index = models.CharField(max_length=64, db_index=True, null=True, blank=True)
    customer_consented_at = models.DateTimeField(null=True, blank=True)
    slot_start = models.DateTimeField()
    slot_end = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="booked")
    manage_code = models.CharField(max_length=50, unique=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def save(self, *args, **kwargs):
        if self.customer_phone:
            self.customer_phone_index = blind_index(self.customer_phone)
        else:
            self.customer_phone_index = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_name} - {self.manage_code} ({self.slot_start})"

class AppointmentSlot(BaseModel):
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="appointment_slots")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="appointment_slots")
    service = models.ForeignKey("queuing.Service", on_delete=models.CASCADE, related_name="appointment_slots")
    slot_start = models.DateTimeField()
    slot_end = models.DateTimeField()
    capacity = models.IntegerField(default=1)
    booked_count = models.IntegerField(default=0)

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("branch", "service", "slot_start")

    def __str__(self):
        return f"{self.service.name} @ {self.slot_start} ({self.booked_count}/{self.capacity})"


class TimeSlot(BaseModel):
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="time_slots")
    service = models.ForeignKey("queuing.Service", on_delete=models.CASCADE, related_name="time_slots", null=True, blank=True)
    day_of_week = models.IntegerField(null=True, blank=True, help_text="0=Monday, 6=Sunday")
    specific_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    repeat_weekly = models.BooleanField(default=True)
    start_time = models.TimeField()
    end_time = models.TimeField()
    break_start_time = models.TimeField(null=True, blank=True)
    break_end_time = models.TimeField(null=True, blank=True)
    slot_duration_minutes = models.IntegerField(default=30)
    max_bookings_per_slot = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        branch_name = self.branch.name
        service_name = self.service.name if self.service else "All Services"
        if self.specific_date:
            when = str(self.specific_date)
        else:
            days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            when = days[self.day_of_week] if self.day_of_week is not None else "Any Day"
        return f"{branch_name} ({service_name}) - {when} {self.start_time}-{self.end_time} ({self.slot_duration_minutes}m)"


class OnlineBooking(BaseModel):
    STATUS_CHOICES = [
        ("confirmed", "Confirmed"),
        ("checked_in", "Checked In"),
        ("no_show", "No Show"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="online_bookings")
    service = models.ForeignKey("queuing.Service", on_delete=models.CASCADE, related_name="online_bookings", null=True, blank=True)
    customer_name = models.CharField(max_length=255)
    customer_phone = EncryptedCharField(max_length=50)
    customer_phone_index = models.CharField(max_length=64, db_index=True, null=True, blank=True)
    customer_email = models.EmailField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    date = models.DateField()
    slot_time = models.TimeField()
    booking_reference = models.CharField(max_length=50, unique=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="confirmed")

    objects = TenantManager()
    all_objects = models.Manager()

    def save(self, *args, **kwargs):
        if self.customer_phone:
            self.customer_phone_index = blind_index(self.customer_phone)
        else:
            self.customer_phone_index = None

        if not self.booking_reference:
            import secrets
            import string
            length = 6
            charset = string.ascii_uppercase + string.digits
            ref = "OB-" + "".join(secrets.choice(charset) for _ in range(length))
            while OnlineBooking.objects.filter(booking_reference=ref).exists():
                ref = "OB-" + "".join(secrets.choice(charset) for _ in range(length))
            self.booking_reference = ref

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_name} ({self.booking_reference}) @ {self.date} {self.slot_time}"


class BookingPageConfig(BaseModel):
    company = models.OneToOneField("companies.Company", on_delete=models.CASCADE, related_name="booking_config")
    logo_url = models.TextField(blank=True, default="")
    portal_name = models.CharField(max_length=255, blank=True, default="")
    primary_color = models.CharField(max_length=50, default="#1E88E5")
    display_address = models.TextField(blank=True, default="")
    enabled_customer_fields = models.JSONField(default=list, blank=True)
    enabled_booking_fields = models.JSONField(default=list, blank=True)
    enabled_notification_channels = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.company.name} booking config"

