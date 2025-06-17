# instagram/asgi.py

import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'instagram.settings')
django.setup()

# Now import routing (safe after setup)
import chat.routing

# This is the standard, correct setup.
# Django's get_asgi_application() will handle HTTP.
# The WhiteNoise middleware (which we'll add back) will intercept static files.
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})