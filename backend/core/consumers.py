import json
from urllib.parse import parse_qs
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_str):
    try:
        access_token = AccessToken(token_str)
        user_id = access_token["user_id"]
        return User.objects.get(id=user_id)
    except Exception:
        return None

@database_sync_to_async
def validate_user_branch(user, branch_id):
    if user.role == "super_admin":
        return True
    if str(user.branch_id) == str(branch_id):
        return True
    if user.role == "company_admin":
        from branches.models import Branch
        return Branch.objects.filter(id=branch_id, company=user.company).exists()
    return False

class EchoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

    async def disconnect(self, close_code):
        pass

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message = data.get("message", "")
            await self.send(text_data=json.dumps({
                "echo": message
            }))
        except Exception:
            await self.send(text_data=json.dumps({
                "error": "Invalid JSON format"
            }))

class QueueConsumer(AsyncJsonWebsocketConsumer):
    @database_sync_to_async
    def verify_kiosk_session(self, kiosk_id, session_token):
        from kot.models import Kiosk
        try:
            kiosk = Kiosk.objects.get(id=kiosk_id, session_token=session_token, status="active")
            return kiosk.is_session_active()
        except Exception:
            return False

    @database_sync_to_async
    def update_kiosk_last_seen(self, kiosk_id, session_token):
        from kot.models import Kiosk
        from django.utils import timezone
        try:
            kiosk = Kiosk.objects.get(id=kiosk_id, session_token=session_token, status="active")
            kiosk.last_seen = timezone.now()
            kiosk.save()
        except Exception:
            pass

    @database_sync_to_async
    def clear_kiosk_session(self, kiosk_id, session_token):
        from kot.models import Kiosk
        try:
            kiosk = Kiosk.objects.get(id=kiosk_id, session_token=session_token)
            kiosk.session_token = None
            kiosk.connected_at = None
            kiosk.last_seen = None
            kiosk.save()
        except Exception:
            pass

    async def connect(self):
        self.branch_id = self.scope["url_route"]["kwargs"]["branch_id"]
        self.client_type = self.scope["url_route"]["kwargs"]["client_type"]
        self.group_name = f"branch_{self.branch_id}_{self.client_type}"

        # 1. Staff Authentication Gating
        if self.client_type == "staff":
            query_params = parse_qs(self.scope["query_string"].decode())
            token_list = query_params.get("token")
            if not token_list:
                await self.close(code=4003) # Missing token
                return

            token_str = token_list[0]
            user = await get_user_from_token(token_str)
            if not user:
                await self.close(code=4003) # Invalid token
                return

            # Verify tenant branch membership
            is_valid_member = await validate_user_branch(user, self.branch_id)
            if not is_valid_member:
                await self.close(code=4003) # Unauthorized branch
                return

            self.user = user

        # 2. Public / Guest Access (PII-free) or Kiosk Access
        elif self.client_type != "public":
            await self.close(code=4000) # Invalid client type
            return

        # Check for optional kiosk parameter in query params
        query_params = parse_qs(self.scope["query_string"].decode())
        kiosk_id_list = query_params.get("kiosk_id")
        session_token_list = query_params.get("session_token")

        if kiosk_id_list and session_token_list:
            kiosk_id = kiosk_id_list[0]
            session_token = session_token_list[0]
            
            is_valid = await self.verify_kiosk_session(kiosk_id, session_token)
            if not is_valid:
                await self.close(code=4003) # Unauthorized session
                return

            self.kiosk_id = kiosk_id
            self.session_token = session_token
            self.kiosk_group_name = f"kiosk_{kiosk_id}"
            await self.channel_layer.group_add(self.kiosk_group_name, self.channel_name)

        # Join the channels group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        if hasattr(self, "kiosk_group_name"):
            await self.channel_layer.group_discard(self.kiosk_group_name, self.channel_name)
            # Unclean logout: clear session
            if hasattr(self, "kiosk_id") and hasattr(self, "session_token"):
                await self.clear_kiosk_session(self.kiosk_id, self.session_token)

    async def receive_json(self, content, **kwargs):
        if content.get("type") == "heartbeat":
            if hasattr(self, "kiosk_id") and hasattr(self, "session_token"):
                await self.update_kiosk_last_seen(self.kiosk_id, self.session_token)
                await self.send_json({"type": "heartbeat_ack"})

    async def queue_update(self, event):
        # Broadcast message to client WebSocket
        await self.send_json(event)

    async def kiosk_force_logout(self, event):
        # Evict old connection if the new session token doesn't match ours
        new_token = event.get("session_token")
        if hasattr(self, "session_token") and self.session_token != new_token:
            await self.send_json({
                "type": "force_logout",
                "message": "This kiosk was opened on another screen"
            })
            await self.close(code=4003)
