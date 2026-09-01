import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from billing.models import Package
from companies.models import Company
from branches.models import Branch
from queuing.models import Service

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def seed_data(db):
    # Create Package
    pkg = Package.objects.create(
        name="Enterprise Test",
        max_branches=10,
        max_users=10,
        price_monthly=100.00,
        price_yearly=1000.00,
        feature_flags={"method1": True, "method2": True},
        is_active=True
    )
    
    # Create Company A
    company_a = Company.objects.create(
        name="Company A",
        industry="Tech",
        contact_email="admin@comp-a.com",
        contact_phone="1234567890",
        status="active",
        package=pkg
    )
    
    # Create Branch A
    branch_a = Branch.objects.create(
        company=company_a,
        name="Branch A",
        slug="branch-a",
        address="123 Road",
        city="City A",
        mode="SERVICE_BASED"
    )
    
    # Create Company A Users
    user_a_admin = User.objects.create_user(
        email="admin@comp-a.com",
        password="password123",
        role="company_admin",
        company=company_a
    )
    
    user_a_staff = User.objects.create_user(
        email="staff@comp-a.com",
        password="password123",
        role="desk_staff",
        company=company_a,
        branch=branch_a
    )
    
    # Create Company B
    company_b = Company.objects.create(
        name="Company B",
        industry="Diag",
        contact_email="admin@comp-b.com",
        contact_phone="0987654321",
        status="active",
        package=pkg
    )
    
    # Create Branch B
    branch_b = Branch.objects.create(
        company=company_b,
        name="Branch B",
        slug="branch-b",
        address="456 Lane",
        city="City B"
    )
    
    # Create Company B Users
    user_b_admin = User.objects.create_user(
        email="admin@comp-b.com",
        password="password123",
        role="company_admin",
        company=company_b
    )
    
    # Create some tenant-scoped models in both
    service_a = Service.objects.create(
        branch=branch_a,
        company=company_a,
        name="Checkup A",
        est_service_minutes=15
    )
    
    service_b = Service.objects.create(
        branch=branch_b,
        company=company_b,
        name="Checkup B",
        est_service_minutes=10
    )
    
    return {
        "package": pkg,
        "company_a": company_a,
        "company_b": company_b,
        "branch_a": branch_a,
        "branch_b": branch_b,
        "user_a_admin": user_a_admin,
        "user_a_staff": user_a_staff,
        "user_b_admin": user_b_admin,
        "service_a": service_a,
        "service_b": service_b
    }
