from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class Desk(BaseModel):
    STATUS_CHOICES = [
        ("open", "Open"),
        ("paused", "Paused"),
        ("offline", "Offline"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="desks")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="desks")
    name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="offline")
    is_active = models.BooleanField(default=True)
    is_online_booking_desk = models.BooleanField(default=False)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"{self.branch.name} - {self.name}"

    def save(self, *args, **kwargs):
        is_deactivating = False
        if self.pk:
            try:
                old_self = Desk.objects.get(pk=self.pk)
                if old_self.is_active and not self.is_active:
                    is_deactivating = True
            except Desk.DoesNotExist:
                pass
        super().save(*args, **kwargs)
        if is_deactivating:
            from queuing.services.queue_routing import redistribute_tickets_for_deactivated_desk
            redistribute_tickets_for_deactivated_desk(self)

class Service(BaseModel):
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="services")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=255)
    prefix = models.CharField(max_length=2, default="")
    est_service_minutes = models.IntegerField(default=15)
    is_active = models.BooleanField(default=True)

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = (("branch", "prefix"),)

    def __str__(self):
        return f"{self.branch.name} - {self.name}"

class DeskService(BaseModel):
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name="desk_services")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="desk_services")

    class Meta:
        unique_together = ("desk", "service")

    def __str__(self):
        return f"{self.desk.name} <-> {self.service.name}"

class UserService(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="user_services")
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="service_users")

    class Meta:
        unique_together = ("user", "service")

    def __str__(self):
        return f"{self.user.email} <-> {self.service.name}"

class DeskStaffAssignment(BaseModel):
    desk = models.ForeignKey(Desk, on_delete=models.CASCADE, related_name="staff_assignments")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="desk_assignments")
    shift_start = models.DateTimeField()
    shift_end = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.email} at {self.desk.name}"

class TokenSequence(BaseModel):
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="token_sequences")
    date = models.DateField()
    last_number = models.IntegerField(default=0)

    class Meta:
        unique_together = ("branch", "date")

    @classmethod
    def get_next_sequence_number(cls, branch):
        from django.db import transaction
        from django.utils import timezone
        today = timezone.now().date()
        with transaction.atomic():
            seq, created = cls.objects.get_or_create(
                branch=branch,
                date=today,
                defaults={"last_number": 0}
            )
            seq = cls.objects.select_for_update().get(id=seq.id)
            seq.last_number += 1
            seq.save(update_fields=["last_number"])
            return seq.last_number

class QueueMethod(BaseModel):
    METHOD_CHOICES = [
        ("1", "Method 1"),
        ("2", "Method 2"),
        ("3", "Method 3"),
        ("4", "Method 4"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="queue_methods")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="queue_methods")
    method = models.CharField(max_length=2, choices=METHOD_CHOICES)
    is_enabled = models.BooleanField(default=False)
    config = models.JSONField(default=dict, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"{self.branch.name} - Method {self.method} ({self.is_enabled})"

class QrCode(BaseModel):
    METHOD_CHOICES = QueueMethod.METHOD_CHOICES

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="qr_codes")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="qr_codes")
    method = models.CharField(max_length=2, choices=METHOD_CHOICES)
    image_url = models.URLField(max_length=512)
    generated_at = models.DateTimeField()

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"QR for {self.branch.name} - Method {self.method}"

from encrypted_model_fields.fields import EncryptedCharField
from core.crypto import generate_tracking_code, blind_index

class Ticket(BaseModel):
    METHOD_CHOICES = QueueMethod.METHOD_CHOICES
    SOURCE_CHOICES = [
        ("qr", "QR Scan"),
        ("kiosk", "Kiosk Touch"),
        ("booking", "Online Booking"),
    ]
    STATUS_CHOICES = [
        ("waiting", "Waiting"),
        ("called", "Called"),
        ("serving", "Serving"),
        ("served", "Served"),
        ("no_show", "No Show"),
        ("cancelled", "Cancelled"),
        ("skipped", "Skipped"),
        ("hold", "Hold"),
    ]

    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="tickets")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="tickets")
    desk = models.ForeignKey(Desk, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets")
    predicted_desk = models.ForeignKey(Desk, on_delete=models.SET_NULL, null=True, blank=True, related_name="predicted_tickets")
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name="tickets")
    method = models.CharField(max_length=2, choices=METHOD_CHOICES)
    token_number = models.CharField(max_length=50)
    customer_name = models.CharField(max_length=255)
    customer_email = models.CharField(max_length=255, null=True, blank=True)
    customer_phone = EncryptedCharField(max_length=50, null=True, blank=True)
    customer_phone_index = models.CharField(max_length=64, db_index=True, null=True, blank=True)
    tracking_code = models.CharField(max_length=64, unique=True, null=True, blank=True, default=generate_tracking_code)
    customer_consented_at = models.DateTimeField(null=True, blank=True)
    distance_at_checkin_meters = models.IntegerField(null=True, blank=True)
    message = models.TextField(null=True, blank=True)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    channel = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="qr")
    SOURCE_METHOD_CHOICES = [
        ("ON_SCREEN", "On-Screen Booking"),
        ("KOT_PRINT", "KOT Printed Token"),
        ("QR_SCAN", "QR Code Scanning"),
        ("BOOKING", "Online Appointment Booking"),
        ("COUNTER", "Counter Issuance"),
    ]
    source_method = models.CharField(max_length=20, choices=SOURCE_METHOD_CHOICES, default="ON_SCREEN")
    scheduled_for = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="waiting")
    called_at = models.DateTimeField(null=True, blank=True)
    served_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    served_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="served_tickets")

    objects = TenantManager()
    all_objects = models.Manager()

    def save(self, *args, **kwargs):
        # Generate tracking code if not set
        if not self.tracking_code:
            self.tracking_code = generate_tracking_code()
        # Compute blind index for exact match search
        if self.customer_phone:
            # decrypted value is passed to blind_index in save()
            self.customer_phone_index = blind_index(self.customer_phone)
        else:
            self.customer_phone_index = None

        is_new = self._state.adding or not self.pk
        if is_new and not self.predicted_desk:
            from queuing.services.queue_routing import assign_predicted_desk_for_ticket
            assign_predicted_desk_for_ticket(self)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.token_number} - {self.customer_name} ({self.status})"

class TicketNote(BaseModel):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="notes")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="ticket_notes")
    note = models.TextField()

    def __str__(self):
        return f"Note on {self.ticket.token_number} by {self.user.email}"

class KotMessageTemplate(BaseModel):
    CHANNEL_CHOICES = [
        ("sms", "SMS Alerts & Reminders"),
        ("whatsapp", "WhatsApp Digital Tickets"),
    ]
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="kot_message_templates")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="kot_message_templates")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    template_text = models.TextField()

    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        unique_together = ("branch", "channel")

    def __str__(self):
        return f"{self.branch.name} - {self.channel} Template"

class KotNotificationLog(BaseModel):
    CHANNEL_CHOICES = KotMessageTemplate.CHANNEL_CHOICES
    STATUS_CHOICES = [
        ("sent", "Sent"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
        ("sent_mock", "Sent (Simulated)"),
    ]
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="kot_logs")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="kot_logs")
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="kot_logs")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    recipient = models.CharField(max_length=50)
    message_body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="sent")
    error_message = models.TextField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Log {self.ticket.token_number} - {self.channel} ({self.status})"

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver(post_save, sender=DeskService)
@receiver(post_delete, sender=DeskService)
def handle_desk_service_change(sender, instance, **kwargs):
    from queuing.services.queue_routing import reevaluate_predictions_for_desk
    reevaluate_predictions_for_desk(instance.desk)
