import logging
from celery import shared_task
from django.utils import timezone
from django.db import models
from django.core.mail import send_mail
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
from datetime import timedelta

from companies.models import Company
from branches.models import Branch
from queuing.models import Desk, Ticket
from kot.models import Printer
from display.models import DisplayDevice
from notifications.models import AlertRule, AlertEvent, Notification

logger = logging.getLogger(__name__)
User = get_user_model()

def get_recipients(company, branch, roles_list):
    users = User.objects.filter(company=company)
    recipients = []
    
    for u in users:
        role_label = u.role
        if role_label == "super_admin" and "Super Admin" in roles_list:
            recipients.append(u)
        elif role_label == "company_admin" and "Company Admin" in roles_list:
            recipients.append(u)
        elif role_label == "branch_admin" and "Branch Admin" in roles_list:
            if not branch or u.branch == branch:
                recipients.append(u)
        elif role_label == "desk_staff" and "Operator" in roles_list:
            if not branch or u.branch == branch:
                recipients.append(u)
                
    if not recipients:
        admins = User.objects.filter(company=company, role__in=["branch_admin", "company_admin"])
        if branch:
            branch_admins = admins.filter(branch=branch)
            if branch_admins.exists():
                return list(branch_admins)
        recipients = list(admins)
    return recipients

def dispatch_alert_notifications(alert_event, alert_rule, title, body):
    company = alert_event.company
    branch = alert_event.branch
    recipients = get_recipients(company, branch, alert_rule.recipients)
    
    for r in recipients:
        dispatch_notification(
            user=r,
            company=company,
            branch=branch,
            trigger_type=alert_rule.trigger_type,
            title=title,
            body=body,
            channels_config=alert_rule.channels
        )

def dispatch_notification(user, company, branch, trigger_type, title, body, channels_config=None):
    if not channels_config:
        channels_config = {"in_app": True}

    if channels_config.get("in_app", True):
        Notification.objects.create(
            user=user,
            company=company,
            branch=branch,
            type=trigger_type,
            title=title,
            body=body,
            channel="in_app"
        )
        
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer and branch:
                async_to_sync(channel_layer.group_send)(
                    f"branch_{branch.id}_staff",
                    {
                        "type": "notification.broadcast",
                        "data": {
                            "title": title,
                            "body": body,
                            "trigger_type": trigger_type
                        }
                    }
                )
        except Exception as ws_err:
            logger.warning(f"WebSocket notification broadcast failed: {ws_err}")

    if channels_config.get("email", False):
        try:
            send_mail(
                subject=title,
                message=body,
                from_email="no-reply@queuing.com",
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as e:
            logger.error(f"Failed to send email alert to {user.email}: {e}")

    if channels_config.get("sms", False):
        _dispatch_sms(user.phone if hasattr(user, "phone") else None, body)

    if channels_config.get("push", False):
        logger.warning(f"[PUSH MOCK GATEWAY] Delivering push to {user.email}: {body}")


def _dispatch_sms(phone_number, body):
    """
    Route an SMS message through the backend configured via SMS_BACKEND setting.

    Supported backends:
      console  – logs to stdout (default; safe for dev/test)
      twilio   – sends via Twilio REST API (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)
      msg91    – sends via MSG91 HTTP API  (requires MSG91_AUTH_KEY, MSG91_SENDER_ID)
    """
    from django.conf import settings

    if not phone_number:
        logger.debug("[SMS] Skipping SMS dispatch: no phone number on recipient.")
        return

    backend = getattr(settings, "SMS_BACKEND", "console")

    if backend == "twilio":
        _send_sms_twilio(phone_number, body)
    elif backend == "msg91":
        _send_sms_msg91(phone_number, body)
    else:
        # console / test / unknown backend — safe no-op log
        logger.info(f"[SMS CONSOLE] → {phone_number}: {body}")


def _send_sms_twilio(to_number, body):
    from django.conf import settings
    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_FROM_NUMBER,
            to=to_number
        )
        logger.info(f"[SMS Twilio] Sent to {to_number} — SID: {message.sid}")
    except ImportError:
        logger.error("[SMS Twilio] twilio package not installed. Add 'twilio' to requirements.txt.")
    except Exception as e:
        logger.error(f"[SMS Twilio] Failed to send to {to_number}: {e}")


def _send_sms_msg91(to_number, body):
    from django.conf import settings
    import urllib.request
    import urllib.parse

    try:
        auth_key = settings.MSG91_AUTH_KEY
        sender_id = getattr(settings, "MSG91_SENDER_ID", "QUESOL")
        # MSG91 Send OTP / Send SMS API (flow-based or plain)
        params = urllib.parse.urlencode({
            "authkey": auth_key,
            "mobiles": to_number.lstrip("+"),
            "message": body,
            "sender": sender_id,
            "route": "4",  # Transactional route
        })
        url = f"https://api.msg91.com/api/sendhttp.php?{params}"
        req = urllib.request.urlopen(url, timeout=10)
        resp = req.read().decode()
        logger.info(f"[SMS MSG91] Sent to {to_number} — response: {resp}")
    except Exception as e:
        logger.error(f"[SMS MSG91] Failed to send to {to_number}: {e}")



@shared_task
def check_long_wait_times():
    logger.info("Running check_long_wait_times task...")
    now = timezone.now()
    rules = AlertRule.objects.filter(trigger_type="wait_time", is_active=True)
    
    for rule in rules:
        branch = rule.branch
        if not branch:
            continue
        
        threshold_mins = rule.threshold.get("wait_time_minutes", 20)
        cutoff_time = now - timedelta(minutes=threshold_mins)
        
        breaching_tickets = Ticket.objects.filter(
            branch=branch,
            status="waiting",
            created_at__lt=cutoff_time
        )
        
        if breaching_tickets.exists():
            existing = AlertEvent.objects.filter(
                alert_rule=rule,
                branch=branch,
                resolved_at__isnull=True
            ).first()
            
            if not existing:
                count = breaching_tickets.count()
                event = AlertEvent.objects.create(
                    alert_rule=rule,
                    branch=branch,
                    company=rule.company,
                    triggered_at=now,
                    payload={"ticket_count": count, "threshold_mins": threshold_mins}
                )
                
                title = "Wait Time SLA Breach"
                body = f"Alert: {count} customer(s) at {branch.name} have been waiting longer than {threshold_mins} minutes."
                dispatch_alert_notifications(event, rule, title, body)
        else:
            open_alerts = AlertEvent.objects.filter(
                alert_rule=rule,
                branch=branch,
                resolved_at__isnull=True
            )
            for alert in open_alerts:
                alert.resolved_at = now
                alert.save()


@shared_task
def check_queue_length_spikes():
    logger.info("Running check_queue_length_spikes task...")
    now = timezone.now()
    rules = AlertRule.objects.filter(trigger_type="queue_length", is_active=True)
    
    for rule in rules:
        branch = rule.branch
        if not branch:
            continue
        
        threshold_len = rule.threshold.get("queue_length_limit", 10)
        waiting_count = Ticket.objects.filter(branch=branch, status="waiting").count()
        
        if waiting_count > threshold_len:
            existing = AlertEvent.objects.filter(
                alert_rule=rule,
                branch=branch,
                resolved_at__isnull=True
            ).first()
            
            if not existing:
                event = AlertEvent.objects.create(
                    alert_rule=rule,
                    branch=branch,
                    company=rule.company,
                    triggered_at=now,
                    payload={"waiting_count": waiting_count, "threshold_limit": threshold_len}
                )
                title = "Queue Length Spike Detected"
                body = f"Alert: {branch.name} is experiencing a queue spike with {waiting_count} waiting customers (threshold: {threshold_len})."
                dispatch_alert_notifications(event, rule, title, body)
        else:
            open_alerts = AlertEvent.objects.filter(
                alert_rule=rule,
                branch=branch,
                resolved_at__isnull=True
            )
            for alert in open_alerts:
                alert.resolved_at = now
                alert.save()


@shared_task
def check_desk_idleness():
    logger.info("Running check_desk_idleness task...")
    now = timezone.now()
    rules = AlertRule.objects.filter(trigger_type="idle_desk", is_active=True)
    
    for rule in rules:
        branch = rule.branch
        if not branch:
            continue
            
        threshold_mins = rule.threshold.get("idle_minutes", 15)
        cutoff_time = now - timedelta(minutes=threshold_mins)
        
        open_desks = Desk.objects.filter(branch=branch, status="open")
        for desk in open_desks:
            recent_tickets = Ticket.objects.filter(
                branch=branch,
                desk=desk,
                called_at__gte=cutoff_time
            )
            if not recent_tickets.exists():
                existing = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__desk_id=desk.id
                ).first()
                
                if not existing:
                    event = AlertEvent.objects.create(
                        alert_rule=rule,
                        branch=branch,
                        company=rule.company,
                        triggered_at=now,
                        payload={"desk_id": desk.id, "desk_name": desk.name, "idle_minutes": threshold_mins}
                    )
                    title = f"Desk Counter Idle: {desk.name}"
                    body = f"Alert: Desk {desk.name} at {branch.name} has been idle with no tickets called for >{threshold_mins} minutes."
                    dispatch_alert_notifications(event, rule, title, body)
            else:
                open_alerts = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__desk_id=desk.id
                )
                for alert in open_alerts:
                    alert.resolved_at = now
                    alert.save()


@shared_task
def check_no_show_rate_spikes():
    logger.info("Running check_no_show_rate_spikes task...")
    now = timezone.now()
    rules = AlertRule.objects.filter(trigger_type="no_show_rate", is_active=True)
    
    for rule in rules:
        branch = rule.branch
        if not branch:
            continue
            
        threshold_pct = rule.threshold.get("no_show_percent_limit", 30)
        two_hours_ago = now - timedelta(hours=2)
        
        called_tickets = Ticket.objects.filter(
            branch=branch,
            called_at__gte=two_hours_ago,
            status__in=["called", "serving", "served", "no_show"]
        )
        total_count = called_tickets.count()
        if total_count >= 3:
            no_show_count = called_tickets.filter(status="no_show").count()
            rate = (no_show_count / total_count) * 100
            
            if rate > threshold_pct:
                existing = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True
                ).first()
                
                if not existing:
                    event = AlertEvent.objects.create(
                        alert_rule=rule,
                        branch=branch,
                        company=rule.company,
                        triggered_at=now,
                        payload={"no_show_rate": rate, "total_called": total_count, "no_shows": no_show_count}
                    )
                    title = "No-Show Rate Spike"
                    body = f"Alert: Branch {branch.name} has experienced a spike in no-shows at {rate:.1f}% over the last 2 hours (threshold: {threshold_pct}%)."
                    dispatch_alert_notifications(event, rule, title, body)
            else:
                open_alerts = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True
                )
                for alert in open_alerts:
                    alert.resolved_at = now
                    alert.save()


@shared_task
def check_device_heartbeats():
    logger.info("Running check_device_heartbeats task...")
    now = timezone.now()
    rules = AlertRule.objects.filter(trigger_type="device_offline", is_active=True)
    
    for rule in rules:
        branch = rule.branch
        if not branch:
            continue
            
        threshold_mins = rule.threshold.get("heartbeat_missed_minutes", 5)
        cutoff_time = now - timedelta(minutes=threshold_mins)
        
        printers = Printer.objects.filter(branch=branch)
        for p in printers:
            is_offline = p.last_checked_at is None or p.last_checked_at < cutoff_time
            if is_offline:
                existing = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__device_type="printer",
                    payload__device_id=p.id
                ).first()
                
                if not existing:
                    event = AlertEvent.objects.create(
                        alert_rule=rule,
                        branch=branch,
                        company=rule.company,
                        triggered_at=now,
                        payload={"device_type": "printer", "device_id": p.id, "device_name": p.name}
                    )
                    title = f"Printer Offline: {p.name}"
                    body = f"Alert: Printer '{p.name}' at {branch.name} has missed its heartbeat for >{threshold_mins} minutes."
                    dispatch_alert_notifications(event, rule, title, body)
            else:
                open_alerts = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__device_type="printer",
                    payload__device_id=p.id
                )
                for alert in open_alerts:
                    alert.resolved_at = now
                    alert.save()

        displays = DisplayDevice.objects.filter(branch=branch)
        for d in displays:
            is_offline = d.last_seen_at is None or d.last_seen_at < cutoff_time
            if is_offline:
                existing = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__device_type="display",
                    payload__device_id=d.id
                ).first()
                
                if not existing:
                    d.status = "offline"
                    d.save()
                    
                    event = AlertEvent.objects.create(
                        alert_rule=rule,
                        branch=branch,
                        company=rule.company,
                        triggered_at=now,
                        payload={"device_type": "display", "device_id": d.id, "device_name": d.pairing_code}
                    )
                    title = f"Display Device Offline: {d.pairing_code}"
                    body = f"Alert: Display board with Pairing Code '{d.pairing_code}' at {branch.name} has missed heartbeats for >{threshold_mins} minutes."
                    dispatch_alert_notifications(event, rule, title, body)
            else:
                if d.status == "offline":
                    d.status = "online"
                    d.save()
                    
                open_alerts = AlertEvent.objects.filter(
                    alert_rule=rule,
                    branch=branch,
                    resolved_at__isnull=True,
                    payload__device_type="display",
                    payload__device_id=d.id
                )
                for alert in open_alerts:
                    alert.resolved_at = now
                    alert.save()


@shared_task
def check_no_operator_online():
    logger.info("Running check_no_operator_online task...")
    now = timezone.now()
    branches = Branch.objects.filter(status="active")
    
    for branch in branches:
        open_desks = Desk.objects.filter(branch=branch, status="open")
        unstaffed_desks = []
        for desk in open_desks:
            assignments = desk.staff_assignments.filter(is_active=True)
            if not assignments.exists():
                unstaffed_desks.append(desk.name)
                
        if unstaffed_desks:
            recent = Notification.objects.filter(
                branch=branch,
                type="no_operator_online",
                created_at__gte=now - timedelta(minutes=10)
            )
            if not recent.exists():
                recipients = User.objects.filter(company=branch.company, role="branch_admin", branch=branch)
                title = "Counter Desk Unstaffed Alert"
                body = f"Alert: The counter desk(s) {', '.join(unstaffed_desks)} at {branch.name} are marked Open but have no staff operator assigned."
                
                for r in recipients:
                    dispatch_notification(
                        user=r,
                        company=branch.company,
                        branch=branch,
                        trigger_type="no_operator_online",
                        title=title,
                        body=body
                    )


@shared_task
def check_sla_breaches():
    logger.info("Running check_sla_breaches task...")
    now = timezone.now()
    branches = Branch.objects.filter(status="active")
    
    for branch in branches:
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        served_today = Ticket.objects.filter(
            branch=branch,
            status="served",
            called_at__isnull=False,
            served_at__isnull=False,
            served_at__gte=today_start
        )
        
        if served_today.exists():
            total_sec = 0
            cnt = 0
            for t in served_today:
                if t.called_at and t.served_at:
                    total_sec += (t.served_at - t.called_at).total_seconds()
                    cnt += 1
            
            if cnt > 0:
                avg_mins = (total_sec / cnt) / 60.0
                target_sla = 15.0
                
                if avg_mins > target_sla:
                    recent = Notification.objects.filter(
                        branch=branch,
                        type="sla_breach",
                        created_at__gte=now - timedelta(hours=2)
                    )
                    if not recent.exists():
                        recipients = User.objects.filter(company=branch.company, role="company_admin")
                        title = "Service SLA Breach Warning"
                        body = f"Alert: The average service handling duration at {branch.name} today is {avg_mins:.1f} minutes, breaching the {target_sla} minutes target SLA."
                        for r in recipients:
                            dispatch_notification(
                                user=r,
                                company=branch.company,
                                branch=branch,
                                trigger_type="sla_breach",
                                title=title,
                                body=body
                            )


@shared_task
def check_daily_volume_anomalies():
    logger.info("Running check_daily_volume_anomalies task...")
    now = timezone.now()
    from analytics.models import ReportSnapshot
    branches = Branch.objects.filter(status="active")
    
    for branch in branches:
        history = ReportSnapshot.objects.filter(branch=branch).order_by("-report_date")[:7]
        if history.count() >= 3:
            total_history = 0
            for snap in history:
                total_history += snap.metrics.get("total_tickets", 0)
            avg_historical = total_history / history.count()
            
            if avg_historical > 5:
                today_count = Ticket.objects.filter(
                    branch=branch,
                    created_at__gte=now.replace(hour=0, minute=0, second=0, microsecond=0)
                ).count()
                
                deviation = abs(today_count - avg_historical) / avg_historical
                if deviation > 0.5:
                    recent = Notification.objects.filter(
                        branch=branch,
                        type="daily_volume_anomaly",
                        created_at__gte=now - timedelta(hours=12)
                    )
                    if not recent.exists():
                        recipients = User.objects.filter(company=branch.company, role="company_admin")
                        title = "Queue Volume Anomaly Detected"
                        body = f"Alert: Today's queue ticket volume at {branch.name} ({today_count} tickets) deviates by {deviation*100:.1f}% from the 7-day average ({avg_historical:.1f} tickets)."
                        for r in recipients:
                            dispatch_notification(
                                user=r,
                                company=branch.company,
                                branch=branch,
                                trigger_type="daily_volume_anomaly",
                                title=title,
                                body=body
                            )
