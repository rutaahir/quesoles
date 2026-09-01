import pytest
from rest_framework.exceptions import ValidationError
from django.contrib.auth import get_user_model
from branches.models import Branch
from queuing.models import Desk, Service
from kot.models import Printer
from billing.models import PlanComponent, CompanyPlanAllocation
from billing.services.pricing_engine import PricingEngine
from core.middleware import tenant_context

User = get_user_model()

@pytest.mark.django_db
def test_pricing_engine_mandatory_components():
    # Make sure operator_screens component exists and is mandatory
    comp, _ = PlanComponent.objects.get_or_create(
        key="operator_screens",
        defaults={
            "label": "Operator Seats",
            "price_per_unit": 1200.0,
            "default_included_qty": 3,
            "min_qty": 1,
            "is_mandatory": True,
            "is_active": True
        }
    )
    comp.is_mandatory = True
    comp.save()

    # Check that service_qty=0 or operator_qty=0 throws validation error
    with pytest.raises(ValidationError) as excinfo:
        PricingEngine.calculate_quote(
            mode="SERVICE_BASED",
            service_qty=0,
            operator_qty=0,
            kiosk_qty=1,
            token_delivery_selections=[],
            addons={}
        )
    assert "mandatory" in str(excinfo.value).lower() or "required" in str(excinfo.value).lower()

@pytest.mark.django_db
def test_branch_scoped_desk_service_printer_entitlement_enforcement(seed_data):
    user_a = seed_data["user_a_admin"]
    company = seed_data["company_a"]
    branch = seed_data["branch_a"]

    # 1. Setup allocations
    # operator_screens = 1, services = 1, paper_roll_screens = 1
    comp_op, _ = PlanComponent.objects.get_or_create(key="operator_screens", defaults={"price_per_unit": 1200.0, "is_active": True})
    comp_ser, _ = PlanComponent.objects.get_or_create(key="services", defaults={"price_per_unit": 800.0, "is_active": True})
    comp_kiosk, _ = PlanComponent.objects.get_or_create(key="paper_roll_screens", defaults={"price_per_unit": 1500.0, "is_active": True})

    CompanyPlanAllocation.objects.create(company=company, branch=branch, plan_component=comp_op, purchased_qty=1)
    CompanyPlanAllocation.objects.create(company=company, branch=branch, plan_component=comp_ser, purchased_qty=1)
    CompanyPlanAllocation.objects.create(company=company, branch=branch, plan_component=comp_kiosk, purchased_qty=1)

    with tenant_context(user_a):
        # Already has 1 service (seed_data['service_a'])
        # Try to create another Service - should raise validation error
        from queuing.views import ServiceViewSet
        from rest_framework.test import APIRequestFactory, force_authenticate
        factory = APIRequestFactory()
        view = ServiceViewSet.as_view({'post': 'create'})

        # Let's clean up existing services if any first to ensure exact count
        Service.objects.filter(branch=branch).delete()
        
        # Create first service - OK
        req1 = factory.post('/api/services/', {'name': 'Service 1', 'branch': branch.id, 'prefix': 'S1', 'is_active': True})
        force_authenticate(req1, user=user_a)
        res1 = view(req1)
        assert res1.status_code == 201

        # Create second service - Should fail
        req2 = factory.post('/api/services/', {'name': 'Service 2', 'branch': branch.id, 'prefix': 'S2', 'is_active': True})
        force_authenticate(req2, user=user_a)
        res2 = view(req2)
        assert res2.status_code == 400
        assert "limit" in str(res2.data).lower() or "allocation" in str(res2.data).lower()

        # Enforce desks allocation (purchased = 1)
        from queuing.views import DeskViewSet
        desk_view = DeskViewSet.as_view({'post': 'create'})
        
        # Clean up existing desks
        Desk.objects.filter(branch=branch).delete()
        
        # Create first desk - OK
        req_d1 = factory.post('/api/desks/', {'name': 'Desk 1', 'branch': branch.id, 'is_active': True})
        force_authenticate(req_d1, user=user_a)
        res_d1 = desk_view(req_d1)
        assert res_d1.status_code == 201

        # Create second desk - Should fail
        req_d2 = factory.post('/api/desks/', {'name': 'Desk 2', 'branch': branch.id, 'is_active': True})
        force_authenticate(req_d2, user=user_a)
        res_d2 = desk_view(req_d2)
        assert res_d2.status_code == 400
        assert "limit" in str(res_d2.data).lower() or "allocation" in str(res_d2.data).lower()

        # Enforce printer / kiosk allocation (purchased = 1)
        from kot.views import PrinterViewSet
        printer_view = PrinterViewSet.as_view({'post': 'create'})

        # Clean up existing printers
        Printer.objects.filter(branch=branch).delete()

        # Create first printer - OK
        req_p1 = factory.post('/api/printers/', {'name': 'Printer 1', 'branch': branch.id, 'printer_type': 'kiosk', 'connection_type': 'network'})
        force_authenticate(req_p1, user=user_a)
        res_p1 = printer_view(req_p1)
        assert res_p1.status_code == 201

        # Create second printer - Should fail
        req_p2 = factory.post('/api/printers/', {'name': 'Printer 2', 'branch': branch.id, 'printer_type': 'kiosk', 'connection_type': 'network'})
        force_authenticate(req_p2, user=user_a)
        res_p2 = printer_view(req_p2)
        assert res_p2.status_code == 400
        assert "limit" in str(res_p2.data).lower() or "allocation" in str(res_p2.data).lower()
