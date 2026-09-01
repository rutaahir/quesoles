"""
Phase 7 — Hardening & Launch Readiness Tests
=============================================
Covers:
  1.  Rate limiting — 429 after threshold on public endpoints
  2.  Honeypot validation — 400 on filled honeypot field
  3.  Consent check — 400 when consent omitted from join/booking
  4.  Encryption at rest — phone stored as ciphertext; blind-index enables lookup
  5.  Tracking-code isolation — display board does NOT expose tracking_code
  6.  Audit log viewer — access tiers (super_admin / company_admin / branch_admin)
  7.  /healthz — returns 200 with healthy status in test environment
  8.  PII purge task — nulls out phone/name on expired completed tickets
  9.  Backup task — creates a .gz file and writes an audit log entry
  10. WebSocket group broadcast — message sent to group is received by all members
  11. Public ticket cancel — cancels ticket + synced appointment slot decrement
  12. Cancel via tracking_code — correct 404 for wrong code / 200 for valid
  13. OTP verification — email path is used; phone field is unused/empty
"""
import io
import os
import pytest
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch, MagicMock
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from billing.models import Package
from companies.models import Company
from branches.models import Branch
from queuing.models import Ticket, Service
from appointments.models import Appointment, AppointmentSlot
from audit.models import AuditLog
from core.crypto import blind_index, generate_tracking_code
from django.test import override_settings

User = get_user_model()




# ─────────────────────────────────────────────────────────────────────────────
# Shared fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def base_data(db):
    pkg = Package.objects.create(
        name="Test Package P7",
        max_branches=5,
        max_users=10,
        price_monthly=50.00,
        price_yearly=500.00,
        feature_flags={"method1": True, "method3": True},
        is_active=True,
    )
    company = Company.objects.create(
        name="Phase7 Co",
        industry="Tech",
        contact_email="admin@p7.com",
        status="active",
        package=pkg,
    )
    branch = Branch.objects.create(
        company=company,
        name="P7 Branch",
        slug="p7-branch",
        address="1 Main St",
        city="Testville",
    )
    super_admin = User.objects.create_user(
        email="sa@quesole.com", password="SApass123", role="super_admin"
    )
    company_admin = User.objects.create_user(
        email="admin@p7.com", password="Adminpass123", role="company_admin", company=company
    )
    branch_admin = User.objects.create_user(
        email="branch@p7.com", password="Branchpass123", role="branch_admin",
        company=company, branch=branch
    )
    service = Service.objects.create(
        branch=branch, company=company, name="Consultation", prefix="C", est_service_minutes=10
    )
    return {
        "pkg": pkg, "company": company, "branch": branch,
        "super_admin": super_admin, "company_admin": company_admin,
        "branch_admin": branch_admin, "service": service,
    }


def _password_for(user):
    if user.role == "super_admin":
        return "SApass123"
    if user.role == "company_admin":
        return "Adminpass123"
    return "Branchpass123"


def auth_client(user):
    client = APIClient()
    resp = client.post("/api/auth/login/", {"email": user.email, "password": _password_for(user)})
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return client


# ─────────────────────────────────────────────────────────────────────────────
# Test 1 — Rate limiting returns 429 after threshold
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_rate_limiting_join_queue_429(base_data):
    """
    PublicJoinQueueView is guarded by JoinQueueRateThrottle (subclass of PublicSubmitThrottle).
    We hit it N+1 times to verify 429 block without mocking.
    """
    branch = base_data["branch"]
    client = APIClient()

    # Clear cache and set throttle rate directly on the throttle class
    from django.core.cache import cache
    cache.clear()
    from queuing.views import JoinQueueRateThrottle
    original_rate = getattr(JoinQueueRateThrottle, "rate", None)
    JoinQueueRateThrottle.rate = "5/minute"

    payload = {
        "branch_id": str(branch.id),
        "customer_name": "Throttle Test",
        "customer_phone": "+919999900000",
        "method": "1",
        "consent": True,
    }

    try:
        # First 5 requests should not be blocked by rate limiting (though they may return 201 or 400, but not 429)
        for i in range(5):
            resp = client.post("/api/public/join/", payload)
            assert resp.status_code != status.HTTP_429_TOO_MANY_REQUESTS, f"Request {i+1} got 429 prematurely"

        # 6th request should get 429 Too Many Requests
        resp_6 = client.post("/api/public/join/", payload)
        assert resp_6.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    finally:
        if original_rate is None:
            if hasattr(JoinQueueRateThrottle, "rate"):
                del JoinQueueRateThrottle.rate
        else:
            JoinQueueRateThrottle.rate = original_rate




# ─────────────────────────────────────────────────────────────────────────────
# Test 2 — Honeypot validation rejects bots
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_honeypot_rejects_filled_field(base_data):
    """A non-empty 'website' honeypot field must return 400."""
    branch = base_data["branch"]
    client = APIClient()
    resp = client.post("/api/public/join/", {
        "branch_id": str(branch.id),
        "customer_name": "Bot",
        "customer_phone": "+919999911111",
        "method": "1",
        "consent": True,
        "website": "http://spam.example.com",  # honeypot filled
    })
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────────────────────────────
# Test 3 — Consent check
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_join_queue_requires_consent(base_data):
    """Joining without consent=True should return 400."""
    branch = base_data["branch"]
    client = APIClient()
    resp = client.post("/api/public/join/", {
        "branch_id": str(branch.id),
        "customer_name": "No Consent",
        "customer_phone": "+919999933333",
        "method": "1",
        # 'consent' deliberately absent
    })
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


# ─────────────────────────────────────────────────────────────────────────────
# Test 4 — Encryption at rest and blind-index lookup
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_phone_stored_encrypted_and_blind_index_lookup(base_data):
    """
    customer_phone is encrypted at rest via EncryptedCharField.
    The blind index column enables exact-match lookups without decryption.
    """
    branch = base_data["branch"]
    plain_phone = "+919876543210"

    ticket = Ticket.objects.create(
        branch=branch,
        company=base_data["company"],
        method="1",
        token_number="ENC001",
        customer_name="Enc Test",
        customer_phone=plain_phone,
        source="qr",
        status="waiting",
    )
    ticket.refresh_from_db()

    # Field descriptor decrypts transparently
    assert ticket.customer_phone == plain_phone

    # Blind-index lookup must work for exact match search
    index_val = blind_index(plain_phone)
    assert ticket.customer_phone_index == index_val

    found = Ticket.objects.filter(customer_phone_index=index_val).first()
    assert found is not None
    assert found.id == ticket.id


# ─────────────────────────────────────────────────────────────────────────────
# Test 5 — Display board does NOT expose tracking_code
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_display_board_omits_tracking_code(base_data):
    """
    The public display board must not leak tracking_code in its payload —
    preventing bystander-cancel enumeration attacks.
    """
    branch = base_data["branch"]
    Ticket.objects.create(
        branch=branch, company=base_data["company"],
        method="3", token_number="D001",
        customer_name="Display Test", source="qr", status="waiting",
    )
    client = APIClient()
    resp = client.get(f"/api/public/display/{branch.id}/")
    assert resp.status_code == status.HTTP_200_OK

    def assert_no_tracking_code(data):
        if isinstance(data, dict):
            assert "tracking_code" not in data, \
                f"tracking_code must not appear in display board payload, found in: {data}"
            for v in data.values():
                assert_no_tracking_code(v)
        elif isinstance(data, list):
            for item in data:
                assert_no_tracking_code(item)

    assert_no_tracking_code(resp.data)


# ─────────────────────────────────────────────────────────────────────────────
# Test 6 — Audit log viewer access tiers
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_audit_log_super_admin_sees_all(base_data):
    """Super Admin gets all audit logs across all companies."""
    other_company = Company.objects.create(
        name="Other Co", industry="Health", contact_email="admin@other.com",
        status="active", package=base_data["pkg"]
    )
    AuditLog.all_objects.create(
        company=base_data["company"], action="p7_sa_action", object_type="Test"
    )
    AuditLog.all_objects.create(
        company=other_company, action="p7_other_action", object_type="Test"
    )

    client = auth_client(base_data["super_admin"])
    resp = client.get("/api/audit-logs/")
    assert resp.status_code == status.HTTP_200_OK
    actions = [e["action"] for e in resp.data]
    assert "p7_sa_action" in actions
    assert "p7_other_action" in actions


@pytest.mark.django_db
def test_audit_log_company_admin_sees_own_company_only(base_data):
    """Company Admin sees only logs for their company."""
    rival_company = Company.objects.create(
        name="Rival Co", industry="Finance", contact_email="admin@rival.com",
        status="active", package=base_data["pkg"]
    )
    AuditLog.all_objects.create(
        company=base_data["company"], action="own_company_action", object_type="Test"
    )
    AuditLog.all_objects.create(
        company=rival_company, action="rival_company_action", object_type="Test"
    )

    client = auth_client(base_data["company_admin"])
    resp = client.get("/api/audit-logs/")
    assert resp.status_code == status.HTTP_200_OK
    actions = [e["action"] for e in resp.data]
    assert "own_company_action" in actions
    assert "rival_company_action" not in actions


@pytest.mark.django_db
def test_audit_log_branch_admin_sees_own_branch_only(base_data):
    """Branch Admin sees only logs for their own branch."""
    branch = base_data["branch"]
    other_branch = Branch.objects.create(
        company=base_data["company"], name="Other Branch", slug="other-branch",
        address="2 Side St", city="Othertown"
    )
    AuditLog.all_objects.create(
        company=base_data["company"], branch=branch,
        action="own_branch_action", object_type="Test"
    )
    AuditLog.all_objects.create(
        company=base_data["company"], branch=other_branch,
        action="other_branch_action", object_type="Test"
    )

    client = auth_client(base_data["branch_admin"])
    resp = client.get("/api/audit-logs/")
    assert resp.status_code == status.HTTP_200_OK
    actions = [e["action"] for e in resp.data]
    assert "own_branch_action" in actions
    assert "other_branch_action" not in actions


# ─────────────────────────────────────────────────────────────────────────────
# Test 7 — /healthz returns 200 in test environment
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_healthz_returns_200():
    """
    /healthz probes DB, cache (Redis), and Celery workers.
    Redis and Celery control.ping patched for CI.
    """
    client = APIClient()
    from queuing_solutions.celery import app
    with patch("django.core.cache.cache.set", return_value=True), \
         patch("django.core.cache.cache.get", return_value="ok"), \
         patch.object(app.control, "ping", return_value=["pong"]):
        resp = client.get("/healthz")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.json()
    assert data.get("status") == "healthy"
    assert data.get("database") == "connected"
    assert data.get("redis") == "connected"
    assert data.get("celery") == "connected"


@pytest.mark.django_db
def test_healthz_returns_503_when_database_down():
    """If DB is down, healthz must return 503."""
    client = APIClient()
    from queuing_solutions.celery import app
    with patch("django.db.connection.cursor", side_effect=Exception("Database Down")), \
         patch("django.core.cache.cache.set", return_value=True), \
         patch("django.core.cache.cache.get", return_value="ok"), \
         patch.object(app.control, "ping", return_value=["pong"]):
        resp = client.get("/healthz")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    data = resp.json()
    assert data.get("status") == "unhealthy"
    assert "error" in data.get("database")


@pytest.mark.django_db
def test_healthz_returns_503_when_redis_down():
    """If Redis is down, healthz must return 503."""
    client = APIClient()
    from queuing_solutions.celery import app
    with patch("django.core.cache.cache.set", side_effect=Exception("Redis Down")), \
         patch.object(app.control, "ping", return_value=["pong"]):
        resp = client.get("/healthz")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    data = resp.json()
    assert data.get("status") == "unhealthy"
    assert "error" in data.get("redis")


@pytest.mark.django_db
def test_healthz_returns_503_when_celery_down():
    """If Celery is down, healthz must return 503."""
    client = APIClient()
    from queuing_solutions.celery import app
    with patch("django.core.cache.cache.set", return_value=True), \
         patch("django.core.cache.cache.get", return_value="ok"), \
         patch.object(app.control, "ping", return_value=None):
        resp = client.get("/healthz")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    data = resp.json()
    assert data.get("status") == "unhealthy"
    assert data.get("celery") == "no_workers_found"




# ─────────────────────────────────────────────────────────────────────────────
# Test 8 — PII purge Celery task
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_pii_purge_task_nulls_expired_tickets(base_data):
    """
    Tickets older than retention window with terminal status should have their
    customer PII cleared by the purge task.
    """
    from core.tasks import purge_expired_customer_pii
    from django.conf import settings

    branch = base_data["branch"]
    old_date = timezone.now() - timedelta(days=settings.CUSTOMER_PII_RETENTION_DAYS + 1)

    # Old served ticket — should be purged
    old_ticket = Ticket.objects.create(
        branch=branch, company=base_data["company"],
        method="1", token_number="PURGE001",
        customer_name="Old Customer", customer_phone="+910000000001",
        source="qr", status="served",
    )
    Ticket.all_objects.filter(id=old_ticket.id).update(created_at=old_date)

    # Recent ticket — must NOT be purged
    recent_ticket = Ticket.objects.create(
        branch=branch, company=base_data["company"],
        method="1", token_number="PURGE002",
        customer_name="Recent Customer", customer_phone="+910000000002",
        source="qr", status="served",
    )

    purge_expired_customer_pii()

    old_ticket.refresh_from_db()
    assert old_ticket.customer_name == ""
    assert old_ticket.customer_phone is None

    recent_ticket.refresh_from_db()
    assert recent_ticket.customer_name == "Recent Customer"

    assert AuditLog.all_objects.filter(action="expired_pii_purged").exists()


# ─────────────────────────────────────────────────────────────────────────────
# Test 9 — Backup task creates a .gz file and writes audit log
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_backup_task_creates_file_and_audit_log(tmp_path):
    """
    run_mysql_backup should produce a .sql.gz backup file and write an
    audit log entry with action='database_backup_executed'.
    """
    from core.backup import run_mysql_backup
    from django.conf import settings

    with patch.object(settings, "BASE_DIR", tmp_path):
        with patch("subprocess.run", side_effect=FileNotFoundError("mysqldump not found in CI")):
            result = run_mysql_backup()

    assert result.endswith(".gz")
    assert os.path.isfile(result)

    audit = AuditLog.all_objects.filter(action="database_backup_executed").last()
    assert audit is not None
    assert audit.changes.get("success") is True


# ─────────────────────────────────────────────────────────────────────────────
# Test 10 — WebSocket group broadcast round-trip
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_redis_broadcast(settings):
    """
    Verify that group_send -> group_receive delivers messages to all group members
    using the WebsocketCommunicator against InMemoryChannelLayer.
    """
    pytest.importorskip("channels")
    settings.CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
    from channels import layers as _cl_module
    _cl_module.channel_layers.backends = {}  # clear cached layers

    from queuing_solutions.asgi import application
    from channels.testing import WebsocketCommunicator

    branch_id = "test-branch-mem-broadcast"
    comm1 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")
    comm2 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")

    connected1, _ = await comm1.connect()
    connected2, _ = await comm2.connect()

    assert connected1 is True
    assert connected2 is True

    from channels.layers import get_channel_layer
    layer = get_channel_layer()
    group_name = f"branch_{branch_id}_public"

    await layer.group_send(
        group_name,
        {
            "type": "queue.update",
            "data": {"test_key": "broadcast_value"}
        }
    )

    msg1 = await comm1.receive_json_from()
    msg2 = await comm2.receive_json_from()

    assert msg1["data"]["test_key"] == "broadcast_value"
    assert msg2["data"]["test_key"] == "broadcast_value"

    await comm1.disconnect()
    await comm2.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_redis_broadcast_fakeredis(settings):
    """
    Verify that group_send -> group_receive delivers messages to all group members
    using RedisChannelLayer backed by fakeredis.aioredis.
    """
    print("[FAKEREDIS] Executing WebSocket broadcast test using FakeRedis mock layer.")
    import fakeredis.aioredis
    fake_redis = fakeredis.aioredis.FakeRedis()
    
    with patch("redis.asyncio.Redis", return_value=fake_redis), \
         patch("redis.asyncio.from_url", return_value=fake_redis):
         
        settings.CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {
                    "hosts": [("127.0.0.1", 6379)],
                },
            }
        }

        from channels import layers as _cl_module
        _cl_module.channel_layers.backends = {}  # clear cached layers

        from queuing_solutions.asgi import application
        from channels.testing import WebsocketCommunicator
        
        branch_id = "test-branch-fakeredis-broadcast"
        comm1 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")
        comm2 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")

        connected1, _ = await comm1.connect()
        connected2, _ = await comm2.connect()
        
        assert connected1 is True
        assert connected2 is True

        from channels.layers import get_channel_layer
        layer = get_channel_layer()
        group_name = f"branch_{branch_id}_public"
        
        await layer.group_send(
            group_name,
            {
                "type": "queue.update",
                "data": {"test_key": "fake_redis_broadcast_value"}
            }
        )

        msg1 = await comm1.receive_json_from()
        msg2 = await comm2.receive_json_from()

        assert msg1["data"]["test_key"] == "fake_redis_broadcast_value"
        assert msg2["data"]["test_key"] == "fake_redis_broadcast_value"

        await comm1.disconnect()
        await comm2.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_redis_broadcast_real_redis(settings):
    """
    Verify that group_send -> group_receive delivers messages to all group members
    using a real RedisChannelLayer backend over a TCP socket.
    
    Strictly skips if real Redis is unavailable on port 6379.
    """
    import redis
    try:
        r = redis.Redis(host='127.0.0.1', port=6379)
        r.ping()
    except Exception as e:
        pytest.skip(f"Skipping test: Real Redis is not running on 127.0.0.1:6379. Error: {e}")

    print("[REAL REDIS] Executing WebSocket broadcast test against active local redis-server daemon.")
    
    settings.CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [("127.0.0.1", 6379)],
            },
        }
    }

    from channels import layers as _cl_module
    _cl_module.channel_layers.backends = {}  # clear cached layers

    from queuing_solutions.asgi import application
    from channels.testing import WebsocketCommunicator
    
    branch_id = "test-branch-real-redis-broadcast"
    comm1 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")
    comm2 = WebsocketCommunicator(application, f"/ws/branch/{branch_id}/public/")

    connected1, _ = await comm1.connect()
    connected2, _ = await comm2.connect()
    
    assert connected1 is True
    assert connected2 is True

    from channels.layers import get_channel_layer
    layer = get_channel_layer()
    group_name = f"branch_{branch_id}_public"
    
    await layer.group_send(
        group_name,
        {
            "type": "queue.update",
            "data": {"test_key": "real_redis_broadcast_value"}
        }
    )

    msg1 = await comm1.receive_json_from()
    msg2 = await comm2.receive_json_from()

    assert msg1["data"]["test_key"] == "real_redis_broadcast_value"
    assert msg2["data"]["test_key"] == "real_redis_broadcast_value"

    await comm1.disconnect()
    await comm2.disconnect()




# ─────────────────────────────────────────────────────────────────────────────
# Test 11 — Public ticket cancel (all scenarios)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_public_ticket_cancel_valid_tracking_code(base_data):
    """Valid tracking code cancels the ticket and returns 200."""
    branch = base_data["branch"]
    ticket = Ticket.objects.create(
        branch=branch, company=base_data["company"],
        method="1", token_number="CX001",
        customer_name="Cancel Me", source="qr", status="waiting",
    )
    client = APIClient()
    resp = client.patch(f"/api/public/tickets/{ticket.tracking_code}/cancel/")
    assert resp.status_code == status.HTTP_200_OK

    ticket.refresh_from_db()
    assert ticket.status == "cancelled"


@pytest.mark.django_db
def test_public_ticket_cancel_wrong_code_returns_404(base_data):
    """An invalid/unknown tracking code must return 404."""
    client = APIClient()
    resp = client.patch("/api/public/tickets/TOTALLY-FAKE-CODE-XYZ/cancel/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_public_ticket_cancel_syncs_appointment(base_data):
    """
    Cancelling a booking-sourced ticket must cancel the linked Appointment
    and decrement AppointmentSlot.booked_count atomically.
    """
    branch = base_data["branch"]
    service = base_data["service"]
    company = base_data["company"]

    slot_start = timezone.now() + timedelta(days=1)
    slot_end = slot_start + timedelta(minutes=15)

    slot = AppointmentSlot.objects.create(
        branch=branch,
        company=company,
        service=service,
        slot_start=slot_start,
        slot_end=slot_end,
        capacity=3,
        booked_count=1,
    )
    appointment = Appointment.objects.create(
        branch=branch,
        company=company,
        service=service,
        customer_name="Booking Customer",
        customer_phone="+919876543211",
        slot_start=slot_start,
        slot_end=slot_end,
        status="booked",
        manage_code="APPT-test-cancel-sync",
    )
    ticket = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        method="1",
        token_number="CX002",
        customer_name="Booking Customer",
        source="booking",
        scheduled_for=slot_start,
        status="waiting",
    )

    client = APIClient()
    resp = client.patch(f"/api/public/tickets/{ticket.tracking_code}/cancel/")
    assert resp.status_code == status.HTTP_200_OK

    ticket.refresh_from_db()
    appointment.refresh_from_db()
    slot.refresh_from_db()

    assert ticket.status == "cancelled"
    assert appointment.status == "cancelled"
    assert slot.booked_count == 0


@pytest.mark.django_db
def test_public_ticket_cancel_non_booking_leaves_appointment_untouched(base_data):
    """
    Cancelling a ticket with source != "booking" (e.g. source="qr")
    leaves any appointment with matching name/slot completely untouched.
    """
    branch = base_data["branch"]
    service = base_data["service"]
    company = base_data["company"]

    slot_start = timezone.now() + timedelta(days=1)
    slot_end = slot_start + timedelta(minutes=15)

    slot = AppointmentSlot.objects.create(
        branch=branch,
        company=company,
        service=service,
        slot_start=slot_start,
        slot_end=slot_end,
        capacity=3,
        booked_count=1,
    )
    appointment = Appointment.objects.create(
        branch=branch,
        company=company,
        service=service,
        customer_name="Booking Customer",
        customer_phone="+919876543211",
        slot_start=slot_start,
        slot_end=slot_end,
        status="booked",
        manage_code="APPT-test-cancel-sync-2",
    )
    ticket = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        method="1",
        token_number="CX003",
        customer_name="Booking Customer",
        source="qr",  # not booking
        scheduled_for=slot_start,
        status="waiting",
    )

    client = APIClient()
    resp = client.patch(f"/api/public/tickets/{ticket.tracking_code}/cancel/")
    assert resp.status_code == status.HTTP_200_OK

    ticket.refresh_from_db()
    appointment.refresh_from_db()
    slot.refresh_from_db()

    assert ticket.status == "cancelled"
    assert appointment.status == "booked"
    assert slot.booked_count == 1


# ─────────────────────────────────────────────────────────────────────────────

# Test 12 — Tracking endpoint uses tracking_code
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_tracking_view_by_tracking_code(base_data):
    """
    PublicTrackingView must respond to /api/public/tracking/<tracking_code>/
    and must NOT include tracking_code in the response payload.
    """
    branch = base_data["branch"]
    ticket = Ticket.objects.create(
        branch=branch, company=base_data["company"],
        method="1", token_number="TRK001",
        customer_name="Track Me", source="qr", status="waiting",
    )
    client = APIClient()
    resp = client.get(f"/api/public/tracking/{ticket.tracking_code}/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data.get("status") == "waiting"
    # tracking_code must be stripped so bystanders cannot use it to cancel
    assert "tracking_code" not in resp.data


# ─────────────────────────────────────────────────────────────────────────────
# Test 13 — OTP verification uses email, phone field unused
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_otp_verification_email_used_phone_null():
    """
    Per the approved email-OTP-everywhere decision: OTPVerification.phone
    is an unused schema column. Creating an OTPVerification with only email
    should succeed and phone should remain null/blank.
    """
    from accounts.models import OTPVerification

    from django.contrib.auth.hashers import make_password
    otp = OTPVerification.objects.create(
        email="otp_p7_test@quesole.com",
        otp_hash=make_password("654321"),
        expires_at=timezone.now() + timedelta(minutes=10),
        # phone deliberately omitted
    )
    otp.refresh_from_db()
    assert otp.email == "otp_p7_test@quesole.com"
    # phone is either None or empty string — either is acceptable
    assert not otp.phone


# ─────────────────────────────────────────────────────────────────────────────
# Test 14 — CSRF Scoping validation
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.django_db
def test_csrf_scoping_enforces_on_admin_views():
    """An unauthenticated POST without a CSRF token to /admin/ must return exactly 403."""
    client = APIClient(enforce_csrf_checks=True)
    resp = client.post("/admin/login/", {})
    assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_csrf_scoping_exempts_jwt_endpoints(base_data):
    """Stateless JWT endpoints must be exempt from CSRF checks."""
    client = APIClient(enforce_csrf_checks=True)
    user = base_data["branch_admin"]
    login_resp = client.post("/api/auth/login/", {"email": user.email, "password": "Branchpass123"})
    assert login_resp.status_code == status.HTTP_200_OK
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_resp.data['access']}")
    
    # Hit a state-mutating JWT endpoint without CSRF token: should NOT return 403
    resp = client.post("/api/tickets/call-next/", {"desk_id": 9999})
    assert resp.status_code != status.HTTP_403_FORBIDDEN

