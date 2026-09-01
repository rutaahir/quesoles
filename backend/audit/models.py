from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class AuditLog(BaseModel):
    actor = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    company = models.ForeignKey("companies.Company", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
    action = models.CharField(max_length=255)
    object_type = models.CharField(max_length=255)
    object_id = models.CharField(max_length=255, null=True, blank=True)
    changes = models.JSONField(default=dict, blank=True)
    ip_address = models.CharField(max_length=50, null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        actor_email = self.actor.email if self.actor else "System"
        return f"{actor_email} - {self.action} on {self.object_type} ({self.created_at})"
