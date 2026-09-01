from django.urls import path
from core.consumers import EchoConsumer, QueueConsumer

websocket_urlpatterns = [
    path("ws/echo/", EchoConsumer.as_asgi()),
    path("ws/branch/<str:branch_id>/<str:client_type>/", QueueConsumer.as_asgi()),
]
