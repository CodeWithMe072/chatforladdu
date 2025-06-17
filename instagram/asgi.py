# instagram/asgi.py

import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from django.conf import settings
from whitenoise import WhiteNoise # <--- Import WhiteNoise

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'instagram.settings')
django.setup()

# Import your routing after django.setup()
import chat.routing

# Create the base Django HTTP application
http_application = get_asgi_application()

# Wrap the HTTP application with WhiteNoise
# This will serve static files from your STATIC_ROOT
# It uses the STATIC_ROOT path you defined in settings.py
application_with_static_files = WhiteNoise(http_application, root=settings.STATIC_ROOT)

# Now, build the final protocol router
application = ProtocolTypeRouter({
    # Use the WhiteNoise-wrapped version for HTTP requests
    "http": application_with_static_files,

    # Keep your WebSocket handling as it was
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})  