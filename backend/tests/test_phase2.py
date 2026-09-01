import pytest
import threading
import concurrent.futures
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from queuing_solutions.asgi import application
from companies.models import Company
from billing.models import Package, Subscription
from queuing.models import Desk, Service, DeskService, Ticket, QueueMethod, QrCode
from audit.models import AuditLog

User = get_user_model()

@pytest.fixture
def active_package(db):
    return Package.objects.create(
        name="Enterprise Pack",
        max_branches=5,
        max_users=10,
        price_monthly=5000,
        price_yearly=50000,
        feature_flags={"method1": True, "method2": True, "method3": True},
        is_active=True
    )

@pytest.fixture
def company(db, active_package):
    co = Company.objects.create(
        name="Queuing Inc",
        industry="Retail",
        contact_email="billing@queuing.com",
        status="active",
        package=active_package
    )
    Subscription.objects.create(
        company=co,
        package=active_package,
        billing_cycle="monthly",
        start_date=timezone.now().date(),
        end_date=timezone.now().date() + timezone.timedelta(days=30),
        status="active"
    )
    return co

@pytest.fixture
def branch(company):
    return company.branches.create(name="Amd Central", slug="amd-central", city="Ahmedabad")

@pytest.fixture
def service(branch, company):
    return Service.objects.create(
        branch=branch,
        company=company,
        name="General Help",
        prefix="H",
        est_service_minutes=15
    )

@pytest.fixture
def desk(branch, company, service):
    d = Desk.objects.create(branch=branch, company=company, name="Counter 1", status="open")
    DeskService.objects.create(desk=d, service=service)
    return d

@pytest.fixture
def staff_user(db, company, branch):
    return User.objects.create_user(
        email="operator@queuing.com",
        password="SecureOperator123",
        role="desk_staff",
        company=company,
        branch=branch
    )

@pytest.fixture
def api_clients():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.mark.django_db
def test_ticket_lifecycle(api_clients, staff_user, desk, service, branch):
    # Create waiting ticket
    ticket = Ticket.objects.create(
        branch=branch,
        company=branch.company,
        service=service,
        token_number="H001",
        customer_name="Alice Brown",
        customer_phone="+919876543210",
        status="waiting"
    )
    
    # 1. Login as operator
    login_res = api_clients.post("/api/auth/login/", {"email": "operator@queuing.com", "password": "SecureOperator123"})
    token = login_res.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    
    # 2. Call next ticket
    call_res = api_clients.post("/api/tickets/call-next/", {"desk_id": desk.id})
    assert call_res.status_code == status.HTTP_200_OK
    assert call_res.data["id"] == ticket.id
    assert call_res.data["status"] == "called"
    
    # Verify DB state
    ticket.refresh_from_db()
    assert ticket.status == "called"
    assert ticket.called_at is not None
    assert ticket.served_by == staff_user
    
    # 3. Serve ticket
    serve_res = api_clients.post(f"/api/tickets/{ticket.id}/action/", {"action": "serve"})
    assert serve_res.status_code == status.HTTP_200_OK
    assert serve_res.data["status"] == "serving"
    
    ticket.refresh_from_db()
    assert ticket.status == "serving"
    assert ticket.served_at is not None
    
    # 4. Complete ticket
    comp_res = api_clients.post(f"/api/tickets/{ticket.id}/action/", {"action": "complete"})
    assert comp_res.status_code == status.HTTP_200_OK
    assert comp_res.data["status"] == "served"
    
    ticket.refresh_from_db()
    assert ticket.status == "served"
    assert ticket.closed_at is not None


@pytest.mark.django_db(transaction=True)
def test_concurrency_race_condition(active_package, company, branch, service, desk):
    # Seed exactly ONE waiting ticket
    ticket = Ticket.objects.create(
        branch=branch,
        company=company,
        service=service,
        token_number="H001",
        customer_name="Concur Guest",
        status="waiting"
    )
    
    # Create two desk staff operators
    op1 = User.objects.create_user(
        email="op1@queuing.com",
        password="SecurePassword123",
        role="desk_staff",
        company=company,
        branch=branch
    )
    op2 = User.objects.create_user(
        email="op2@queuing.com",
        password="SecurePassword123",
        role="desk_staff",
        company=company,
        branch=branch
    )
    
    from rest_framework.test import APIClient
    client1 = APIClient()
    client2 = APIClient()
    
    # Authenticate both clients
    tok1 = client1.post("/api/auth/login/", {"email": "op1@queuing.com", "password": "SecurePassword123"}).data["access"]
    tok2 = client2.post("/api/auth/login/", {"email": "op2@queuing.com", "password": "SecurePassword123"}).data["access"]
    client1.credentials(HTTP_AUTHORIZATION=f"Bearer {tok1}")
    client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tok2}")

    results = []

    def call_client(client, results_list):
        try:
            res = client.post("/api/tickets/call-next/", {"desk_id": desk.id})
            results_list.append(res)
        except Exception as e:
            results_list.append(e)

    # Dispatch simultaneous POST requests using threads
    t1 = threading.Thread(target=call_client, args=(client1, results))
    t2 = threading.Thread(target=call_client, args=(client2, results))
    
    t1.start()
    t2.start()
    t1.join()
    t2.join()
    
    # Assert responses
    status_codes = [r.status_code for r in results]
    assert status_codes == [200, 200]
    
    # Exactly one client must have obtained the ticket, the other must have received 'No visitors waiting'
    assigned_calls = [r for r in results if "id" in r.data]
    empty_calls = [r for r in results if isinstance(r.data.get("message"), str) and "No visitors" in r.data["message"]]
    
    assert len(assigned_calls) == 1
    assert len(empty_calls) == 1
    
    # Verify DB state: exactly one ticket has status 'called'
    ticket.refresh_from_db()
    assert ticket.status == "called"


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_pii_segregation(active_package, company, branch, service, staff_user):
    # Retrieve JWT for staff connect
    from rest_framework_simplejwt.tokens import RefreshToken
    token_str = await database_sync_to_async(lambda: str(RefreshToken.for_user(staff_user).access_token))()
    
    # 1. Connect Staff WebWebsocket (should succeed with valid token)
    staff_communicator = WebsocketCommunicator(
        application, f"/ws/branch/{branch.id}/staff/?token={token_str}"
    )
    connected_staff, _ = await staff_communicator.connect()
    assert connected_staff is True
    
    # 2. Connect Staff Websocket without token -> Should fail/close
    invalid_staff_comm = WebsocketCommunicator(
        application, f"/ws/branch/{branch.id}/staff/"
    )
    connected_fail, close_code = await invalid_staff_comm.connect()
    assert connected_fail is False
    assert close_code == 4003

    # 3. Connect Public Websocket (succeeds without auth)
    public_communicator = WebsocketCommunicator(
        application, f"/ws/branch/{branch.id}/public/"
    )
    connected_public, _ = await public_communicator.connect()
    assert connected_public is True

    # 4. Trigger queue broadcast from DB update
    ticket = await database_sync_to_async(Ticket.objects.create)(
        branch=branch,
        company=company,
        service=service,
        token_number="H002",
        customer_name="Secret Agent",
        customer_phone="+917777777777",
        message="Top Secret details",
        status="waiting"
    )
    
    # Broadcast manually or simulate view action
    from queuing.views import broadcast_queue_update
    await database_sync_to_async(broadcast_queue_update)(branch.id, ticket)

    # 5. Check Staff Group receives full payload (with PII)
    staff_msg = await staff_communicator.receive_json_from()
    assert staff_msg["event"] == "ticket_updated"
    assert staff_msg["data"]["customer_name"] == "Secret Agent"
    assert staff_msg["data"]["customer_phone"] == "+917777777777"
    assert staff_msg["data"]["message"] == "Top Secret details"

    # 6. Check Public Group receives PII-free payload (Omitted keys entirely)
    public_msg = await public_communicator.receive_json_from()
    assert public_msg["event"] == "ticket_updated"
    assert "customer_name" not in public_msg["data"]
    assert "customer_phone" not in public_msg["data"]
    assert "message" not in public_msg["data"]
    assert "note" not in public_msg["data"]
    
    # Clean up connections
    await staff_communicator.disconnect()
    await public_communicator.disconnect()


@pytest.mark.django_db
def test_method_gating(api_clients, company, branch):
    # Starter pack doesn't support Method 4 (Remote booking/OTP verification)
    package_limited = Package.objects.create(
        name="Starter Pack",
        max_branches=1,
        max_users=2,
        price_monthly=500,
        price_yearly=5000,
        feature_flags={"method1": True, "method2": True}, # No method4!
        is_active=True
    )
    company.package = package_limited
    company.save()

    # Create a branch admin user to perform the config change
    admin_user = User.objects.create_user(
        email="admin@queuing.com",
        password="SecureAdmin123",
        role="branch_admin",
        company=company,
        branch=branch
    )

    # Login as branch admin
    login_res = api_clients.post("/api/auth/login/", {"email": "admin@queuing.com", "password": "SecureAdmin123"})
    token = login_res.data["access"]
    api_clients.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    # Attempt to enable Method 4
    response = api_clients.post("/api/queue-methods/", {
        "method": "4",
        "is_enabled": True,
        "config": {}
    }, format="json")
    
    # Verify 403 Forbidden gating
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "not unlocked by your package" in response.data["detail"]


@pytest.mark.django_db
def test_anon_rate_limiting(api_clients, branch, service):
    # Enable Method 2 first
    QueueMethod.objects.create(
        branch=branch,
        company=branch.company,
        method="2",
        is_enabled=True,
        config={"numbering_style": "prefix"}
    )

    payload = {
        "branch_id": branch.id,
        "name": "Anon Spammer",
        "service_id": service.id,
        "method": "2",
        "consent": True
    }


    # Clear cache and set throttle rate directly
    from django.core.cache import cache
    cache.clear()
    from queuing.views import JoinQueueRateThrottle
    original_rate = getattr(JoinQueueRateThrottle, "rate", None)
    JoinQueueRateThrottle.rate = "5/minute"

    try:
        # First 5 requests should succeed
        for _ in range(5):
            res = api_clients.post("/api/public/join/", payload)
            assert res.status_code == status.HTTP_201_CREATED

        # 6th request should get 429 Throttle block
        res_throttle = api_clients.post("/api/public/join/", payload)
        assert res_throttle.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    finally:
        if original_rate is None:
            if hasattr(JoinQueueRateThrottle, "rate"):
                del JoinQueueRateThrottle.rate
        else:
            JoinQueueRateThrottle.rate = original_rate

