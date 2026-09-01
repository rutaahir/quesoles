import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.cache import cache
from companies.models import Company
from billing.models import Package, Subscription, CompanyPlanAllocation, PlanComponent
from branches.models import Branch
from kot.models import Kiosk
from kot.provisioning import provision_kiosks_for_branch

User = get_user_model()

@pytest.fixture
def kiosk_setup(db):
    pkg = Package.objects.create(
        name="Enterprise Plan",
        max_branches=5,
        max_users=10,
        max_kiosks=5,
        price_monthly=150.00,
        price_yearly=1500.00,
        feature_flags={"kot": True, "method2": True},
        is_active=True
    )
    comp_pc, _ = PlanComponent.objects.get_or_create(
        key="paper_roll_screens",
        defaults={
            "label": "Base Kiosk Screens",
            "category": "KIOSK",
            "default_included_qty": 0,
            "price_per_unit": 1500.00,
            "is_active": True
        }
    )
    company = Company.objects.create(
        name="Apollo Care",
        industry="Healthcare",
        status="active",
        package=pkg
    )
    branch = Branch.objects.create(
        company=company,
        name="Ahmedabad Clinic",
        slug="ahmedabad-clinic",
        city="Ahmedabad",
        address="Ashram Road",
        status="active"
    )
    sub = Subscription.objects.create(
        company=company,
        package=pkg,
        billing_cycle="monthly",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timezone.timedelta(days=30),
        status="active"
    )
    admin = User.objects.create(
        email="admin@apollocare.in",
        first_name="Rhea",
        last_name="Mehta",
        role="company_admin",
        company=company,
        is_active=True
    )
    admin.set_password("admin123")
    admin.save()
    
    return {
        "pkg": pkg,
        "comp_pc": comp_pc,
        "company": company,
        "branch": branch,
        "admin": admin,
    }

def test_auto_provisioning_via_allocation_signal(kiosk_setup):
    branch = kiosk_setup["branch"]
    company = kiosk_setup["company"]
    comp_pc = kiosk_setup["comp_pc"]
    
    # Create allocation of 3 kiosks
    CompanyPlanAllocation.objects.create(
        company=company,
        branch=branch,
        plan_component=comp_pc,
        purchased_qty=3,
        unit_price_at_purchase=1500.00
    )
    
    # Check that exactly 3 kiosks are provisioned
    kiosks = Kiosk.objects.filter(branch=branch)
    assert kiosks.count() == 3
    assert kiosks.filter(status="active").count() == 3
    
    # Update allocation down to 2 kiosks
    alloc = CompanyPlanAllocation.objects.get(company=company, branch=branch, plan_component=comp_pc)
    alloc.purchased_qty = 2
    alloc.save()
    
    # Check that we still have 3 kiosk rows but only 2 are active
    assert kiosks.count() == 3
    assert kiosks.filter(status="active").count() == 2
    assert kiosks.filter(status="inactive").count() == 1

def test_kiosk_login_rate_limiting(kiosk_setup):
    branch = kiosk_setup["branch"]
    company = kiosk_setup["company"]
    comp_pc = kiosk_setup["comp_pc"]
    
    CompanyPlanAllocation.objects.create(
        company=company,
        branch=branch,
        plan_component=comp_pc,
        purchased_qty=1,
        unit_price_at_purchase=1500.00
    )
    kiosk = Kiosk.objects.get(branch=branch)
    kiosk.pin = "1234"
    kiosk.save()
    
    client = APIClient()
    
    # Test rate limiting (5 failed attempts)
    cache.delete(f"kiosk_lockout_{kiosk.id}")
    cache.delete(f"kiosk_cooldown_{kiosk.id}")
    
    for i in range(4):
        response = client.post("/api/public/kiosks/login/", {"kiosk_id": kiosk.id, "pin": "9999"})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "Invalid PIN" in response.data["error"]
        
    # The 5th attempt should lock out
    response = client.post("/api/public/kiosks/login/", {"kiosk_id": kiosk.id, "pin": "9999"})
    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Too many failed attempts" in response.data["error"]

def test_pin_regeneration_eviction(kiosk_setup):
    branch = kiosk_setup["branch"]
    company = kiosk_setup["company"]
    comp_pc = kiosk_setup["comp_pc"]
    admin = kiosk_setup["admin"]
    
    CompanyPlanAllocation.objects.create(
        company=company,
        branch=branch,
        plan_component=comp_pc,
        purchased_qty=1,
        unit_price_at_purchase=1500.00
    )
    kiosk = Kiosk.objects.get(branch=branch)
    kiosk.session_token = "some_active_token"
    kiosk.connected_at = timezone.now()
    kiosk.last_seen = timezone.now()
    kiosk.save()
    
    client = APIClient()
    client.force_authenticate(user=admin)
    
    response = client.post(f"/api/kot/kiosks/{kiosk.id}/regenerate-pin/")
    assert response.status_code == status.HTTP_200_OK
    
    # Check that the PIN is updated and session is cleared
    kiosk.refresh_from_db()
    assert kiosk.session_token is None
    assert kiosk.connected_at is None
    assert kiosk.last_seen is None
