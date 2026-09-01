import pytest
from django.utils import timezone
from rest_framework import status
from companies.models import Company
from branches.models import Branch
from queuing.models import Desk, QueueMethod
from appointments.models import TimeSlot, OnlineBooking

@pytest.mark.django_db
def test_company_slugification():
    # Verify auto-slugification on save
    c1 = Company.objects.create(name="Apollo Care", industry="Health", contact_email="a@care.com")
    assert c1.slug == "apollo-care"
    
    # Verify unique slug suffixing for duplicates
    c2 = Company.objects.create(name="Apollo Care", industry="Health", contact_email="b@care.com")
    assert c2.slug.startswith("apollo-care-")
    assert c2.slug != "apollo-care"

@pytest.mark.django_db
def test_public_company_resolution_endpoint(api_client, seed_data):
    # Retrieve seed data
    company_a = Company.objects.first()
    branch_a = Branch.objects.first()
    
    # Configure company for online booking
    company_a.solution = "HYBRID"
    company_a.save()
    
    # 1. Resolve company when no branch has method 4 enabled -> should fail or warn booking not active
    response = api_client.get(f"/api/public/company/{company_a.slug}/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "booking is not available" in response.data["error"]
    
    # Enable Method 4 on branch
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="4", is_enabled=True)
    
    # 2. Resolve company successfully
    response = api_client.get(f"/api/public/company/{company_a.slug}/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == company_a.name
    assert len(response.data["branches"]) == 1
    assert response.data["branches"][0]["id"] == branch_a.id

@pytest.mark.django_db
def test_dynamic_slots_generation_and_overrides(api_client, seed_data):
    branch_a = Branch.objects.first()
    
    # Add weekly template slot configurations
    # Day 0 (Monday), 09:00 - 10:00, 30m slots -> 2 slots: 09:00, 09:30
    TimeSlot.objects.create(
        branch=branch_a,
        day_of_week=0,
        start_time="09:00:00",
        end_time="10:00:00",
        slot_duration_minutes=30,
        max_bookings_per_slot=2,
        is_active=True
    )
    
    # Test slots on a Monday date
    monday_date = "2026-08-24" # Aug 24, 2026 is a Monday
    
    # Request slots for Monday
    response = api_client.get(f"/api/public/branches/{branch_a.id}/slots/?date={monday_date}")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    assert response.data[0]["time"] == "09:00"
    assert response.data[0]["status"] == "open"
    assert response.data[0]["available"] == 2
    
    # Add booking to slot 09:00
    OnlineBooking.objects.create(
        branch=branch_a,
        date=monday_date,
        slot_time="09:00:00",
        customer_name="John",
        customer_phone="12345",
        customer_email="john@test.com",
        status="confirmed"
    )
    
    # Request slots again -> 09:00 should have 1 available, 09:30 should have 2
    response = api_client.get(f"/api/public/branches/{branch_a.id}/slots/?date={monday_date}")
    assert response.data[0]["available"] == 1
    assert response.data[1]["available"] == 2
    
    # Add specific date override - closure
    TimeSlot.objects.create(
        branch=branch_a,
        specific_date=monday_date,
        start_time="00:00:00",
        end_time="00:00:00",
        slot_duration_minutes=30,
        max_bookings_per_slot=0,
        is_active=False # CLOSED
    )
    
    # Request slots again -> should return 0 slots (Holiday Closure override)
    response = api_client.get(f"/api/public/branches/{branch_a.id}/slots/?date={monday_date}")
    assert len(response.data) == 0

@pytest.mark.django_db
def test_booking_throttling_and_otp(api_client, seed_data):
    branch_a = Branch.objects.first()
    company_a = Company.objects.first()
    company_a.solution = "HYBRID"
    company_a.save()
    QueueMethod.objects.create(company=company_a, branch=branch_a, method="4", is_enabled=True)
    
    service_a = seed_data["service_a"]

    # Add weekly template
    TimeSlot.objects.create(
        branch=branch_a,
        service=service_a,
        day_of_week=0,
        start_time="09:00:00",
        end_time="10:00:00",
        slot_duration_minutes=30,
        max_bookings_per_slot=5,
        is_active=True
    )
    
    monday_date = "2026-08-24"
    phone_num = "+919876543210"
    email_addr = "cust@test.com"
    
    # 1. Send OTP
    response = api_client.post("/api/public/appointments/otp/send/", {
        "email": email_addr,
        "purpose": "booking"
    })
    assert response.status_code == status.HTTP_200_OK
    
    # Get created OTP code from backend outbox
    from django.core import mail
    assert len(mail.outbox) == 1
    import re
    body = mail.outbox[0].body
    match = re.search(r"Your verification code is: (\d+)", body)
    assert match is not None
    otp_code = match.group(1)
    
    # 2. Verify OTP
    response = api_client.post("/api/public/appointments/otp/verify/", {
        "email": email_addr,
        "purpose": "booking",
        "code": otp_code
    })
    assert response.status_code == status.HTTP_200_OK
    
    # 3. Try to book 4 times with the same phone (throttled at max 3 per phone per day)
    booking_payload = {
        "email": email_addr,
        "otp_code": otp_code,
        "customer_name": "Test Customer",
        "customer_phone": phone_num,
        "branch_id": branch_a.id,
        "service_id": service_a.id,
        "date": monday_date,
        "slot_time": "09:00:00",
        "captcha_token": "MOCK_CAPTCHA_TOKEN"
    }
    
    for i in range(3):
        res = api_client.post("/api/public/bookings/", booking_payload)
        assert res.status_code == status.HTTP_201_CREATED
        
    # The 4th booking should be throttled
    res = api_client.post("/api/public/bookings/", booking_payload)
    assert res.status_code == status.HTTP_400_BAD_REQUEST
    assert "booking limit exceeded" in res.data["error"]
