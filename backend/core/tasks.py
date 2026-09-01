import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from queuing.models import Ticket
from appointments.models import Appointment
from audit.utils import log_audit

logger = logging.getLogger(__name__)

@shared_task
def purge_expired_customer_pii():
    logger.info("Starting expired customer PII purge task...")
    retention_days = getattr(settings, "CUSTOMER_PII_RETENTION_DAYS", 365)
    cutoff_date = timezone.now() - timedelta(days=retention_days)

    # 1. Purge Tickets PII
    tickets_to_purge = Ticket.objects.filter(
        created_at__lt=cutoff_date,
        status__in=["served", "no_show", "cancelled", "skipped"]
    ).exclude(customer_name="", customer_phone=None)

    purged_tickets_count = 0
    # Process in batches to avoid locking the DB
    for ticket in tickets_to_purge[:1000]:
        ticket.customer_name = ""
        ticket.customer_phone = None
        ticket.customer_phone_index = None
        # Save without triggering full save overrides if possible, or just standard save
        ticket.save()
        purged_tickets_count += 1

    # 2. Purge Appointments PII
    appts_to_purge = Appointment.objects.filter(
        created_at__lt=cutoff_date,
        status__in=["completed", "cancelled", "no_show"]
    ).exclude(customer_name="", customer_phone=None)

    purged_appts_count = 0
    for appt in appts_to_purge[:1000]:
        appt.customer_name = ""
        appt.customer_phone = None
        appt.customer_phone_index = None
        appt.save()
        purged_appts_count += 1

    if purged_tickets_count > 0 or purged_appts_count > 0:
        log_audit(
            actor=None, # System cron
            company=None, # System wide
            branch=None,
            action="expired_pii_purged",
            object_type="System",
            object_id=0,
            changes={
                "purged_tickets_count": purged_tickets_count,
                "purged_appointments_count": purged_appts_count,
                "cutoff_date": cutoff_date.isoformat()
            }
        )
        logger.info(f"Purged PII for {purged_tickets_count} tickets and {purged_appts_count} appointments.")
    else:
        logger.info("No expired customer PII found to purge.")
