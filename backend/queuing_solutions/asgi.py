import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'queuing_solutions.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
import queuing_solutions.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            queuing_solutions.routing.websocket_urlpatterns
        )
    ),
})
