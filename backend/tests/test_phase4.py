import pytest
import secrets
import threading
import concurrent.futures
from datetime import datetime, timedelta, date
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from companies.models import Company
from billing.models import Package, Subscription
from branches.models import Branch
from queuing.models import Desk, Service, DeskService, Ticket, QueueMethod
from accounts.models import OTPVerification
from appointments.models import Appointment, AppointmentSlot
from kot.models import Printer, KotPrintJob

User = get_user_model()

@pytest.fixture
def test_setup(db):
    # 1. Package & Company
    pkg = Package.objects.create(
        name="Enterprise Plan",
        max_branches=10,
        max_users=20,
        price_monthly=10000,
        price_yearly=100000,
        feature_flags={"method1": True, "method2": True, "method3": True, "method4": True},
        is_active=True
    )
    
    company = Company.objects.create(
        name="Test Corp",
        industry="Health",
        contact_email="test@corp.com",
        status="active",
        package=pkg
    )
    
    Subscription.objects.create(
        company=company,
        package=pkg,
        billing_cycle="monthly",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timedelta(days=30),
        status="active"
    )

    # 2. Branch & Service & Desk
    branch = Branch.objects.create(
        company=company,
        name="Mumbai Main",
        slug="mumbai-main",
        city="Mumbai"
    )

    service = Service.objects.create(
        branch=branch,
        company=company,
        name="General Checkup",
        prefix="G",
        est_service_minutes=15
    )

    desk = Desk.objects.create(
        branch=branch,
        company=company,
        name="Counter 1",
        status="open"
    )
    DeskService.objects.create(desk=desk, service=service)

    # 3. Queue Methods (Method 1 and Method 4 enabled)
    QueueMethod.objects.create(
        company=company,
        branch=branch,
        method="1",
        is_enabled=True,
        config={}
    )
    QueueMethod.objects.create(
        company=company,
        branch=branch,
        method="4",
        is_enabled=True,
        config={}
    )

    # 4. Users
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

    # 5. Printer
    printer = Printer.objects.create(
        branch=branch,
        company=company,
        name="Receipt Printer 1",
        connection_type="network",
        last_status="online"
    )

    return {
        "company": company,
        "branch": branch,
        "service": service,
        "desk": desk,
        "branch_admin": branch_admin,
        "company_admin": company_admin,
        "printer": printer
    }

@pytest.mark.django_db
def test_otp_verification_flow(test_setup):
    client = APIClient()
    email_addr = "patient@test.com"

    # 1. Send OTP
    res_send = client.post("/api/public/appointments/otp/send/", {"email": email_addr})
    assert res_send.status_code == status.HTTP_200_OK

    # 2. Cooldown Rate-limiting check
    res_cooldown = client.post("/api/public/appointments/otp/send/", {"email": email_addr})
    assert res_cooldown.status_code == status.HTTP_400_BAD_REQUEST
    assert "cooldown" in res_cooldown.data["error"].lower() or "wait" in res_cooldown.data["error"].lower()

    # Get verification row from DB to retrieve code
    otp_record = OTPVerification.objects.filter(email=email_addr, purpose="booking").latest("created_at")
    
    # 3. Verify incorrect code
    res_verify_fail = client.post("/api/public/appointments/otp/verify/", {"email": email_addr, "code": "000000"})
    assert res_verify_fail.status_code == status.HTTP_400_BAD_REQUEST

    # Find the plaintext code sent in django outbox
    from django.core import mail
    assert len(mail.outbox) == 1
    sent_body = mail.outbox[0].body
    import re
    code_match = re.search(r"\b\d{6}\b", sent_body)
    assert code_match is not None
    otp_code = code_match.group()

    # 4. Verify expired verification
    otp_record.expires_at = timezone.now() - timedelta(seconds=1)
    otp_record.save()
    res_verify_exp = client.post("/api/public/appointments/otp/verify/", {"email": email_addr, "code": otp_code})
    assert res_verify_exp.status_code == status.HTTP_400_BAD_REQUEST

    # Re-request to test valid verification
    OTPVerification.objects.filter(email=email_addr).delete()
    client.post("/api/public/appointments/otp/send/", {"email": email_addr})
    otp_record = OTPVerification.objects.filter(email=email_addr, purpose="booking").latest("created_at")
    sent_body = mail.outbox[-1].body
    otp_code = re.search(r"\b\d{6}\b", sent_body).group()

    # 5. Verify correct code
    res_verify_ok = client.post("/api/public/appointments/otp/verify/", {"email": email_addr, "code": otp_code})
    assert res_verify_ok.status_code == status.HTTP_200_OK
    
    otp_record.refresh_from_db()
    assert otp_record.verified_at is not None

@pytest.mark.django_db(transaction=True)
def test_slot_capacity_and_concurrency(test_setup):
    branch = test_setup["branch"]
    service = test_setup["service"]
    email_addr = "buyer@test.com"

    # Create slot with capacity = 2
    slot_time = timezone.now() + timedelta(days=2, hours=10)
    slot_time = slot_time.replace(minute=0, second=0, microsecond=0)
    
    slot = AppointmentSlot.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        slot_start=slot_time,
        slot_end=slot_time + timedelta(minutes=15),
        capacity=2
    )

    # Set email as verified
    OTPVerification.objects.create(
        email=email_addr,
        otp_hash="mock",
        purpose="booking",
        expires_at=timezone.now() + timedelta(minutes=10),
        verified_at=timezone.now()
    )

    client = APIClient()

    # Book 1st slot
    payload = {
        "email": email_addr,
        "otp_code": "verified",
        "customer_name": "John Doe",
        "customer_phone": "9876543210",
        "branch_id": branch.id,
        "service_id": service.id,
        "slot_start": slot_time.isoformat(),
        "consent": True
    }
    res1 = client.post("/api/public/appointments/book/", payload)
    assert res1.status_code == status.HTTP_201_CREATED
    
    slot.refresh_from_db()
    assert slot.booked_count == 1

    # Book 2nd slot
    payload["customer_name"] = "Jane Doe"
    res2 = client.post("/api/public/appointments/book/", payload)
    assert res2.status_code == status.HTTP_201_CREATED

    slot.refresh_from_db()
    assert slot.booked_count == 2

    # Book 3rd slot (beyond capacity)
    payload["customer_name"] = "Jack Doe"
    res3 = client.post("/api/public/appointments/book/", payload)
    assert res3.status_code == status.HTTP_400_BAD_REQUEST
    assert "fully booked" in res3.data["error"]

    # Concurrency Lock Test:
    # Reset slot capacity = 1 and booked_count = 0
    slot.capacity = 1
    slot.booked_count = 0
    slot.save()

    results = []

    def attempt_concurrent_booking(name):
        c = APIClient()
        p = {
            "email": email_addr,
            "otp_code": "verified",
            "customer_name": name,
            "customer_phone": "9876543210",
            "branch_id": branch.id,
            "service_id": service.id,
            "slot_start": slot_time.isoformat(),
            "consent": True
        }
        res = c.post("/api/public/appointments/book/", p)
        results.append(res)

    t1 = threading.Thread(target=attempt_concurrent_booking, args=("Op A",))
    t2 = threading.Thread(target=attempt_concurrent_booking, args=("Op B",))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Verify that exactly one succeeds (201 Created) and the other fails (400 Bad Request)
    success_responses = [r for r in results if r.status_code == 201]
    fail_responses = [r for r in results if r.status_code == 400]
    
    assert len(success_responses) == 1
    assert len(fail_responses) == 1

    # Assert final database state: exactly 1 booked count
    slot.refresh_from_db()
    assert slot.booked_count == 1
    assert Appointment.objects.filter(
        slot_start=slot_time,
        status="booked",
        customer_name__in=["Op A", "Op B"]
    ).count() == 1

@pytest.mark.django_db
def test_appointment_reschedule_and_cancellation(test_setup):
    branch = test_setup["branch"]
    service = test_setup["service"]
    email_addr = "cancel@test.com"

    slot_time_1 = timezone.now() + timedelta(days=3, hours=10)
    slot_time_2 = timezone.now() + timedelta(days=3, hours=11)

    slot1 = AppointmentSlot.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        slot_start=slot_time_1,
        slot_end=slot_time_1 + timedelta(minutes=15),
        capacity=1
    )
    slot2 = AppointmentSlot.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        slot_start=slot_time_2,
        slot_end=slot_time_2 + timedelta(minutes=15),
        capacity=1
    )

    OTPVerification.objects.create(
        email=email_addr,
        otp_hash="mock",
        purpose="booking",
        expires_at=timezone.now() + timedelta(minutes=10),
        verified_at=timezone.now()
    )

    client = APIClient()
    payload = {
        "email": email_addr,
        "otp_code": "verified",
        "customer_name": "Bob Smith",
        "customer_phone": "9876543210",
        "branch_id": branch.id,
        "service_id": service.id,
        "slot_start": slot_time_1.isoformat(),
        "consent": True
    }
    res = client.post("/api/public/appointments/book/", payload)
    assert res.status_code == status.HTTP_201_CREATED
    manage_code = res.data["manage_code"]

    # 1. Retrieve Details
    res_get = client.get(f"/api/public/appointments/manage/{manage_code}/")
    assert res_get.status_code == status.HTTP_200_OK
    assert res_get.data["customer_name"] == "Bob Smith"

    # 2. Reschedule to Slot 2
    res_resched = client.post(
        f"/api/public/appointments/manage/{manage_code}/reschedule/",
        {"new_slot_start": slot_time_2.isoformat()}
    )
    assert res_resched.status_code == status.HTTP_200_OK
    
    # Assert database slot adjustments
    slot1.refresh_from_db()
    slot2.refresh_from_db()
    assert slot1.booked_count == 0
    assert slot2.booked_count == 1

    appt = Appointment.objects.get(manage_code=manage_code)
    assert appt.slot_start == slot_time_2

    # Assert matching Ticket updated
    ticket = Ticket.objects.get(
        branch=branch,
        service=service,
        customer_name="Bob Smith",
        source="booking"
    )
    assert ticket.scheduled_for == slot_time_2

    # 3. Cancel Appointment
    res_cancel = client.post(f"/api/public/appointments/manage/{manage_code}/cancel/")
    assert res_cancel.status_code == status.HTTP_200_OK

    # Assert final database states: status = cancelled, booked count decremented
    slot2.refresh_from_db()
    assert slot2.booked_count == 0

    appt.refresh_from_db()
    assert appt.status == "cancelled"

    ticket.refresh_from_db()
    assert ticket.status == "cancelled"

    # Verify no deletion has occurred
    assert Appointment.objects.filter(manage_code=manage_code).exists()
    assert Ticket.objects.filter(id=ticket.id).exists()

    # 4. Invalid/expired manage code rejected
    res_invalid = client.get("/api/public/appointments/manage/APPT-INVALIDCODE/")
    assert res_invalid.status_code == status.HTTP_404_NOT_FOUND

@pytest.mark.django_db
def test_prioritized_unified_queue(test_setup):
    branch = test_setup["branch"]
    service = test_setup["service"]
    desk = test_setup["desk"]

    client = APIClient()
    client.force_authenticate(user=test_setup["branch_admin"])

    now = timezone.now()

    # 1. Walk-in QR Ticket (Created 10 mins ago)
    t_qr = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        method="2",
        token_number="G001",
        customer_name="QR Walkin",
        source="qr",
        status="waiting"
    )
    Ticket.objects.filter(id=t_qr.id).update(created_at=now - timedelta(minutes=10))

    # 2. Kiosk Ticket (Created 5 mins ago)
    t_kiosk = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        method="1",
        token_number="G002",
        customer_name="Kiosk Guest",
        source="kiosk",
        status="waiting"
    )
    Ticket.objects.filter(id=t_kiosk.id).update(created_at=now - timedelta(minutes=5))

    # 3. Appointment Ticket (Active: scheduled for 8 mins ago)
    t_appt_active = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        method="4",
        token_number="G003",
        customer_name="Active Appointment",
        source="booking",
        scheduled_for=now - timedelta(minutes=8),
        status="waiting"
    )
    Ticket.objects.filter(id=t_appt_active.id).update(created_at=now - timedelta(minutes=20))

    # 4. Appointment Ticket (Future: scheduled for 10 mins from now)
    t_appt_future = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        method="4",
        token_number="G004",
        customer_name="Future Appointment",
        source="booking",
        scheduled_for=now + timedelta(minutes=10),
        status="waiting"
    )
    Ticket.objects.filter(id=t_appt_future.id).update(created_at=now - timedelta(minutes=20))

    # Fetch queue from TicketViewSet list
    res_list = client.get("/api/tickets/")
    assert res_list.status_code == 200
    
    # Assert future appointment is HIDDEN from the list
    ids = [t["id"] for t in res_list.data]
    assert t_appt_future.id not in ids
    assert t_qr.id in ids
    assert t_kiosk.id in ids
    assert t_appt_active.id in ids

    # Assert correct prioritization order in unified queue:
    # 1. QR Walkin (priority_time = now - 10m)
    # 2. Active Appointment (priority_time = now - 8m)
    # 3. Kiosk Guest (priority_time = now - 5m)
    assert ids[0] == t_qr.id
    assert ids[1] == t_appt_active.id
    assert ids[2] == t_kiosk.id

    # Call Next calls the highest priority waiting ticket (QR Walkin)
    res_call1 = client.post("/api/tickets/call-next/", {"desk_id": desk.id})
    assert res_call1.status_code == 200
    assert res_call1.data["id"] == t_qr.id

    # Second Call Next calls the next priority ticket (Active Appointment)
    res_call2 = client.post("/api/tickets/call-next/", {"desk_id": desk.id})
    assert res_call2.status_code == 200
    assert res_call2.data["id"] == t_appt_active.id

@pytest.mark.django_db
def test_printer_jobs_polling_and_authentication(test_setup):
    printer = test_setup["printer"]
    branch = test_setup["branch"]
    service = test_setup["service"]

    # Generate a print job
    ticket = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        method="1",
        token_number="K101",
        customer_name="Kiosk Patron",
        source="kiosk",
        status="waiting"
    )
    
    job = KotPrintJob.objects.create(
        ticket=ticket,
        printer=printer,
        status="queued"
    )

    client = APIClient()

    # 1. Poll without token authorization -> fails (401)
    res_unauth = client.get("/api/printers/jobs/pending/")
    assert res_unauth.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Poll with invalid token -> fails (401)
    client.credentials(HTTP_AUTHORIZATION="PrinterToken invalidtokenhex123")
    res_invalid = client.get("/api/printers/jobs/pending/")
    assert res_invalid.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Poll with valid token -> succeeds (200)
    client.credentials(HTTP_AUTHORIZATION=f"PrinterToken {printer.token}")
    res_ok = client.get("/api/printers/jobs/pending/")
    assert res_ok.status_code == status.HTTP_200_OK
    assert len(res_ok.data) == 1
    assert res_ok.data[0]["ticket_number"] == "K101"
    assert "ESC_POS_RAW" in res_ok.data[0]["escpos_payload"]

    # 4. Mark printed with correct authentication -> succeeds (200)
    res_comp = client.post(f"/api/printers/jobs/{job.id}/complete/")
    assert res_comp.status_code == status.HTTP_200_OK
    
    job.refresh_from_db()
    assert job.status == "printed"
    assert job.printed_at is not None
