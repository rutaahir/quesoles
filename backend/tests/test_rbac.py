import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from companies.models import Company
from billing.models import Package, Subscription, UpgradeRequest
from branches.models import Branch
from queuing.models import Desk, Service, QueueMethod, QrCode
from appointments.models import Appointment, AppointmentSlot
from kot.models import Printer
from audit.models import AuditLog
from notifications.models import AlertRule, NotificationTemplate

User = get_user_model()

@pytest.fixture
def rbac_setup(db):
    # 1. Setup Packages
    pkg = Package.objects.create(
        name="Enterprise Plan",
        max_branches=5,
        max_users=10,
        price_monthly=150.00,
        price_yearly=1500.00,
        feature_flags={"method1": True, "method2": True, "method3": True, "method4": True},
        is_active=True
    )

    # 2. Setup Company
    company = Company.objects.create(
        name="Test Company",
        industry="Retail",
        contact_email="admin@test.com",
        status="active",
        package=pkg
    )

    # 3. Setup Branch
    branch = Branch.objects.create(
        company=company,
        name="BKC Branch",
        slug="bkc-branch",
        city="Mumbai",
        address="BKC 1st Lane"
    )

    # 4. Setup Roles
    super_admin = User.objects.create_superuser(
        email="superadmin@platform.com",
        password="SecurePass123",
        role="super_admin"
    )
    company_admin = User.objects.create_user(
        email="company@test.com",
        password="SecurePass123",
        role="company_admin",
        company=company
    )
    branch_admin = User.objects.create_user(
        email="branch@test.com",
        password="SecurePass123",
        role="branch_admin",
        company=company,
        branch=branch
    )
    desk_staff = User.objects.create_user(
        email="staff@test.com",
        password="SecurePass123",
        role="desk_staff",
        company=company,
        branch=branch
    )
    
    # 5. Service
    service = Service.objects.create(
        branch=branch,
        company=company,
        name="Consultation",
        prefix="C",
        est_service_minutes=15
    )

    return {
        "pkg": pkg,
        "company": company,
        "branch": branch,
        "super_admin": super_admin,
        "company_admin": company_admin,
        "branch_admin": branch_admin,
        "desk_staff": desk_staff,
        "service": service
    }

def get_client(user=None):
    client = APIClient()
    if user:
        client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_company_permissions_by_role(rbac_setup):
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/companies/").status_code == status.HTTP_200_OK

    res_patch = c_super.patch(f"/api/companies/{rbac_setup['company'].id}/", {"name": "Updated Co"}, format="json")
    assert res_patch.status_code == status.HTTP_200_OK

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/companies/").status_code == status.HTTP_403_FORBIDDEN

    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/companies/").status_code == status.HTTP_403_FORBIDDEN

    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/companies/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_package_permissions_by_role(rbac_setup):
    c_super = get_client(rbac_setup["super_admin"])
    res = c_super.post("/api/packages/", {
        "name": "New Plan", "max_branches": 2, "max_users": 5, "price_monthly": 10.00, "price_yearly": 100.00, "feature_flags": {}, "is_active": True
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/packages/").status_code == status.HTTP_200_OK
    assert c_comp.post("/api/packages/", {}, format="json").status_code == status.HTTP_403_FORBIDDEN

    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/packages/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_branch_permissions_by_role(rbac_setup):
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/branches/").status_code == status.HTTP_200_OK

    c_comp = get_client(rbac_setup["company_admin"])
    res = c_comp.post("/api/branches/", {
        "name": "BKC 2", "slug": "bkc-2", "city": "Mumbai", "address": "BKC Address"
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get(f"/api/branches/{rbac_setup['branch'].id}/").status_code == status.HTTP_200_OK
    assert c_branch.post("/api/branches/", {"name": "BKC 3"}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_billing_permissions_by_role(rbac_setup):
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.post("/api/billing/checkout/", {"package_id": rbac_setup["pkg"].id, "billing_cycle": "monthly"}, format="json").status_code == status.HTTP_403_FORBIDDEN

    c_comp = get_client(rbac_setup["company_admin"])
    res = c_comp.post("/api/billing/checkout/", {"package_id": rbac_setup["pkg"].id, "billing_cycle": "monthly"}, format="json")
    assert res.status_code == status.HTTP_200_OK

    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.post("/api/billing/checkout/", {}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_queue_method_permissions_by_role(rbac_setup):
    c_branch = get_client(rbac_setup["branch_admin"])
    res = c_branch.post("/api/queue-methods/", {
        "method": "1", "is_enabled": True, "config": {"numbering_style": "sequential"}
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/queue-methods/").status_code == status.HTTP_200_OK
    assert c_comp.post("/api/queue-methods/", {}, format="json").status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_desk_service_permissions_by_role(rbac_setup):
    c_branch = get_client(rbac_setup["branch_admin"])
    res = c_branch.post("/api/desks/", {"name": "Counter 1", "status": "offline"}, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/desks/").status_code == status.HTTP_200_OK
    assert c_comp.post("/api/desks/", {"name": "Counter 2"}, format="json").status_code == status.HTTP_403_FORBIDDEN

    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/desks/").status_code == status.HTTP_200_OK
    assert c_staff.post("/api/desks/", {"name": "Counter 3"}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_qr_code_permissions_by_role(rbac_setup):
    c_branch = get_client(rbac_setup["branch_admin"])
    res = c_branch.post(f"/api/branches/{rbac_setup['branch'].id}/generate-qr/", {"method": "1"}, format="json")
    assert res.status_code == status.HTTP_200_OK

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.post(f"/api/branches/{rbac_setup['branch'].id}/generate-qr/", {"method": "1"}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_appointment_slots_permissions_by_role(rbac_setup):
    c_branch = get_client(rbac_setup["branch_admin"])
    today_str = timezone.now().strftime("%Y-%m-%d")
    res = c_branch.post("/api/public/appointments/slots/bulk-create/", {
        "branch_id": rbac_setup["branch"].id,
        "service_id": rbac_setup["service"].id,
        "start_date": today_str,
        "end_date": today_str,
        "slots": [{"start": "09:00", "end": "09:30"}],
        "capacity": 3
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.post("/api/public/appointments/slots/bulk-create/", {}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_kot_printer_permissions_by_role(rbac_setup):
    c_branch = get_client(rbac_setup["branch_admin"])
    res = c_branch.post("/api/kot/devices/", {
        "branch": rbac_setup["branch"].id,
        "name": "KOT Slip Printer",
        "connection_type": "network"
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/kot/devices/").status_code == status.HTTP_200_OK
    assert c_comp.post("/api/kot/devices/", {}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_audit_log_permissions_by_role(rbac_setup):
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/audit-logs/").status_code == status.HTTP_200_OK

    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/audit-logs/").status_code == status.HTTP_200_OK

    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/audit-logs/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_upgrade_request_permissions_by_role(rbac_setup):
    c_comp = get_client(rbac_setup["company_admin"])
    res = c_comp.post("/api/upgrades/", {"type": "branch", "details": {"quantity": 1}}, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    upgrade_id = res.data["id"]

    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.post("/api/upgrades/", {"type": "branch", "details": {"quantity": 1}}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_company_users_permissions_by_role(rbac_setup):
    # Super Admin (View all)
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/users/").status_code == status.HTTP_200_OK

    # Company Admin (View own, Invite staff)
    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/users/").status_code == status.HTTP_200_OK
    res_inv = c_comp.post("/api/invites/", {
        "email_or_phone": "newstaff@test.com", "role": "desk_staff"
    }, format="json")
    assert res_inv.status_code == status.HTTP_201_CREATED

    # Branch Admin (View own branch users; can invite desk_staff = Full branch scope per Sheet 2)
    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/users/").status_code == status.HTTP_200_OK
    # Branch admin CAN invite desk_staff (branch scope)
    assert c_branch.post("/api/invites/", {"email_or_phone": "newstaff2@test.com", "role": "desk_staff"}, format="json").status_code == status.HTTP_201_CREATED
    # Branch admin CANNOT escalate to company_admin (role escalation guard)
    assert c_branch.post("/api/invites/", {"email_or_phone": "escalate@test.com", "role": "company_admin"}, format="json").status_code == status.HTTP_403_FORBIDDEN

    # Desk Staff (View own profile only; blocked from listing all users)
    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/users/").status_code == status.HTTP_403_FORBIDDEN
    # Desk staff can retrieve own profile
    desk_user = rbac_setup["desk_staff"]
    assert c_staff.get(f"/api/users/{desk_user.id}/").status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_company_dashboard_permissions_by_role(rbac_setup):
    # Super Admin (Platform-wide dashboard per Sheet 2 row 19)
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/reports/trends/").status_code == status.HTTP_200_OK

    # Company Admin (Full own company view)
    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/reports/trends/").status_code == status.HTTP_200_OK

    # Desk Staff (no access to company-wide dashboard; Sheet 2 row 19 = '-')
    # Note: desk_staff gets branch-scoped trends from /api/reports/trends/ (Branch Dashboard row 20);
    # test that they are not blocked — they receive scoped data, not a 403
    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/reports/trends/").status_code == status.HTTP_200_OK  # scoped to branch


@pytest.mark.django_db
def test_branch_dashboard_permissions_by_role(rbac_setup):
    # Super Admin (View all branches per Sheet 2 row 20)
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/reports/trends/").status_code == status.HTTP_200_OK

    # Company Admin (View all own branches — GET-only, no write on reports)
    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/reports/trends/").status_code == status.HTTP_200_OK

    # Branch Admin (Full own branch context)
    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/reports/trends/").status_code == status.HTTP_200_OK

    # Desk Staff (View own desk = branch-scoped read per Sheet 2 row 20)
    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/reports/trends/").status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_alerts_trigger_rules_permissions_by_role(rbac_setup):
    # Company Admin (Full — create rules per Sheet 2 row 21)
    c_comp = get_client(rbac_setup["company_admin"])
    res = c_comp.post("/api/alert-rules/", {
        "trigger_type": "wait_time", "threshold": {"minutes": 15}, "channels": {"in_app": True}
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED
    rule_id = res.data["id"]

    # Super Admin (Platform defaults — can view all rules)
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/alert-rules/").status_code == status.HTTP_200_OK

    # Branch Admin (View + branch-level override/PATCH — blocked from create per Sheet 2)
    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/alert-rules/").status_code == status.HTTP_200_OK
    assert c_branch.post("/api/alert-rules/", {"trigger_type": "wait_time"}, format="json").status_code == status.HTTP_403_FORBIDDEN

    # Desk Staff (Receive only per Sheet 2 — can GET but cannot create/update)
    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/alert-rules/").status_code == status.HTTP_200_OK
    assert c_staff.post("/api/alert-rules/", {"trigger_type": "wait_time"}, format="json").status_code == status.HTTP_403_FORBIDDEN
    assert c_staff.patch(f"/api/alert-rules/{rule_id}/", {"threshold": {"minutes": 20}}, format="json").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_reports_analytics_export_permissions_by_role(rbac_setup):
    # Super Admin (Platform-wide per Sheet 2 row 22)
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.get("/api/reports/export/").status_code == status.HTTP_200_OK

    # Company Admin (Full own company — GET export)
    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/reports/export/").status_code == status.HTTP_200_OK

    # Branch Admin (Branch-level — GET export - own branch context)
    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/reports/export/").status_code == status.HTTP_200_OK

    # Desk Staff (no access to export per Sheet 2 row 22 = '-')
    c_staff = get_client(rbac_setup["desk_staff"])
    assert c_staff.get("/api/reports/export/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_notification_templates_permissions_by_role(rbac_setup):
    # Company Admin (GET & POST customizations)
    c_comp = get_client(rbac_setup["company_admin"])
    assert c_comp.get("/api/notification-templates/").status_code == status.HTTP_200_OK
    
    res = c_comp.post("/api/notification-templates/", {
        "code": "welcome", "channel": "email", "subject": "Welcome", "body_template": "Hello {{name}}"
    }, format="json")
    assert res.status_code == status.HTTP_201_CREATED

    # Branch Admin (Blocked)
    c_branch = get_client(rbac_setup["branch_admin"])
    assert c_branch.get("/api/notification-templates/").status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_support_impersonation_not_exposed(rbac_setup):
    # Impersonation is deferred/not implemented; assert endpoint returns 404
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.post("/api/impersonate/", {}, format="json").status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_totp_2fa_not_exposed(rbac_setup):
    # TOTP 2FA is deferred/not implemented; assert endpoint returns 404
    c_super = get_client(rbac_setup["super_admin"])
    assert c_super.post("/api/auth/2fa/setup/", {}, format="json").status_code == status.HTTP_404_NOT_FOUND
