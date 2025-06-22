# instagram/asgi.py

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'instagram.settings')  # ✅ FIRST

import django
django.setup()  # ✅ SECOND — makes sure apps are ready

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import chat.routing  # ✅ after django.setup()

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
