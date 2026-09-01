from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class ReportSnapshot(BaseModel):
    branch = models.ForeignKey("branches.Branch", on_delete=models.CASCADE, related_name="report_snapshots")
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="report_snapshots")
    report_date = models.DateField()
    metrics = models.JSONField(default=dict, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Snapshot {self.branch.name} - {self.report_date}"
