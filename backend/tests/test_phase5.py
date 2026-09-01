import pytest
import secrets
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from billing.models import Package, Subscription, Invoice, UpgradeRequest
from audit.models import AuditLog
from branches.models import Branch
from notifications.models import Notification
from billing.tasks import check_trial_expirations, check_subscription_renewals, check_dunning_retry

User = get_user_model()

@pytest.fixture
def billing_setup(db):
    # 1. Package
    pkg = Package.objects.create(
        name="Growth Plan",
        max_branches=2,
        max_users=3,
        price_monthly=29.00,
        price_yearly=290.00,
        feature_flags={"method1": True, "method2": True, "method3": True, "method4": False},
        is_active=True
    )

    # 2. Companies
    company_a = Company.objects.create(
        name="Company A",
        industry="Retail",
        contact_email="admin_a@comp-a.com",
        status="active",
        package=pkg
    )
    company_b = Company.objects.create(
        name="Company B",
        industry="Logistics",
        contact_email="admin_b@comp-b.com",
        status="active",
        package=pkg
    )

    # 3. Admins
    admin_a = User.objects.create_user(
        email="admin_a@comp-a.com",
        password="SecurePassword123",
        role="company_admin",
        company=company_a
    )
    admin_b = User.objects.create_user(
        email="admin_b@comp-b.com",
        password="SecurePassword123",
        role="company_admin",
        company=company_b
    )

    # 4. Branch Admin & Operator (Company A)
    branch = Branch.objects.create(
        company=company_a,
        name="Mumbai Hub",
        slug="mumbai-hub",
        city="Mumbai",
        address="Mumbai Center"
    )
    branch_admin = User.objects.create_user(
        email="branch_a@comp-a.com",
        password="SecurePassword123",
        role="branch_admin",
        company=company_a,
        branch=branch
    )
    operator = User.objects.create_user(
        email="staff_a@comp-a.com",
        password="SecurePassword123",
        role="desk_staff",
        company=company_a,
        branch=branch
    )

    # 5. Super Admin
    super_admin = User.objects.create_user(
        email="super@quesole.com",
        password="SecurePassword123",
        role="super_admin"
    )

    # 6. Active Subscription for Company A
    sub_a = Subscription.objects.create(
        company=company_a,
        package=pkg,
        billing_cycle="monthly",
        start_date=timezone.now().date() - timedelta(days=5),
        end_date=timezone.now().date() + timedelta(days=25),
        status="active",
        auto_renew=True
    )

    return {
        "package": pkg,
        "company_a": company_a,
        "company_b": company_b,
        "admin_a": admin_a,
        "admin_b": admin_b,
        "branch_admin": branch_admin,
        "operator": operator,
        "super_admin": super_admin,
        "sub_a": sub_a,
        "branch": branch
    }

@pytest.mark.django_db
def test_checkout_and_webhook_simulation(billing_setup):
    client = APIClient()
    client.force_authenticate(user=billing_setup["admin_b"]) # Using Company B

    # 1. Create Checkout Session
    payload = {
        "package_id": billing_setup["package"].id,
        "billing_cycle": "monthly"
    }
    res_checkout = client.post("/api/billing/checkout/", payload)
    assert res_checkout.status_code == status.HTTP_200_OK
    session_id = res_checkout.data["session_id"]
    checkout_url = res_checkout.data["checkout_url"]
    assert "stripe-simulator" in checkout_url

    # 2. Retrieve simulator details
    res_sim = client.get(f"/api/billing/public/stripe-simulator/?session_id={session_id}")
    assert res_sim.status_code == status.HTTP_200_OK
    assert billing_setup["package"].name in res_sim.content.decode("utf-8")

    # 3. Simulate payment completion webhook POST
    webhook_payload = {
        "id": "evt_sim_checkout",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": session_id,
                "client_reference_id": billing_setup["company_b"].id,
                "customer": "cus_sim_b",
                "subscription": "sub_sim_b",
                "payment_status": "paid",
                "amount_total": 2900,
                "currency": "usd",
                "metadata": {
                    "package_id": billing_setup["package"].id,
                    "billing_cycle": "monthly"
                }
            }
        }
    }
    
    # Hit the exact Sheet 6 path
    res_webhook = client.post(
        "/api/billing/webhook/",
        webhook_payload,
        format="json",
        HTTP_STRIPE_SIGNATURE="t=123,v1=mock_signature_for_simulation"
    )
    assert res_webhook.status_code == status.HTTP_200_OK

    # Assert subscription created and active
    sub_b = Subscription.objects.get(company=billing_setup["company_b"])
    assert sub_b.status == "active"
    assert sub_b.stripe_subscription_id == "sub_sim_b"
    assert sub_b.stripe_customer_id == "cus_sim_b"

    # Assert Invoice created and paid
    invoice = Invoice.objects.get(company=billing_setup["company_b"])
    assert invoice.status == "paid"
    assert invoice.amount == 29.00
    assert invoice.currency == "INR" # default is INR per models.py, amount converted correctly

    # Assert audit log trails
    assert AuditLog.objects.filter(action="checkout_completed", company=billing_setup["company_b"]).exists()
    assert AuditLog.objects.filter(action="invoice_generated", company=billing_setup["company_b"]).exists()
    assert AuditLog.objects.filter(action="subscription_upgraded", company=billing_setup["company_b"]).exists()

@pytest.mark.django_db
def test_allowance_gating_and_upgrade_request(billing_setup):
    company_a = billing_setup["company_a"]
    admin_a = billing_setup["admin_a"]
    pkg = billing_setup["package"]
    sub_a = billing_setup["sub_a"]

    # 1. Branch Allowance Gating
    # Currently pkg.max_branches = 2, company_a has 1 branch ("Mumbai Hub")
    Branch.objects.create(
        company=company_a,
        name="Branch 2",
        slug="branch-2",
        city="Surat",
        address="Surat Center"
    )

    # Adding a 3rd branch should breach the limit (max 2 + 0 bonus)
    client = APIClient()
    client.force_authenticate(user=admin_a)

    branch_payload = {
        "name": "Branch 3",
        "slug": "branch-3",
        "city": "Ahmedabad",
        "address": "Ahmedabad Center"
    }
    res_branch = client.post("/api/branches/", branch_payload)
    
    # Assert 403 limit block
    assert res_branch.status_code == status.HTTP_403_FORBIDDEN
    assert "limit reached" in res_branch.data["detail"].lower()

    # Assert pending UpgradeRequest auto-created
    upgrade_req = UpgradeRequest.objects.filter(company=company_a, type="branch", status="pending").first()
    assert upgrade_req is not None
    assert upgrade_req.details["quantity"] == 1

    # Assert limit_reached notification created
    assert Notification.objects.filter(type="limit_reached", user=admin_a).exists()

    # 2. User Seats Allowance Gating
    # pkg.max_users = 3. Current count of users in company A is: admin_a, branch_admin, operator (total = 3)
    # Creating another user invite should breach the limit
    invite_payload = {
        "email_or_phone": "new_staff@comp-a.com",
        "role": "desk_staff"
    }
    res_invite = client.post("/api/invites/", invite_payload)
    
    # Assert 403 limit block
    assert res_invite.status_code == status.HTTP_403_FORBIDDEN
    assert "limit reached" in res_invite.data["detail"].lower()

    # Assert pending UpgradeRequest for user created
    user_upgrade_req = UpgradeRequest.objects.filter(company=company_a, type="user", status="pending").first()
    assert user_upgrade_req is not None

    # Assert limit_reached notification
    assert Notification.objects.filter(type="limit_reached", user=admin_a).count() >= 2

@pytest.mark.django_db
def test_invoice_download_and_tenant_isolation(billing_setup):
    company_a = billing_setup["company_a"]
    company_b = billing_setup["company_b"]
    admin_a = billing_setup["admin_a"]
    admin_b = billing_setup["admin_b"]
    sub_a = billing_setup["sub_a"]

    # Seed invoice for Company A
    invoice = Invoice.objects.create(
        company=company_a,
        subscription=sub_a,
        amount=29.00,
        status="paid",
        payment_gateway_ref="session_123",
        issued_at=timezone.now(),
        paid_at=timezone.now()
    )

    client = APIClient()

    # 1. Company A Admin retrieves Company A invoice successfully
    client.force_authenticate(user=admin_a)
    res_ok = client.get(f"/api/billing/invoices/{invoice.id}/download/")
    assert res_ok.status_code == status.HTTP_200_OK
    assert res_ok["Content-Type"] == "application/pdf"
    assert len(res_ok.content) > 0

    # 2. Company B Admin tries to retrieve Company A invoice -> fails (403 tenant isolation check)
    client.force_authenticate(user=admin_b)
    res_fail = client.get(f"/api/billing/invoices/{invoice.id}/download/")
    assert res_fail.status_code == status.HTTP_403_FORBIDDEN

    # 3. Company B Admin tries to list Company A's invoice -> isolated list
    res_list = client.get("/api/billing/invoices/")
    assert res_list.status_code == status.HTTP_200_OK
    assert invoice.id not in [inv["id"] for inv in res_list.data]

    # 4. Cross-tenant usage isolation: Company B sees only its own subscription data
    # Company B has no subscription, so usage endpoint returns 404 — not Company A's data
    res_usage_b = client.get("/api/billing/usage/")
    assert res_usage_b.status_code == status.HTTP_404_NOT_FOUND

    # Company A sees its own data
    client.force_authenticate(user=admin_a)
    res_usage_a = client.get("/api/billing/usage/")
    assert res_usage_a.status_code == status.HTTP_200_OK
    assert res_usage_a.data["package_name"] == billing_setup["package"].name
    # Explicitly assert Company B's data is not surfaced
    assert res_usage_a.data["package_name"] != "Company B Plan"

    # 5. Cross-tenant checkout isolation: Company B Admin cannot initiate checkout
    # using another company's resources — the view scopes by request.user.company
    # so a correctly scoped checkout for Company B is fine, but verify that
    # a Super Admin (who has no company) is blocked from checkout entirely
    client.force_authenticate(user=billing_setup["super_admin"])
    res_checkout_super = client.post("/api/billing/checkout/", {
        "package_id": billing_setup["package"].id,
        "billing_cycle": "monthly"
    })
    assert res_checkout_super.status_code == status.HTTP_403_FORBIDDEN

@pytest.mark.django_db
def test_autorenew_and_dunning_celery(billing_setup):
    sub_a = billing_setup["sub_a"]
    company_a = billing_setup["company_a"]
    
    # Force sub_a to expire today
    sub_a.end_date = timezone.now().date()
    sub_a.save()

    # 1. Renewal succeeds
    check_subscription_renewals()
    sub_a.refresh_from_db()
    assert sub_a.end_date == timezone.now().date() + timedelta(days=30)
    assert Invoice.objects.filter(company=company_a, status="paid").count() == 1

    # 2. Configure payment renewal to fail
    cache.set(f"sim_renew_fail_{sub_a.id}", True, timeout=600)
    sub_a.end_date = timezone.now().date()
    sub_a.save()

    check_subscription_renewals()
    sub_a.refresh_from_db()
    assert sub_a.status == "past_due"

    # Assert notification sent to Company Admin A
    assert Notification.objects.filter(type="payment_failed", user=billing_setup["admin_a"]).exists()

    # 3. Run dunning retries
    # 1st Retry
    check_dunning_retry()
    assert AuditLog.objects.filter(action="dunning_retry_attempted", company=company_a).count() == 1
    sub_a.refresh_from_db()
    assert sub_a.status == "past_due" # still fails because cache is set

    # 2nd Retry
    check_dunning_retry()
    assert AuditLog.objects.filter(action="dunning_retry_attempted", company=company_a).count() == 2

    # 3rd Retry
    check_dunning_retry()
    assert AuditLog.objects.filter(action="dunning_retry_attempted", company=company_a).count() == 3

    # 4th run -> retries exhausted. Subscription cancelled and company suspended.
    check_dunning_retry()
    sub_a.refresh_from_db()
    assert sub_a.status == "cancelled"

    company_a.refresh_from_db()
    assert company_a.status == "suspended"

    # Assert nonpayment suspension logged
    assert AuditLog.objects.filter(action="company_suspended_nonpayment", company=company_a).exists()

    # Cleanup cache
    cache.delete(f"sim_renew_fail_{sub_a.id}")

@pytest.mark.django_db
def test_trial_expiration_celery(billing_setup):
    sub_a = billing_setup["sub_a"]
    company_a = billing_setup["company_a"]

    # Set up active subscription as a trial subscription
    sub_a.trial_end_date = timezone.now().date() - timedelta(days=1)
    sub_a.save()

    # Run trial expiration check
    check_trial_expirations()

    sub_a.refresh_from_db()
    assert sub_a.status == "cancelled"

    company_a.refresh_from_db()
    assert company_a.status == "suspended"

    # Assert trial suspension audit logged
    assert AuditLog.objects.filter(action="company_suspended_trial_expired", company=company_a).exists()

@pytest.mark.django_db
def test_billing_rbac_gates(billing_setup):
    client = APIClient()

    # 1. Branch Admin blocked from billing views
    client.force_authenticate(user=billing_setup["branch_admin"])
    res_b = client.get("/api/billing/invoices/")
    assert res_b.status_code == status.HTTP_403_FORBIDDEN

    # 2. Desk Staff blocked from billing views
    client.force_authenticate(user=billing_setup["operator"])
    res_s = client.get("/api/billing/invoices/")
    assert res_s.status_code == status.HTTP_403_FORBIDDEN

    # 3. Super Admin blocked from initiating checkout sessions
    # Super Admins manage packages/upgrade-requests but cannot self-subscribe
    # (they have no company; CheckoutSessionView requires role == company_admin)
    client.force_authenticate(user=billing_setup["super_admin"])
    res_super_checkout = client.post("/api/billing/checkout/", {
        "package_id": billing_setup["package"].id,
        "billing_cycle": "monthly"
    })
    assert res_super_checkout.status_code == status.HTTP_403_FORBIDDEN
