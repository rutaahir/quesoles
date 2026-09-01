import hmac
import hashlib
import secrets
from django.conf import settings

def generate_tracking_code():
    # Generate secure, unguessable public tracking identifier
    return f"TKT-{secrets.token_urlsafe(16)}"

def blind_index(value):
    if not value:
        return ""
    # Normalize phone/string (strip whitespace and symbols if phone, but a simple strip is a baseline)
    normalized = str(value).strip().replace(" ", "").replace("-", "").replace("+", "")
    key = getattr(settings, "BLIND_INDEX_KEY", "default-key").encode("utf-8")
    h = hmac.new(key, normalized.encode("utf-8"), hashlib.sha256)
    # Return 32-char prefix to fit in database indexes cleanly
    return h.hexdigest()[:32]
