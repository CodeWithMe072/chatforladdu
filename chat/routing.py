from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
      re_path(r'ws/(?P<username>\w+)/$', consumers.MyChat.as_asgi()),
]