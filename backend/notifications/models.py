from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class AlertRule(BaseModel):
    TRIGGER_CHOICES = [
        ("wait_time", "Wait Time Breach"),
        ("queue_length", "Queue Length Breach"),
        ("idle_desk", "Idle Desk alert"),
        ("no_show_rate", "No Show Spike"),
        ("device_offline", "Device Offline"),
    ]

    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="alert_rules")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, null=True, blank=True, related_name="alert_rules")
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    threshold = models.JSONField(default=dict, blank=True)
    channels = models.JSONField(default=dict, blank=True)  # in_app, email, sms
    recipients = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        branch_name = self.branch.name if self.branch else "All Branches"
        return f"{self.company.name} ({branch_name}) - {self.trigger_type}"

class AlertEvent(BaseModel):
    alert_rule = models.ForeignKey(AlertRule, on_delete=models.CASCADE, related_name="events")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="alert_events")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="alert_events")
    payload = models.JSONField(default=dict, blank=True)
    triggered_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Alert {self.alert_rule.trigger_type} at {self.branch.name} ({self.triggered_at})"

class Notification(BaseModel):
    CHANNEL_CHOICES = [
        ("in_app", "In-App"),
        ("email", "Email"),
        ("sms", "SMS"),
        ("push", "Push Notification"),
    ]

    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    type = models.CharField(max_length=100)
    title = models.CharField(max_length=255)
    body = models.TextField()
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    is_read = models.BooleanField(default=False)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Notification for {self.user.email} - {self.title} ({self.channel})"

class NotificationTemplate(BaseModel):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, null=True, blank=True, related_name="notification_templates")
    code = models.CharField(max_length=100)
    channel = models.CharField(max_length=50)
    subject = models.CharField(max_length=255, null=True, blank=True)
    body_template = models.TextField()

    def __str__(self):
        scope = self.company.name if self.company else "Global Default"
        return f"Template {self.code} ({self.channel}) - {scope}"
