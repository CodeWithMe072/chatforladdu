from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
class UserAB(AbstractUser):
    profileImg = models.ImageField(upload_to='media/profiles/', null=True, blank=True,default='images/laddu.png')
    is_active = models.BooleanField(default=True)
    chat_pin = models.IntegerField(null=True, blank=True)  # Fixed: added upload_to + null/blank
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)  # Fixed: made optional
    def __str__(self):
        return f'{self.username}'
    

class Messages(models.Model):
    """Model to store chat messages."""
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
        ('file', 'File'),
    )
    
    sender = models.ForeignKey(UserAB, on_delete=models.SET_NULL, related_name='sent_messages' ,null=True,blank=True)
    recipient = models.ForeignKey(UserAB, on_delete=models.SET_NULL, related_name='received_messages' ,null=True,blank=True)
    content = models.TextField(blank=True)
    media = models.FileField(upload_to='media/chat_media/', null=True, blank=True)
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    timestamp = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    
    class Meta:
        ordering = ['timestamp']
  
