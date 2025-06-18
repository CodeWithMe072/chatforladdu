import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone
from channels.db import database_sync_to_async
from .models import *
import traceback
from asgiref.sync import sync_to_async
from django.utils import timezone


class MyChat(AsyncJsonWebsocketConsumer):
    # consumers.py (Correct Order)

    async def connect(self):
        user = self.scope["user"]

        if user.is_anonymous:
            await self.close()
            return

        self.group_name = f"mychat_app{user.id}"
        print("WebSocket CONNECT:", self.group_name)

        # Do the risky operation FIRST
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # If the line above succeeds, THEN accept the connection
        await self.accept()

    async def disconnect(self, close_code):
        print("WebSocket DISCONNECT:", close_code)
        user = self.scope["user"]
        if not user.is_anonymous:
            await self.channel_layer.group_discard(f"mychat_app{user.id}", self.channel_name)

    async def receive(self, text_data=None):
        try:
            data = json.loads(text_data)
            print("RECEIVED:", data)
        except json.JSONDecodeError:
            print("Invalid JSON")
            return

        msg_type = data.get("type")

        if msg_type == "status":
            print(f"User is now: {data.get('status')}")
            user = await sync_to_async(UserAB.objects.get)(id=self.scope["user"].id)

            if data.get('status') == 'online':
                user.is_online = True
            elif data.get('status') == 'offline':
                print('zdfgfhjklkjhjghfdczsdvfghjklhgfdsfghjklhgfdsghjkhgfdscdfghjkhgfdxz')
                user.is_online = False
                user.last_seen = timezone.now()

            await sync_to_async(user.save)()  # ✅ async-safe save
            return
        elif msg_type == "typing":
            recipient_id = data.get("recipient_id")
            is_typing = data.get("is_typing")

            if recipient_id is not None:
                await self.channel_layer.group_send(
                    f"mychat_app{recipient_id}",
                    {
                        "type": "typing_indicator",
                        "is_typing": is_typing,
                    }
                )
            return

      

        elif msg_type == "chat":
           
            recipient_id = data.get("user")
            msg = data.get("msg")
            reply_to = data.get("reply_to")

            if recipient_id and msg:
                try:
                    saved_msg = await database_sync_to_async(Messages.objects.create)(
                        sender=self.scope["user"],
                        recipient_id=recipient_id,
                        content=msg,
                        message_type="text",
                        reply_to_id=reply_to if reply_to else None,
                        timestamp=timezone.now()
                    )
                except Exception as e:
                    print("🔥 ERROR WHILE SAVING MESSAGE 🔥")
                    traceback.print_exc()
                    await self.close(code=1011)
                    return

                try:
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
                            "reply_to": saved_msg.reply_to.id if saved_msg.reply_to else None,
                            "reply_to_text": saved_msg.reply_to.content if saved_msg.reply_to else None,
                            "reply_to_sender": saved_msg.reply_to.sender.id if saved_msg.reply_to and saved_msg.reply_to.sender else None,
                            "reply_to_sender_name": saved_msg.reply_to.sender.username if saved_msg.reply_to and saved_msg.reply_to.sender else None
                        }
                    )
                except Exception as e:
                    print("🔥 ERROR WHILE SENDING TO CHANNEL GROUP 🔥")
                    traceback.print_exc()
                    await self.close(code=1011)
                    return
            else:
                print("Missing user or message")

    async def send_msg(self, event):
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message_id": event.get("message_id"),
            "sender_id": event.get("sender_id"),
            "sender_name": event.get("sender_name"),
            "message": event.get("msg"),
            "message_type": event.get("message_type", "text"),
            "timestamp": event.get("timestamp"),
            "media_url": event.get("media_url"),  # ✅ NEW
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
