import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from companies.models import Company
from billing.models import Package, Subscription, UpgradeRequest
from accounts.models import UserInvite
from audit.models import AuditLog

User = get_user_model()

@pytest.fixture
def active_package(db):
    return Package.objects.create(
        name="Starter Pack",
        max_branches=1,
        max_users=2,
        price_monthly=1000,
        price_yearly=10000,
        feature_flags={"method1": True},
        is_active=True
    )

@pytest.fixture
def super_admin(db):
    return User.objects.create_superuser(
        email="superadmin@platform.com",
        password="superpassword123",
        role="super_admin"
    )

@pytest.fixture
def api_clients(db):
    from rest_framework.test import APIClient
    client = APIClient()
    return client

@pytest.mark.django_db
def test_company_registration_validation(api_clients, active_package):
    # Test missing fields
    response = api_clients.post("/api/companies/register/", {})
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    # Test terms consent missing
    payload = {
        "company_name": "Test Company Ltd",
        "industry": "Healthcare",
        "contact_email": "billing@testco.com",
        "contact_phone": "+919876543210",
        "address": "123 Main St",
        "city": "Ahmedabad",
        "estimated_branch_count": 1,
        "package": active_package.id,
        "billing_cycle": "monthly",
        "admin_first_name": "John",
        "admin_last_name": "Doe",
        "admin_email": "admin@testco.com",
        "admin_password": "weak",
        "admin_confirm_password": "weak",
        "admin_phone": "+919876543211",
        "terms_consent": False
    }
    response = api_clients.post("/api/companies/register/", payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "terms_consent" in response.data or "non_field_errors" in response.data
    
    # Test weak password (no numbers) and mismatch
    payload["terms_consent"] = True
    payload["admin_password"] = "onlyletters"
    payload["admin_confirm_password"] = "onlyletters"
    response = api_clients.post("/api/companies/register/", payload)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "admin_password" in response.data or "non_field_errors" in response.data

    # Test valid registration
    payload["admin_password"] = "Securepass123"
    payload["admin_confirm_password"] = "Securepass123"
    response = api_clients.post("/api/companies/register/", payload)
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["company"]["status"] == "pending"
    
    # Verify DB records
    company = Company.objects.get(contact_email="billing@testco.com")
    assert company.status == "pending"
    sub = Subscription.objects.get(company=company)
    assert sub.status == "pending"
    admin_user = User.objects.get(email="admin@testco.com")
    assert admin_user.company == company
    assert admin_user.role == "company_admin"

    # Verify duplicate name soft warning
    response_dup = api_clients.post("/api/companies/register/", payload)
    # The payload contact_email is already registered, so it fails on uniqueness
    payload["contact_email"] = "billing2@testco.com"
    payload["admin_email"] = "admin2@testco.com"
    response_dup = api_clients.post("/api/companies/register/", payload)
    assert response_dup.status_code == status.HTTP_201_CREATED
    assert "warning" in response_dup.data
    assert "already registered" in response_dup.data["warning"]


@pytest.mark.django_db
def test_company_approval_and_suspension_gating(api_clients, super_admin, active_package):
    # Register pending company
    payload = {
        "company_name": "Gate Co",
        "industry": "Banking",
        "contact_email": "billing@gateco.com",
        "contact_phone": "+919876543210",
        "address": "123 BKC St",
        "city": "Mumbai",
        "estimated_branch_count": 1,
        "package": active_package.id,
        "billing_cycle": "monthly",
        "admin_first_name": "Bob",
        "admin_last_name": "Builder",
        "admin_email": "bob@gateco.com",
        "admin_password": "Building123",
        "admin_confirm_password": "Building123",
        "admin_phone": "+919876543211",
        "terms_consent": True
    }
    api_clients.post("/api/companies/register/", payload)
    
    company = Company.objects.get(contact_email="billing@gateco.com")
    admin_user = User.objects.get(email="bob@gateco.com")
    
    # 1. Login as pending company admin
    login_res = api_clients.post("/api/auth/login/", {"email": "bob@gateco.com", "password": "Building123"})
    assert login_res.status_code == status.HTTP_200_OK
    token = login_res.data["access"]
    
    # 2. Query workspace endpoint -> Should get 403 Forbidden
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    branches_res = api_clients.get("/api/branches/")
    assert branches_res.status_code == status.HTTP_403_FORBIDDEN
    assert "company status is pending" in branches_res.data["detail"]
    
    # 3. Approve company as Super Admin
    login_super = api_clients.post("/api/auth/login/", {"email": "superadmin@platform.com", "password": "superpassword123"})
    token_super = login_super.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token_super}")
    
    approve_res = api_clients.patch(f"/api/companies/{company.id}/", {"action": "approve"})
    assert approve_res.status_code == status.HTTP_200_OK
    assert approve_res.data["status"] == "active"
    assert approve_res.data["subscription_status"] == "active"
    
    # Verify audit log contains company_approved action
    audit_row = AuditLog.objects.filter(action="company_approved").first()
    assert audit_row is not None
    assert audit_row.actor == super_admin
    
    # 4. Request as Company Admin now -> Should succeed
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    branches_res = api_clients.get("/api/branches/")
    assert branches_res.status_code == status.HTTP_200_OK
    
    # 5. Suspend company as Super Admin
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token_super}")
    suspend_res = api_clients.patch(f"/api/companies/{company.id}/", {"action": "suspend"})
    assert suspend_res.status_code == status.HTTP_200_OK
    assert suspend_res.data["status"] == "suspended"
    # Subscription status remains active!
    assert suspend_res.data["subscription_status"] == "active"
    
    # Verify audit log contains company_suspended
    assert AuditLog.objects.filter(action="company_suspended").exists()
    
    # 6. Request as Company Admin -> Should get 403 Forbidden
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    branches_res = api_clients.get("/api/branches/")
    assert branches_res.status_code == status.HTTP_403_FORBIDDEN
    assert "company status is suspended" in branches_res.data["detail"]

    # 7. Reactivate company as Super Admin
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token_super}")
    reactivate_res = api_clients.patch(f"/api/companies/{company.id}/", {"action": "reactivate"})
    assert reactivate_res.status_code == status.HTTP_200_OK
    assert reactivate_res.data["status"] == "active"

    # Verify audit log contains company_reactivated
    assert AuditLog.objects.filter(action="company_reactivated").exists()

    # 8. Reject company (move back to pending first to allow reject)
    company.status = "pending"
    company.save()
    reject_res = api_clients.patch(f"/api/companies/{company.id}/", {"action": "reject", "reason": "Failed compliance"})
    assert reject_res.status_code == status.HTTP_200_OK
    assert reject_res.data["status"] == "rejected"
    assert reject_res.data["subscription_status"] == "rejected"
    assert AuditLog.objects.filter(action="company_rejected").exists()


@pytest.mark.django_db
def test_package_limits_and_upgrades(api_clients, super_admin, active_package):
    # Setup company
    company = Company.objects.create(
        name="Limit Co",
        industry="Retail",
        contact_email="limit@retail.com",
        contact_phone="+919876543210",
        status="active",
        package=active_package
    )
    sub = Subscription.objects.create(
        company=company,
        package=active_package,
        billing_cycle="monthly",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timezone.timedelta(days=30),
        status="active"
    )
    admin_user = User.objects.create_user(
        email="admin@limitco.com",
        password="SecurePass123",
        role="company_admin",
        company=company
    )
    
    # 1. Login as Company Admin
    login_res = api_clients.post("/api/auth/login/", {"email": "admin@limitco.com", "password": "SecurePass123"})
    token = login_res.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    
    # Create 1st Branch -> Success (starter limit is 1)
    b1_res = api_clients.post("/api/branches/", {"name": "Branch 1", "city": "Mumbai", "address": "BKC St"})
    assert b1_res.status_code == status.HTTP_201_CREATED
    
    # Create 2nd Branch -> Blocked (Limit Exceeded)
    b2_res = api_clients.post("/api/branches/", {"name": "Branch 2", "city": "Pune", "address": "FC St"})
    assert b2_res.status_code == status.HTTP_403_FORBIDDEN
    assert "Branch limit exceeded" in b2_res.data["detail"]
    
    # 2. Request an upgrade for 1 extra branch
    up_res = api_clients.post("/api/upgrades/", {
        "type": "branch",
        "details": {"quantity": 1}
    }, format="json")
    assert up_res.status_code == status.HTTP_201_CREATED
    upgrade_id = up_res.data["id"]
    
    # 3. Super Admin approves upgrade request
    login_super = api_clients.post("/api/auth/login/", {"email": "superadmin@platform.com", "password": "superpassword123"})
    token_super = login_super.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token_super}")
    
    resolve_res = api_clients.patch(f"/api/upgrades/{upgrade_id}/", {"action": "approve"})
    assert resolve_res.status_code == status.HTTP_200_OK
    assert resolve_res.data["status"] == "approved"
    
    # 4. Create 2nd Branch again -> Success!
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    b2_res = api_clients.post("/api/branches/", {"name": "Branch 2", "city": "Pune", "address": "FC St"})
    assert b2_res.status_code == status.HTTP_201_CREATED

    # Create 3rd Branch -> Blocked
    b3_res = api_clients.post("/api/branches/", {"name": "Branch 3", "city": "Surat", "address": "Ring Rd"})
    assert b3_res.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_staff_seat_limits_and_soft_delete(api_clients, active_package):
    company = Company.objects.create(
        name="Staff Co",
        industry="Retail",
        contact_email="staff@retail.com",
        status="active",
        package=active_package
    )
    Subscription.objects.create(
        company=company,
        package=active_package,
        billing_cycle="monthly",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timezone.timedelta(days=30),
        status="active"
    )
    admin_user = User.objects.create_user(
        email="admin@staffco.com",
        password="SecurePass123",
        role="company_admin",
        company=company
    )
    
    login_res = api_clients.post("/api/auth/login/", {"email": "admin@staffco.com", "password": "SecurePass123"})
    token = login_res.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # Active users count is 1 (the admin_user). Limit is 2.
    # Send 1st Invite -> Success (total 2 user slots used)
    invite1_res = api_clients.post("/api/invites/", {"email_or_phone": "staff1@staffco.com", "role": "desk_staff"})
    assert invite1_res.status_code == status.HTTP_201_CREATED
    
    # Send 2nd Invite -> Blocked (would exceed seat limit of 2)
    invite2_res = api_clients.post("/api/invites/", {"email_or_phone": "staff2@staffco.com", "role": "desk_staff"})
    assert invite2_res.status_code == status.HTTP_403_FORBIDDEN
    assert "seat limit reached" in invite2_res.data["detail"]

    # Retrieve invite token and accept invite
    # email_or_phone is encrypted at rest — query by the invite token instead
    invite_obj = UserInvite.objects.filter(token__isnull=False).order_by("-created_at").first()
    assert invite_obj is not None, "Expected at least one invite to exist"
    token_val = invite_obj.token

    api_clients.credentials() # Logout
    accept_res = api_clients.post("/api/invites/accept/", {
        "token": token_val,
        "first_name": "Alice",
        "last_name": "Smith",
        "password": "Smithy12345",
        "phone": "+919999988888"
    })
    assert accept_res.status_code == status.HTTP_201_CREATED
    
    # Login as Company Admin and verify Alice is in staff list
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    users_res = api_clients.get("/api/users/")
    assert users_res.status_code == status.HTTP_200_OK
    assert len(users_res.data) == 1 # Excludes super_admin & company_admin (it list desk staff/branch admins)
    alice_id = users_res.data[0]["id"]
    
    # Soft delete staff member
    del_res = api_clients.delete(f"/api/users/{alice_id}/")
    assert del_res.status_code == status.HTTP_204_NO_CONTENT
    
    # Assert Alice is soft deleted in DB (is_active = False)
    alice_user = User.objects.get(id=alice_id)
    assert alice_user.is_active is False
    assert AuditLog.objects.filter(action="staff_deactivated").exists()


@pytest.mark.django_db
def test_rbac_security_gates(api_clients, active_package):
    company = Company.objects.create(
        name="Rbac Co",
        industry="Telecom",
        contact_email="rbac@telecom.com",
        status="active",
        package=active_package
    )
    branch = company.branches.create(name="Branch 1", city="Mumbai")
    staff_user = User.objects.create_user(
        email="staff@rbac.com",
        password="SecurePass123",
        role="desk_staff",
        company=company,
        branch=branch
    )
    
    login_res = api_clients.post("/api/auth/login/", {"email": "staff@rbac.com", "password": "SecurePass123"})
    token = login_res.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    
    # Desk staff tries to access packages CRUD -> 403 Forbidden
    packages_res = api_clients.get("/api/packages/")
    assert packages_res.status_code == status.HTTP_403_FORBIDDEN
    
    # Desk staff tries to approve upgrade requests -> 403 Forbidden
    up_res = api_clients.get("/api/upgrades/")
    assert up_res.status_code == status.HTTP_403_FORBIDDEN
