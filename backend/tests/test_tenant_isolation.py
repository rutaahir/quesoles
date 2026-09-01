import pytest
from core.middleware import tenant_context, get_current_user
from queuing.models import Service

def test_company_tenant_isolation_orm(db, seed_data):
    # Set context to Company A Admin
    user_a = seed_data["user_a_admin"]
    with tenant_context(user_a):
        services = list(Service.objects.all())
        # Should only return Company A's services
        assert len(services) == 1
        assert services[0] == seed_data["service_a"]

    # Set context to Company B Admin
    user_b = seed_data["user_b_admin"]
    with tenant_context(user_b):
        services = list(Service.objects.all())
        # Should only return Company B's services
        assert len(services) == 1
        assert services[0] == seed_data["service_b"]

def test_branch_tenant_isolation_orm(db, seed_data):
    # Set context to Branch A Staff
    staff_a = seed_data["user_a_staff"]
    with tenant_context(staff_a):
        services = list(Service.objects.all())
        # Should only return Branch A's services
        assert len(services) == 1
        assert services[0] == seed_data["service_a"]

def test_unfiltered_tenant_access_without_context(db, seed_data):
    # Without context (e.g. background Celery or migrations), should return all services
    assert get_current_user() is None
    services = list(Service.objects.all())
    assert len(services) == 2
    assert seed_data["service_a"] in services
    assert seed_data["service_b"] in services
