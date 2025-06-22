import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.utils import timezone
from .models import *
import traceback

class MyChat(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        user = self.scope["user"]

        if user.is_anonymous:
            await self.close()
            return

        self.group_name = f"mychat_app{user.id}"
        print("WebSocket CONNECT:", self.group_name)

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        user = self.scope.get("user")
        print("WebSocket DISCONNECT:", close_code)
        if user and not user.is_anonymous:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None):
        try:
            data = json.loads(text_data)
            print("RECEIVED:", data)

            msg_type = data.get("type")
            if msg_type == "status":
                await self.handle_status(data)
            elif msg_type == "typing":
                await self.handle_typing(data)
            elif msg_type == "chat":
                await self.handle_chat(data)
            else:
                print("❗ Unknown message type:", msg_type)

        except Exception as e:
            print("🔥 Error in receive() 🔥")
            traceback.print_exc()
            await self.close(code=1011)

    async def handle_status(self, data):
        user = await sync_to_async(UserAB.objects.get)(id=self.scope["user"].id)
        if data.get("status") == "online":
            user.is_online = True
        elif data.get("status") == "offline":
            user.is_online = False
            user.last_seen = timezone.now()
        await sync_to_async(user.save)()

    async def handle_typing(self, data):
        recipient_id = data.get("recipient_id")
        is_typing = data.get("is_typing")
        if recipient_id:
            await self.channel_layer.group_send(
                f"mychat_app{recipient_id}",
                {
                    "type": "typing_indicator",
                    "is_typing": is_typing,
                }
            )

    async def handle_chat(self, data):
        try:
            recipient_id = data.get("user")
            msg = data.get("msg")
            reply_to = data.get("reply_to")

            if recipient_id and msg:
                saved_msg = await database_sync_to_async(Messages.objects.create)(
                    sender=self.scope["user"],
                    recipient_id=recipient_id,
                    content=msg,
                    message_type="text",
                    reply_to_id=reply_to if reply_to else None,
                    timestamp=timezone.now()
                )

                await self.channel_layer.group_send(
                    f"mychat_app{recipient_id}",
                    {
                        "type": "send_msg",
                        "message_id": saved_msg.id,
                        "sender_id": self.scope["user"].id,
                        "sender_name": self.scope["user"].username,
                        "msg": saved_msg.content,
                        "message_type": saved_msg.message_type,
                        "timestamp": saved_msg.timestamp.strftime("%I:%M %p"),
                        "media_url": None,
                        "reply_to": saved_msg.reply_to.id if saved_msg.reply_to else None,
                        "reply_to_text": saved_msg.reply_to.content if saved_msg.reply_to else None,
                        "reply_to_sender": saved_msg.reply_to.sender.id if saved_msg.reply_to and saved_msg.reply_to.sender else None,
                        "reply_to_sender_name": saved_msg.reply_to.sender.username if saved_msg.reply_to and saved_msg.reply_to.sender else None
                    }
                )
            else:
                print("⚠️ Missing recipient or message")

        except Exception as e:
            print("🔥 Error in handle_chat() 🔥")
            traceback.print_exc()
            await self.close(code=1011)

    async def send_msg(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message_id": event.get("message_id"),
            "sender_id": event.get("sender_id"),
            "sender_name": event.get("sender_name"),
            "message": event.get("msg"),
            "message_type": event.get("message_type", "text"),
            "timestamp": event.get("timestamp"),
            "media_url": event.get("media_url", None),
            "reply_to": event.get("reply_to"),
            "reply_to_text": event.get("reply_to_text"),
            "reply_to_sender": event.get("reply_to_sender"),
            "reply_to_sender_name": event.get("reply_to_sender_name"),
        }))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "is_typing": event["is_typing"]
        }))
