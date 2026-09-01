from django.db import models
from core.models import BaseModel
from core.managers import TenantManager

class Feedback(BaseModel):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="feedbacks")
    branch = models.ForeignKey("branches.Branch", on_delete=models.SET_NULL, null=True, blank=True, related_name="feedbacks")
    ticket = models.ForeignKey("queuing.Ticket", on_delete=models.SET_NULL, null=True, blank=True, related_name="feedbacks")
    appointment = models.ForeignKey("appointments.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="feedbacks")
    rating = models.IntegerField()
    comment = models.TextField(null=True, blank=True)

    objects = TenantManager()
    all_objects = models.Manager()

    def __str__(self):
        return f"Feedback #{self.id} - Rating: {self.rating}"
