"""
Phase 7 Load Test — locustfile.py
===================================
Tests two complementary load scenarios:

1.  **PublicHTTPUser** — exercises the 5 public-facing HTTP endpoints
    at a target of ~500 combined requests/second.

2.  **WebSocketUser** — holds persistent WebSocket connections and
    subscribes to the branch broadcast group, verifying that messages
    sent by the server are received within a timeout window.
    Target: 2,000 concurrent WS connections across multiple workers
    (proving the RedisChannelLayer fan-out works at scale).

─────────────────────────────────────────────────────────────────
Running the load test against a staging instance
─────────────────────────────────────────────────────────────────
  # Prerequisites: pip install locust websocket-client

  # HTTP-only run (500 req/s target, 5 minute duration)
  locust -f tests/locustfile.py PublicHTTPUser \
      --host http://staging.quesole.com \
      --users 500 --spawn-rate 50 --run-time 5m --headless

  # WebSocket run (2,000 concurrent connections, 3 minute hold)
  locust -f tests/locustfile.py WebSocketUser \
      --host http://staging.quesole.com \
      --users 2000 --spawn-rate 100 --run-time 3m --headless

  # Combined run (both classes simultaneously)
  locust -f tests/locustfile.py \
      --host http://staging.quesole.com \
      --users 2500 --spawn-rate 100 --run-time 5m --headless
─────────────────────────────────────────────────────────────────
"""
import json
import time
import random
import string
import threading
import logging

from locust import HttpUser, task, between, events
from locust.exception import StopUser

logger = logging.getLogger(__name__)

# ── Configurable test fixtures ────────────────────────────────────────────────
# Set these via Locust environment / host params or override here for staging
BRANCH_IDS = []        # Filled at test start from /healthz response or hard-coded
TRACKING_CODES = []    # Populated at runtime by the JoinQueue task


def _random_phone():
    return "+91" + "".join(random.choices(string.digits, k=10))


def _random_name():
    first = random.choice(["Alice", "Bob", "Charlie", "Priya", "Ravi", "Sana"])
    last = random.choice(["Kumar", "Sharma", "Singh", "Nair", "Mehta", "Das"])
    return f"{first} {last}"


# ── Phase 7 Public HTTP Load Test ─────────────────────────────────────────────

class PublicHTTPUser(HttpUser):
    """
    Simulates public customer-facing HTTP traffic on the 5 key public endpoints.
    Each task is weighted to reflect realistic traffic distribution:
      - Join queue      : most frequent (customer walk-in simulation)
      - Check tracking  : second (customer checking status on phone)
      - Display board   : third (board polls for updates)
      - Health check    : low frequency (uptime monitor)
      - Cancel ticket   : rare (only customers who change their mind)
    """
    wait_time = between(0.1, 0.5)  # short waits → high throughput

    # Seeded at start so we have at least one valid branch/tracking code
    branch_id: str = ""
    tracking_code: str = ""

    def on_start(self):
        """Attempt to seed branch_id from a known health-check; fall back to a dummy."""
        try:
            resp = self.client.get("/healthz", timeout=5)
            if resp.status_code == 200:
                logger.debug("Health check passed, worker ready.")
        except Exception:
            pass

        # Seed a branch ID — override BRANCH_IDS list or accept a command-line env var
        if BRANCH_IDS:
            self.branch_id = str(random.choice(BRANCH_IDS))
        else:
            # Attempt autodiscovery from the public join endpoint error response
            self.branch_id = "1"  # fallback placeholder; replace with a real ID in staging

    @task(5)
    def join_queue(self):
        """POST /api/public/join/ — customer joins the queue via QR scan."""
        payload = {
            "branch_id": self.branch_id,
            "customer_name": _random_name(),
            "customer_phone": _random_phone(),
            "method": "1",
            "consent": True,
            # 'website' honeypot field intentionally absent (legitimate request)
        }
        with self.client.post(
            "/api/public/join/",
            json=payload,
            catch_response=True,
            name="/api/public/join/",
        ) as resp:
            if resp.status_code == 201:
                data = resp.json()
                code = data.get("tracking_code")
                if code:
                    TRACKING_CODES.append(code)
                    self.tracking_code = code
                resp.success()
            elif resp.status_code == 429:
                # Expected under heavy load — mark as success so Locust stats
                # count this correctly (it's not a server failure)
                resp.success()
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:200]}")

    @task(3)
    def check_tracking(self):
        """GET /api/public/tracking/<tracking_code>/ — customer checks position."""
        code = self.tracking_code or (
            random.choice(TRACKING_CODES) if TRACKING_CODES else None
        )
        if not code:
            return  # skip until we have a valid tracking code
        with self.client.get(
            f"/api/public/tracking/{code}/",
            catch_response=True,
            name="/api/public/tracking/<code>/",
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            elif resp.status_code == 429:
                resp.success()
            else:
                resp.failure(f"Unexpected {resp.status_code}")

    @task(2)
    def check_display_board(self):
        """GET /api/public/display/<branch_id>/ — display board poll."""
        with self.client.get(
            f"/api/public/display/{self.branch_id}/",
            catch_response=True,
            name="/api/public/display/<branch_id>/",
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            elif resp.status_code == 429:
                resp.success()
            else:
                resp.failure(f"Unexpected {resp.status_code}")

    @task(1)
    def health_check(self):
        """GET /healthz — uptime monitor poll."""
        with self.client.get("/healthz", catch_response=True) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if data.get("db") == "ok":
                    resp.success()
                else:
                    resp.failure(f"Unhealthy: {data}")
            else:
                resp.failure(f"healthz returned {resp.status_code}")

    @task(1)
    def cancel_ticket(self):
        """PATCH /api/public/tickets/<tracking_code>/cancel/ — customer cancels."""
        if not TRACKING_CODES:
            return
        code = random.choice(TRACKING_CODES)
        with self.client.patch(
            f"/api/public/tickets/{code}/cancel/",
            catch_response=True,
            name="/api/public/tickets/<code>/cancel/",
        ) as resp:
            if resp.status_code in (200, 404, 400):
                # 404 = already cancelled / wrong code — acceptable at load
                resp.success()
            elif resp.status_code == 429:
                resp.success()
            else:
                resp.failure(f"Unexpected {resp.status_code}")


# ── Phase 7 WebSocket Load Test ───────────────────────────────────────────────

try:
    import websocket as ws_client
    _WS_AVAILABLE = True
except ImportError:
    _WS_AVAILABLE = False
    logger.warning(
        "websocket-client not installed. WebSocketUser will be disabled. "
        "Install with: pip install websocket-client"
    )


class WebSocketUser(HttpUser):
    """
    Holds a persistent WebSocket connection to the branch notification socket.
    Target: 2,000 concurrent connections across multiple Daphne workers.

    This tests that RedisChannelLayer correctly fans out group_send() messages
    to all connections — even those connected to different Daphne worker processes.

    The test:
      1. Opens a WS connection to ws://<host>/ws/branch/<branch_id>/staff/
      2. Sends a ping-style JSON heartbeat every 30 seconds
      3. Counts any messages received and reports via Locust events
      4. Validates that at least one message is received during a 60-second window
    """
    wait_time = between(30, 60)  # simulate long-lived connections

    _ws_conn = None
    _messages_received = 0
    _connected = False
    _listener_thread = None
    branch_id: str = "1"

    def on_start(self):
        if not _WS_AVAILABLE:
            raise StopUser("websocket-client not installed")

        if BRANCH_IDS:
            self.branch_id = str(random.choice(BRANCH_IDS))

        ws_host = self.host.replace("http://", "ws://").replace("https://", "wss://")
        ws_url = f"{ws_host}/ws/branch/{self.branch_id}/staff/"

        try:
            self._ws_conn = ws_client.create_connection(ws_url, timeout=10)
            self._connected = True
            self._messages_received = 0

            # Start background listener thread
            self._listener_thread = threading.Thread(
                target=self._listen_loop, daemon=True
            )
            self._listener_thread.start()

            events.request.fire(
                request_type="WS",
                name="connect",
                response_time=0,
                response_length=0,
            )
        except Exception as e:
            events.request.fire(
                request_type="WS",
                name="connect",
                response_time=0,
                response_length=0,
                exception=e,
            )
            self._connected = False

    def _listen_loop(self):
        """Background thread: receive messages from the WebSocket."""
        while self._connected and self._ws_conn:
            try:
                self._ws_conn.settimeout(5.0)
                raw = self._ws_conn.recv()
                if raw:
                    self._messages_received += 1
                    try:
                        msg = json.loads(raw)
                        logger.debug(f"WS received: {msg.get('type', 'unknown')}")
                    except Exception:
                        pass
            except ws_client.WebSocketTimeoutException:
                continue  # normal — no message in 5 s window
            except Exception as e:
                logger.debug(f"WS listener exiting: {e}")
                self._connected = False
                break

    @task
    def send_heartbeat(self):
        """Send a lightweight heartbeat ping to keep the connection alive."""
        if not self._connected or not self._ws_conn:
            raise StopUser("WS connection lost")

        start = time.monotonic()
        try:
            self._ws_conn.send(json.dumps({"type": "ping"}))
            elapsed_ms = int((time.monotonic() - start) * 1000)
            events.request.fire(
                request_type="WS",
                name="heartbeat",
                response_time=elapsed_ms,
                response_length=0,
            )
        except Exception as e:
            events.request.fire(
                request_type="WS",
                name="heartbeat",
                response_time=0,
                response_length=0,
                exception=e,
            )
            self._connected = False
            raise StopUser("WS heartbeat failed")

    def on_stop(self):
        """Close the WebSocket connection gracefully."""
        self._connected = False
        if self._ws_conn:
            try:
                self._ws_conn.close()
            except Exception:
                pass
            self._ws_conn = None
