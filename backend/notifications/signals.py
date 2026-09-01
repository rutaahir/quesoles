import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from companies.models import Company
from billing.models import UpgradeRequest
from appointments.models import Appointment
from notifications.models import Notification
from notifications.tasks import dispatch_notification

logger = logging.getLogger(__name__)
User = get_user_model()

@receiver(post_save, sender=Company)
def handle_company_signup_signal(sender, instance, created, **kwargs):
    if created and instance.status == "pending":
        super_admins = User.objects.filter(role="super_admin")
        title = "New Company Onboarding Pending"
        body = f"A new company '{instance.name}' has signed up and is pending approval."
        
        for sa in super_admins:
            dispatch_notification(
                user=sa,
                company=instance,
                branch=None,
                trigger_type="onboarding_pending",
                title=title,
                body=body
            )

@receiver(post_save, sender=UpgradeRequest)
def handle_upgrade_request_signal(sender, instance, **kwargs):
    if instance.status in ["approved", "rejected"]:
        company_admins = User.objects.filter(company=instance.company, role="company_admin")
        title = f"Subscription Upgrade Request {instance.status.capitalize()}"
        body = f"Your subscription upgrade request has been {instance.status}."
        
        for ca in company_admins:
            dispatch_notification(
                user=ca,
                company=instance.company,
                branch=None,
                trigger_type="upgrade_resolved",
                title=title,
                body=body
            )

@receiver(post_save, sender=Appointment)
def handle_new_appointment_signal(sender, instance, created, **kwargs):
    if created:
        branch_admins = User.objects.filter(company=instance.company, role="branch_admin", branch=instance.branch)
        title = "New Appointment Booked"
        body = f"A new appointment has been booked by '{instance.customer_name}' for slot '{instance.slot_start}'."
        
        for ba in branch_admins:
            dispatch_notification(
                user=ba,
                company=instance.company,
                branch=instance.branch,
                trigger_type="appointment_booked",
                title=title,
                body=body
            )
