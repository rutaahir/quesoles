import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import timedelta

from companies.models import Company
from billing.models import Subscription, Invoice
from audit.models import AuditLog
from audit.utils import log_audit
from notifications.tasks import dispatch_notification
from accounts.models import User

logger = logging.getLogger(__name__)

@shared_task
def check_trial_expirations():
    """
    Finds active subscriptions that are in trial (trial_end_date is not null)
    and have expired, then suspends their access.
    """
    today = timezone.now().date()
    expired_trials = Subscription.objects.filter(
        status="active",
        trial_end_date__isnull=False,
        trial_end_date__lt=today
    )

    for sub in expired_trials:
        try:
            with transaction.atomic():
                sub.status = "cancelled"
                sub.save()

                company = sub.company
                company.status = "suspended"
                company.save()

                log_audit(
                    actor=None,
                    company=company,
                    branch=None,
                    action="company_suspended_trial_expired",
                    object_type="Company",
                    object_id=company.id,
                    changes={"reason": "Free trial expired"}
                )

                # Notify company admins
                company_admins = User.objects.filter(company=company, role="company_admin")
                for admin in company_admins:
                    dispatch_notification(
                        user=admin,
                        company=company,
                        branch=None,
                        trigger_type="limit_reached",
                        title="Trial Expired",
                        body="Your free trial has expired. Please subscribe to a paid plan to restore access."
                    )
        except Exception as e:
            logger.error(f"Failed to process trial expiration for subscription {sub.id}: {str(e)}")

@shared_task
def check_subscription_renewals():
    """
    Scans active subscriptions past their end_date to trigger renewals.
    """
    today = timezone.now().date()
    renewals = Subscription.objects.filter(
        status="active",
        end_date__isnull=False,
        end_date__lte=today
    )

    for sub in renewals:
        try:
            with transaction.atomic():
                company = sub.company
                package = sub.package
                billing_cycle = sub.billing_cycle

                if sub.auto_renew:
                    # In simulation, payment auto-succeeds (unless configured to fail for testing)
                    # We check if test is running or simulation failure is cached for this subscription
                    sim_fail = False
                    from django.core.cache import cache
                    if cache.get(f"sim_renew_fail_{sub.id}"):
                        sim_fail = True

                    if sim_fail:
                        # Mark past due, start dunning
                        sub.status = "past_due"
                        sub.save()

                        # Dispatch alert notification
                        company_admins = User.objects.filter(company=company, role="company_admin")
                        for admin in company_admins:
                            dispatch_notification(
                                user=admin,
                                company=company,
                                branch=None,
                                trigger_type="payment_failed",
                                title="Subscription Renewal Failed",
                                body="We were unable to charge your payment method for renewal. Dunning grace period started."
                            )
                    else:
                        # Successful charge
                        price = package.price_monthly if billing_cycle == "monthly" else package.price_yearly
                        
                        invoice = Invoice.objects.create(
                            company=company,
                            subscription=sub,
                            amount=price,
                            status="paid",
                            payment_gateway_ref=f"ch_sim_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                            issued_at=timezone.now(),
                            paid_at=timezone.now()
                        )

                        sub.end_date = today + timedelta(days=30 if billing_cycle == "monthly" else 365)
                        sub.save()

                        log_audit(
                            actor=None,
                            company=company,
                            branch=None,
                            action="subscription_renewed",
                            object_type="Subscription",
                            object_id=sub.id,
                            changes={"amount": float(price)}
                        )
                        log_audit(
                            actor=None,
                            company=company,
                            branch=None,
                            action="invoice_generated",
                            object_type="Invoice",
                            object_id=invoice.id,
                            changes={"amount": float(invoice.amount)}
                        )
                else:
                    # Auto renew is False, cancel and suspend
                    sub.status = "cancelled"
                    sub.save()

                    company.status = "suspended"
                    company.save()

                    log_audit(
                        actor=None,
                        company=company,
                        branch=None,
                        action="company_suspended_nonpayment",
                        object_type="Company",
                        object_id=company.id,
                        changes={"reason": "Auto-renew disabled and end date reached"}
                    )
        except Exception as e:
            logger.error(f"Failed to process renewal for subscription {sub.id}: {str(e)}")

@shared_task
def check_dunning_retry():
    """
    Retries failed renewal payments for past due subscriptions up to 3 times.
    """
    past_due_subs = Subscription.objects.filter(status="past_due")
    today = timezone.now().date()

    for sub in past_due_subs:
        try:
            with transaction.atomic():
                company = sub.company
                package = sub.package
                billing_cycle = sub.billing_cycle

                # Count previous retry attempts recorded in audit log
                # We search for dunning_retry_attempted logs after the subscription's updated_at (when it entered past_due)
                retry_count = AuditLog.objects.filter(
                    company=company,
                    action="dunning_retry_attempted",
                    created_at__gte=sub.updated_at
                ).count()

                if retry_count < 3:
                    # Record retry attempt in audit log
                    log_audit(
                        actor=None,
                        company=company,
                        branch=None,
                        action="dunning_retry_attempted",
                        object_type="Subscription",
                        object_id=sub.id,
                        changes={"attempt_number": retry_count + 1}
                    )

                    # Check if configured to fail for testing
                    from django.core.cache import cache
                    sim_fail = False
                    if cache.get(f"sim_renew_fail_{sub.id}"):
                        sim_fail = True

                    if not sim_fail:
                        # Recovery success
                        price = package.price_monthly if billing_cycle == "monthly" else package.price_yearly
                        invoice = Invoice.objects.create(
                            company=company,
                            subscription=sub,
                            amount=price,
                            status="paid",
                            payment_gateway_ref=f"ch_sim_dunning_{timezone.now().strftime('%Y%m%d%H%M%S')}",
                            issued_at=timezone.now(),
                            paid_at=timezone.now()
                        )

                        sub.status = "active"
                        sub.end_date = today + timedelta(days=30 if billing_cycle == "monthly" else 365)
                        sub.save()

                        log_audit(
                            actor=None,
                            company=company,
                            branch=None,
                            action="subscription_renewed",
                            object_type="Subscription",
                            object_id=sub.id,
                            changes={"amount": float(price), "recovered_via": "dunning"}
                        )
                        log_audit(
                            actor=None,
                            company=company,
                            branch=None,
                            action="invoice_generated",
                            object_type="Invoice",
                            object_id=invoice.id,
                            changes={"amount": float(invoice.amount)}
                        )
                else:
                    # 3 retries failed, cancel subscription and suspend company
                    sub.status = "cancelled"
                    sub.save()

                    company.status = "suspended"
                    company.save()

                    log_audit(
                        actor=None,
                        company=company,
                        branch=None,
                        action="company_suspended_nonpayment",
                        object_type="Company",
                        object_id=company.id,
                        changes={"reason": "Dunning retries exhausted"}
                    )
        except Exception as e:
            logger.error(f"Failed to process dunning for subscription {sub.id}: {str(e)}")
