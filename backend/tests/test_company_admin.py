"""
test_company_admin.py -- Company Admin Console Test Suite (20 tests)
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from datetime import date

from billing.models import Package, Subscription, UpgradeRequest
from companies.models import Company
from branches.models import Branch
from queuing.models import QueueMethod
from audit.models import AuditLog

User = get_user_model()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def pkg_limited(db):
    return Package.objects.create(
        name="Test Limited",
        max_branches=1,
        max_users=2,
        price_monthly=999,
        price_yearly=9990,
        feature_flags={"method1": True, "method2": True, "method3": True, "method4": True},
        is_active=True,
    )

@pytest.fixture
def company_a(db, pkg_limited):
    return Company.objects.create(
        name="Company A", industry="Retail", city="Mumbai",
        contact_email="a@company.com", contact_phone="9000000001",
        package=pkg_limited, status="active",
    )

@pytest.fixture
def company_b(db, pkg_limited):
    return Company.objects.create(
        name="Company B", industry="Finance", city="Delhi",
        contact_email="b@company.com", contact_phone="9000000002",
        package=pkg_limited, status="active",
    )

@pytest.fixture
def branch_a(db, company_a):
    return Branch.objects.create(company=company_a, name="Branch A Main", city="Mumbai", slug="branch-a-main")

@pytest.fixture
def branch_b(db, company_b):
    return Branch.objects.create(company=company_b, name="Branch B Main", city="Delhi", slug="branch-b-main")

@pytest.fixture
def company_admin_a(db, company_a, branch_a):
    return User.objects.create_user(
        email="ca@company-a.com", password="AdminPass1!",
        role="company_admin", company=company_a, branch=branch_a,
    )

@pytest.fixture
def company_admin_b(db, company_b, branch_b):
    return User.objects.create_user(
        email="ca@company-b.com", password="AdminPass1!",
        role="company_admin", company=company_b, branch=branch_b,
    )

@pytest.fixture
def subscription_a(db, company_a, pkg_limited):
    return Subscription.objects.create(
        company=company_a, package=pkg_limited, billing_cycle="monthly",
        start_date=date.today(), end_date=date(2099, 12, 31),
        status="active", bonus_branches=0, bonus_users=0,
    )

@pytest.fixture
def client_a(company_admin_a):
    client = APIClient()
    resp = client.post("/api/auth/login/", {"email": "ca@company-a.com", "password": "AdminPass1!"}, format="json")
    assert resp.status_code == 200, f"Login failed: {resp.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return client

def _valid_payload(branch, role="branch_admin", email="new@test.com"):
    return {
        "email": email, "first_name": "Test", "last_name": "User",
        "role": role, "branch": str(branch.id),
        "password": "SecurePass1", "password_confirm": "SecurePass1",
    }

# ---------------------------------------------------------------------------
# 1-5. Password validation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_create_staff_password_required(client_a, branch_a, subscription_a):
    payload = _valid_payload(branch_a)
    del payload["password"]
    del payload["password_confirm"]
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 400, resp.data
    assert "password" in resp.data

@pytest.mark.django_db
def test_create_staff_password_too_short(client_a, branch_a, subscription_a):
    payload = _valid_payload(branch_a)
    payload.update({"password": "abc12", "password_confirm": "abc12"})
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 400, resp.data
    assert any("10 characters" in str(v) for v in resp.data.values())

@pytest.mark.django_db
def test_create_staff_password_no_number(client_a, branch_a, subscription_a):
    payload = _valid_payload(branch_a)
    payload.update({"password": "abcdefghij", "password_confirm": "abcdefghij"})
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 400, resp.data
    assert any("number" in str(v) for v in resp.data.values())

@pytest.mark.django_db
def test_create_staff_password_no_letter(client_a, branch_a, subscription_a):
    payload = _valid_payload(branch_a)
    payload.update({"password": "1234567890", "password_confirm": "1234567890"})
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 400, resp.data
    assert any("letter" in str(v) for v in resp.data.values())

@pytest.mark.django_db
def test_create_staff_password_confirm_mismatch(client_a, branch_a, subscription_a):
    payload = _valid_payload(branch_a)
    payload.update({"password": "SecurePass1", "password_confirm": "DifferentPass2"})
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 400, resp.data
    assert any("match" in str(v) for v in resp.data.values())

# ---------------------------------------------------------------------------
# 6. User limit gating
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_user_limit_gating_uses_max_users(client_a, company_a, branch_a, subscription_a):
    # company_admin_a counts as 1 active user; max_users=2 -> one slot left
    User.objects.create_user(
        email="staff1@test.com", password="Pass1234567",
        role="desk_staff", company=company_a, branch=branch_a,
    )
    # Now at limit (2 active users) -- next must be blocked
    payload = _valid_payload(branch_a, email="staff2@test.com")
    resp = client_a.post("/api/users/", payload, format="json")
    assert resp.status_code == 403, resp.data
    assert "limit" in str(resp.data).lower()
    assert UpgradeRequest.objects.filter(company=company_a, type="user").exists(), \
        "UpgradeRequest must be auto-created on user seat limit breach"

# ---------------------------------------------------------------------------
# 7. Branch Admin create-then-login
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_create_branch_admin_then_login(client_a, company_a, branch_a, subscription_a):
    email, password = "ba@roundtrip.com", "RoundTrip1"
    payload = _valid_payload(branch_a, role="branch_admin", email=email)
    payload.update({"password": password, "password_confirm": password})
    assert client_a.post("/api/users/", payload, format="json").status_code == 201

    lc = APIClient()
    lr = lc.post("/api/auth/login/", {"email": email, "password": password}, format="json")
    assert lr.status_code == 200, f"Login round-trip failed: {lr.data}"
    assert lr.data["user"]["role"] == "branch_admin"
    assert lr.data["user"]["companyId"] == str(company_a.id)

    lc.credentials(HTTP_AUTHORIZATION=f"Bearer {lr.data['access']}")
    br = lc.get("/api/branches/")
    assert br.status_code == 200
    ids = [str(b["id"]) for b in br.data]
    assert str(branch_a.id) in ids
    assert len(ids) == 1, f"Branch Admin must see exactly 1 branch, got: {ids}"

# ---------------------------------------------------------------------------
# 8. Desk Staff create-then-login
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_create_desk_staff_then_login(client_a, branch_a, subscription_a):
    email, password = "ds@roundtrip.com", "StaffLogin1"
    payload = _valid_payload(branch_a, role="desk_staff", email=email)
    payload.update({"password": password, "password_confirm": password})
    assert client_a.post("/api/users/", payload, format="json").status_code == 201

    lc = APIClient()
    lr = lc.post("/api/auth/login/", {"email": email, "password": password}, format="json")
    assert lr.status_code == 200, f"Login failed: {lr.data}"
    assert lr.data["user"]["role"] == "desk_staff"
    assert lr.data["user"]["branchId"] == str(branch_a.id)

# ---------------------------------------------------------------------------
# 9-11. Method switching
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_method_switch_m1_atomically_disables_m2(client_a, company_a, branch_a):
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="2", is_enabled=True)
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="3", is_enabled=True)
    m1, _ = QueueMethod.objects.get_or_create(
        company=company_a, branch=branch_a, method="1", defaults={"is_enabled": False}
    )
    resp = client_a.patch(f"/api/queue-methods/{m1.id}/", {"is_enabled": True}, format="json")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.data}"
    assert not QueueMethod.objects.get(branch=branch_a, method="2").is_enabled, "M2 must be disabled"
    assert not QueueMethod.objects.get(branch=branch_a, method="3").is_enabled, "M3 must be disabled"

@pytest.mark.django_db
def test_method_switch_m2_atomically_disables_m1(client_a, company_a, branch_a):
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="1", is_enabled=True)
    m2, _ = QueueMethod.objects.get_or_create(
        company=company_a, branch=branch_a, method="2", defaults={"is_enabled": False}
    )
    resp = client_a.patch(f"/api/queue-methods/{m2.id}/", {"is_enabled": True}, format="json")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.data}"
    assert not QueueMethod.objects.get(branch=branch_a, method="1").is_enabled, "M1 must be disabled"

@pytest.mark.django_db
def test_method3_blocked_without_m2(client_a, company_a, branch_a):
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="1", is_enabled=True)
    m3, _ = QueueMethod.objects.get_or_create(
        company=company_a, branch=branch_a, method="3", defaults={"is_enabled": False}
    )
    resp = client_a.patch(f"/api/queue-methods/{m3.id}/", {"is_enabled": True}, format="json")
    assert resp.status_code == 400, f"Expected 400 (M3 blocked without M2), got {resp.status_code}"

# ---------------------------------------------------------------------------
# 12-13. Email uniqueness check
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_check_email_requires_auth():
    resp = APIClient().get("/api/users/check-email/?email=test@x.com")
    assert resp.status_code == 401, f"Expected 401 for unauthenticated, got {resp.status_code}"

@pytest.mark.django_db
def test_check_email_global_uniqueness(client_a, company_b, branch_b):
    User.objects.create_user(
        email="taken@company-b.com", password="SomePass123",
        role="desk_staff", company=company_b, branch=branch_b,
    )
    resp = client_a.get("/api/users/check-email/?email=taken@company-b.com")
    assert resp.status_code == 200, resp.data
    assert resp.data["available"] is False, \
        "Email from Company B must return available=false to Company A admin (global uniqueness)"

    resp2 = client_a.get("/api/users/check-email/?email=free@nowhere-on-platform.com")
    assert resp2.status_code == 200
    assert resp2.data["available"] is True

# ---------------------------------------------------------------------------
# 14. Branch limit gating
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_branch_limit_gating_auto_upgrade_request(client_a, company_a, branch_a, subscription_a):
    resp = client_a.post("/api/branches/", {
        "name": "Second Branch", "city": "Pune", "slug": "second-branch",
        "address": "Pune, India",
    }, format="json")

    assert resp.status_code == 403, f"Expected 403 on branch limit, got {resp.status_code}: {resp.data}"
    assert UpgradeRequest.objects.filter(company=company_a, type="branch").exists(), \
        "UpgradeRequest must be auto-created on branch limit breach"

# ---------------------------------------------------------------------------
# 15. Package data integrity
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_package_data_integrity():
    names = set(Package.objects.filter(is_active=True).values_list("name", flat=True))
    required = {"Starter", "Standard", "Advanced", "Enterprise"}
    assert required.issubset(names), f"Required packages {required} not all present. Got: {names}"
    assert "Growth" not in names, f"'Growth' must not exist as a package name. Got: {names}"

# ---------------------------------------------------------------------------
# 16. Tenant isolation
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_tenant_isolation_branch_admin(company_a, company_b, branch_a, branch_b):
    User.objects.create_user(
        email="ba@company-a.com", password="BranchAdmin1",
        role="branch_admin", company=company_a, branch=branch_a,
    )
    lc = APIClient()
    resp = lc.post("/api/auth/login/", {"email": "ba@company-a.com", "password": "BranchAdmin1"}, format="json")
    assert resp.status_code == 200
    lc.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    br = lc.get("/api/branches/")
    ids = [str(b["id"]) for b in br.data]
    assert str(branch_b.id) not in ids, f"Company A Branch Admin must NOT see Company B branches. Got: {ids}"

# ---------------------------------------------------------------------------
# 17. Cross-tenant branch reassignment blocked
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_reassign_branch_cross_tenant_blocked(client_a, company_a, company_b, branch_a, branch_b, subscription_a):
    staff = User.objects.create_user(
        email="staff@company-a.com", password="StaffPass1",
        role="desk_staff", company=company_a, branch=branch_a,
    )
    resp = client_a.patch(f"/api/users/{staff.id}/", {"branch": str(branch_b.id)}, format="json")
    assert resp.status_code == 403, \
        f"Expected 403 for cross-tenant reassignment, got {resp.status_code}: {resp.data}"

# ---------------------------------------------------------------------------
# 18. Deactivate creates audit log
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_deactivate_creates_audit_log(client_a, company_a, branch_a, subscription_a):
    staff = User.objects.create_user(
        email="todeactivate@company-a.com", password="DeactivMe1",
        role="desk_staff", company=company_a, branch=branch_a,
    )
    resp = client_a.patch(f"/api/users/{staff.id}/", {"is_active": False}, format="json")
    assert resp.status_code in [200, 204], f"Deactivate failed: {resp.status_code} {resp.data}"
    log = AuditLog.objects.filter(action="staff_deactivated", object_id=str(staff.id)).first()
    assert log is not None, "Expected AuditLog with action='staff_deactivated'"
    assert log.changes.get("is_active") is False

# ---------------------------------------------------------------------------
# 19. Branch reassignment creates audit log
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_reassign_branch_creates_audit_log(client_a, company_a, branch_a, subscription_a):
    branch_a2 = Branch.objects.create(
        company=company_a, name="Branch A2", city="Pune", slug="branch-a2"
    )
    staff = User.objects.create_user(
        email="toreassign@company-a.com", password="ReassignMe1",
        role="desk_staff", company=company_a, branch=branch_a,
    )
    resp = client_a.patch(f"/api/users/{staff.id}/", {"branch": str(branch_a2.id)}, format="json")
    assert resp.status_code in [200, 204], f"Reassign failed: {resp.status_code} {resp.data}"
    log = AuditLog.objects.filter(action="staff_branch_reassigned", object_id=str(staff.id)).first()
    assert log is not None, "Expected AuditLog with action='staff_branch_reassigned'"
    assert str(branch_a2.id) in str(log.changes.get("to_branch", ""))

# ---------------------------------------------------------------------------
# 20. RBAC: desk_staff cannot create users via API
# ---------------------------------------------------------------------------

@pytest.mark.django_db
def test_desk_staff_cannot_create_users_via_api(company_a, branch_a):
    User.objects.create_user(
        email="ds@company-a.com", password="DeskStaff1",
        role="desk_staff", company=company_a, branch=branch_a,
    )
    lc = APIClient()
    resp = lc.post("/api/auth/login/", {"email": "ds@company-a.com", "password": "DeskStaff1"}, format="json")
    assert resp.status_code == 200
    lc.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    resp2 = lc.post("/api/users/", _valid_payload(branch_a, email="victim@test.com"), format="json")
    assert resp2.status_code == 403, \
        f"Desk Staff must not create users, got {resp2.status_code}: {resp2.data}"
