from django.urls import re_path
import chat.consumers

websocket_urlpatterns=[
    re_path(r"ws/nilam/",chat.consumers.MyChat.as_asgi())
]