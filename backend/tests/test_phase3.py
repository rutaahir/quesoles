import pytest
from django.utils import timezone
from django.contrib.auth import get_user_model
from datetime import timedelta, date

from companies.models import Company
from branches.models import Branch
from billing.models import Package, Subscription, UpgradeRequest
from queuing.models import Desk, Service, Ticket
from kot.models import Printer
from display.models import DisplayDevice
from appointments.models import Appointment
from notifications.models import AlertRule, AlertEvent, Notification
from analytics.models import ReportSnapshot

from notifications.tasks import (
    check_long_wait_times,
    check_queue_length_spikes,
    check_desk_idleness,
    check_no_show_rate_spikes,
    check_device_heartbeats,
    check_no_operator_online,
    check_sla_breaches,
    check_daily_volume_anomalies
)
from analytics.tasks import aggregate_daily_snapshots

User = get_user_model()

@pytest.fixture
def test_setup(db):
    package = Package.objects.create(
        name="Enterprise Pack",
        max_branches=5,
        max_users=10,
        price_monthly=2000,
        price_yearly=20000,
        feature_flags={"method1": True, "method2": True, "method3": True, "method4": True},
        is_active=True
    )
    
    company = Company.objects.create(
        name="Test Corp",
        industry="Retail",
        city="Mumbai",
        contact_email="testcorp@test.com",
        contact_phone="1234567890",
        package=package,
        status="active"
    )
    
    branch = Branch.objects.create(
        company=company,
        name="Mumbai Main",
        city="Mumbai",
        slug="mumbai-main"
    )
    
    service = Service.objects.create(
        branch=branch,
        company=company,
        name="General Support",
        prefix="G",
        est_service_minutes=15
    )
    
    desk = Desk.objects.create(
        branch=branch,
        company=company,
        name="Counter 1",
        status="open"
    )
    
    operator = User.objects.create_user(
        email="operator@test.com",
        password="SecurePassword123",
        role="desk_staff",
        company=company,
        branch=branch
    )
    
    branch_admin = User.objects.create_user(
        email="admin@test.com",
        password="SecurePassword123",
        role="branch_admin",
        company=company,
        branch=branch
    )
    
    company_admin = User.objects.create_user(
        email="companyadmin@test.com",
        password="SecurePassword123",
        role="company_admin",
        company=company
    )
    
    return {
        "package": package,
        "company": company,
        "branch": branch,
        "service": service,
        "desk": desk,
        "operator": operator,
        "branch_admin": branch_admin,
        "company_admin": company_admin
    }

@pytest.mark.django_db
def test_wait_time_and_queue_length_alerts(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    
    rule_wait = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="wait_time",
        threshold={"wait_time_minutes": 10},
        channels={"in_app": True, "email": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    
    t1 = Ticket.objects.create(
        branch=branch,
        company=company,
        service=test_setup["service"],
        token_number="G001",
        status="waiting"
    )
    Ticket.objects.filter(id=t1.id).update(created_at=timezone.now() - timedelta(minutes=15))
    
    check_long_wait_times()
    
    assert AlertEvent.objects.filter(alert_rule=rule_wait, branch=branch).exists()
    assert Notification.objects.filter(type="wait_time", branch=branch, user=test_setup["branch_admin"]).exists()


@pytest.mark.django_db
def test_sla_breach_alert(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    service = test_setup["service"]
    operator = test_setup["operator"]
    
    t2 = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        token_number="G002",
        status="served",
        served_by=operator,
        called_at=timezone.now() - timedelta(minutes=30),
        served_at=timezone.now() - timedelta(minutes=5)
    )
    Ticket.objects.filter(id=t2.id).update(created_at=timezone.now() - timedelta(minutes=40))
    
    check_sla_breaches()
    
    assert Notification.objects.filter(type="sla_breach", branch=branch).exists()


@pytest.mark.django_db
def test_no_operator_online_alert(test_setup):
    check_no_operator_online()
    assert Notification.objects.filter(type="no_operator_online", branch=test_setup["branch"]).exists()


@pytest.mark.django_db
def test_device_heartbeat_offline_alerts(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    
    rule_device = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="device_offline",
        threshold={"heartbeat_missed_minutes": 5},
        channels={"in_app": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    
    Printer.objects.create(
        branch=branch,
        company=company,
        name="Ticket Printer A",
        connection_type="usb",
        last_checked_at=timezone.now() - timedelta(minutes=10)
    )
    
    DisplayDevice.objects.create(
        branch=branch,
        company=company,
        pairing_code="DISP101",
        last_seen_at=timezone.now() - timedelta(minutes=10),
        status="online"
    )
    
    check_device_heartbeats()
    
    assert AlertEvent.objects.filter(alert_rule=rule_device, payload__device_type="printer").exists()
    assert AlertEvent.objects.filter(alert_rule=rule_device, payload__device_type="display").exists()


@pytest.mark.django_db
def test_reports_aggregation_and_trends_endpoint(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    service = test_setup["service"]
    operator = test_setup["operator"]
    
    t3 = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        token_number="G101",
        status="served",
        served_by=operator,
        called_at=timezone.now() - timedelta(minutes=20),
        served_at=timezone.now() - timedelta(minutes=5)
    )
    Ticket.objects.filter(id=t3.id).update(created_at=timezone.now() - timedelta(minutes=30))
    
    t4 = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        token_number="G102",
        status="no_show"
    )
    Ticket.objects.filter(id=t4.id).update(created_at=timezone.now() - timedelta(minutes=15))
    
    aggregate_daily_snapshots()
    
    assert ReportSnapshot.objects.filter(branch=branch).exists()
    
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=test_setup["branch_admin"])
    
    res = client.get("/api/reports/trends/")
    assert res.status_code == 200
    assert len(res.data["trends"]) > 0
    assert res.data["trends"][0]["total_tickets"] == 2
    
    res_csv = client.get("/api/reports/export/?format=csv")
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv["Content-Type"]
    
    res_pdf = client.get("/api/reports/export/?format=pdf")
    assert res_pdf.status_code == 200
    assert "application/pdf" in res_pdf["Content-Type"]


@pytest.mark.django_db
def test_queue_length_and_desk_idle_and_no_show_rate_alerts(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    
    # 1. Queue length rule
    rule_ql = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="queue_length",
        threshold={"queue_length_limit": 2},
        channels={"in_app": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    # Seed 3 waiting tickets
    for i in range(3):
        Ticket.objects.create(
            branch=branch,
            company=company,
            service=test_setup["service"],
            token_number=f"G{i:03d}",
            status="waiting"
        )
    check_queue_length_spikes()
    assert AlertEvent.objects.filter(alert_rule=rule_ql, branch=branch).exists()

    # 2. Desk idleness rule
    rule_idle = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="idle_desk",
        threshold={"idle_minutes": 10},
        channels={"in_app": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    # Mumbai Main Counter 1 has no tickets called recently.
    check_desk_idleness()
    assert AlertEvent.objects.filter(alert_rule=rule_idle, branch=branch, payload__desk_id=test_setup["desk"].id).exists()

    # 3. No-show rate rule
    rule_ns = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="no_show_rate",
        threshold={"no_show_percent_limit": 20},
        channels={"in_app": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    # Create 3 tickets: 2 no-shows, 1 served
    for i in range(3):
        status = "no_show" if i < 2 else "served"
        t = Ticket.objects.create(
            branch=branch,
            company=company,
            service=test_setup["service"],
            token_number=f"N{i:03d}",
            status=status,
            called_at=timezone.now() - timedelta(minutes=5),
            served_at=timezone.now() - timedelta(minutes=1) if status == "served" else None
        )
    check_no_show_rate_spikes()
    assert AlertEvent.objects.filter(alert_rule=rule_ns, branch=branch).exists()


@pytest.mark.django_db
def test_system_event_signals(test_setup):
    company = test_setup["company"]
    branch = test_setup["branch"]
    
    # Create super admin to receive onboarding notification
    User.objects.create_user(
        email="super@admin.com",
        password="SecurePassword123",
        role="super_admin"
    )
    
    # 1. Company onboarding pending signal
    Company.objects.create(
        name="Pending Corp",
        industry="Retail",
        city="Mumbai",
        contact_email="pending@test.com",
        contact_phone="9999999999",
        status="pending"
    )
    assert Notification.objects.filter(type="onboarding_pending").exists()

    # 2. UpgradeRequest approved/rejected signal
    upgrade_req = UpgradeRequest.objects.create(
        company=company,
        requested_by=test_setup["company_admin"],
        type="tier_upgrade",
        details={"from": "starter", "to": "growth"},
        status="pending"
    )
    upgrade_req.status = "approved"
    upgrade_req.save()
    assert Notification.objects.filter(type="upgrade_resolved", company=company).exists()

    # 3. New appointment booked signal
    Appointment.objects.create(
        company=company,
        branch=branch,
        service=test_setup["service"],
        customer_name="Alice Customer",
        customer_phone="9876543210",
        slot_start=timezone.now() + timedelta(hours=1),
        slot_end=timezone.now() + timedelta(hours=2),
        manage_code="APPT-101"
    )
    assert Notification.objects.filter(type="appointment_booked", branch=branch).exists()


@pytest.mark.django_db
def test_payment_failed_and_limit_reached_notifications(test_setup):
    company = test_setup["company"]
    branch = test_setup["branch"]
    company_admin = test_setup["company_admin"]
    
    from notifications.tasks import dispatch_notification
    
    dispatch_notification(
        user=company_admin,
        company=company,
        branch=branch,
        trigger_type="payment_failed",
        title="Payment Failed Alert",
        body="Your subscription payment has failed."
    )
    assert Notification.objects.filter(type="payment_failed", user=company_admin).exists()
    
    dispatch_notification(
        user=company_admin,
        company=company,
        branch=branch,
        trigger_type="limit_reached",
        title="Plan Limit Reached",
        body="You have reached your monthly branch limit."
    )
    assert Notification.objects.filter(type="limit_reached", user=company_admin).exists()


@pytest.mark.django_db
def test_alert_deduplication_and_auto_resolution(test_setup):
    branch = test_setup["branch"]
    company = test_setup["company"]
    
    rule_wait = AlertRule.objects.create(
        company=company,
        branch=branch,
        trigger_type="wait_time",
        threshold={"wait_time_minutes": 10},
        channels={"in_app": True, "email": True},
        recipients=["Branch Admin"],
        is_active=True
    )
    
    t = Ticket.objects.create(
        branch=branch,
        company=company,
        service=test_setup["service"],
        token_number="G201",
        status="waiting"
    )
    Ticket.objects.filter(id=t.id).update(created_at=timezone.now() - timedelta(minutes=15))
    
    check_long_wait_times()
    assert AlertEvent.objects.filter(alert_rule=rule_wait, resolved_at__isnull=True).count() == 1
    
    check_long_wait_times()
    assert AlertEvent.objects.filter(alert_rule=rule_wait, resolved_at__isnull=True).count() == 1

    t.status = "served"
    t.save()
    
    check_long_wait_times()
    assert AlertEvent.objects.filter(alert_rule=rule_wait, resolved_at__isnull=True).count() == 0
    assert AlertEvent.objects.filter(alert_rule=rule_wait, resolved_at__isnull=False).count() == 1


@pytest.mark.django_db
def test_email_dispatch_via_console_outbox(test_setup):
    company = test_setup["company"]
    branch = test_setup["branch"]
    company_admin = test_setup["company_admin"]
    
    from notifications.tasks import dispatch_notification
    from django.core import mail
    
    dispatch_notification(
        user=company_admin,
        company=company,
        branch=branch,
        trigger_type="wait_time",
        title="Email Alert Title",
        body="This is the email alert message body.",
        channels_config={"email": True}
    )
    
    assert len(mail.outbox) == 1
    assert mail.outbox[0].subject == "Email Alert Title"
    assert mail.outbox[0].to == [company_admin.email]

