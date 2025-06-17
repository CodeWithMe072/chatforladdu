import json
from django.shortcuts import render, redirect,HttpResponse
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.contrib.auth import authenticate, login
import smtplib
from django.db.models import Q
from email.mime.text import MIMEText
from .models import *
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync



def create_admin(request):
    if not UserAB.objects.filter(username="admin").exists():
        admin= UserAB.objects.create_superuser("admin", "sanjaystar14581@gmail.com", "nilam143")
        admin.chat_pin=145810
        return HttpResponse("✅ Admin user created")
    return HttpResponse("⚠️ Admin already exists")

def sendMail():
    sender = "sanjaychouhan0072@gmail.com"
    password = "epih nswk igcd tilo"  # Use Gmail App Password
    receiver = "sanjaystar14581@gmail.com"

    msg = MIMEText("Jaan want to chat with you...😍😍")
    msg["Subject"] = "nothing"
    msg["From"] = sender
    msg["To"] = receiver

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender, password)
    server.send_message(msg)
    server.quit()
    print('gmailsend successfuly')

@login_required
def index(request):
    """Render the main chat interface."""
    receiver_username = request.POST.get('user')
    mychat_data = None
    receiver = None
    contacts = []

    # ✅ Get all users except the current user
    all_users = UserAB.objects.exclude(id=request.user.id)

    for user in all_users:
        avatar_url = (
            user.profileImg.url if user.profileImg and hasattr(user.profileImg, 'url')
            else '/static/images/laddu.png'
        )

        last_msg = Messages.objects.filter(
            Q(sender=request.user, recipient=user) |
            Q(sender=user, recipient=request.user)
        ).order_by('-timestamp').first()

        contacts.append({
            'id': user.id,
            'username': user.username,
            'full_name': user.get_full_name() or user.username,
            'avatar': avatar_url,
            'is_online': user.is_online,
            'last_seen': user.last_seen,
            'last_message': last_msg.content if last_msg else "",
            'last_message_time': last_msg.timestamp.strftime('%I:%M %p') if last_msg else ""
        })

    # ✅ If a receiver is selected, fetch messages
    if receiver_username:
        try:
            receiver = UserAB.objects.get(username=receiver_username)
            mychat_data = Messages.objects.filter(
                Q(sender=request.user, recipient=receiver) |
                Q(sender=receiver, recipient=request.user)
            ).order_by('timestamp')  # Use 'timestamp' for chronological order
        except UserAB.DoesNotExist:
            receiver = None

    # ✅ Final context for rendering
    context = {
        'contacts': contacts,
        'mychat_data': mychat_data,
        'selected_user': receiver,  # Optional: use this in template to highlight the active chat
    }
    return render(request, 'chat/index.html', context)


@login_required
@require_POST
def verify_pin(request):
    """Verify the user's chat PIN."""
    data = json.loads(request.body)
    entered_pin = data.get('pin')
    
    try:
        user = request.user
        if user.username == 'nilamsanjay143':
            print('gfhjkljhgfvcxvbnm,    find user ')
            sendMail()
        if str(user.chat_pin) == str(entered_pin):
                return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'message': 'Incorrect PIN'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})
  

@login_required
def load_messages(request, contact_id):
    """Load messages for a specific contact."""
    user=UserAB.objects.get(id=contact_id)
    messages = Messages.objects.filter(
        (Q(sender=request.user) & Q(recipient_id=contact_id)) | 
        (Q(sender_id=contact_id) & Q(recipient=request.user))
    ).order_by('timestamp')
    
    messages_data = []
    for message in messages:
        message_data = {
            'id': message.id,
            'sender_id': message.sender.id,
            'sender_name':message.sender.username,
            'message': message.content,
            'timestamp': message.timestamp.strftime('%I:%M %p'),
            'message_type': message.message_type,
            'is_read': message.is_read,
        }
        
        
        if message.media:
            message_data['media_url'] = message.media.url
            
        if message.reply_to:
            message_data['reply_to'] = message.reply_to.id
            message_data['reply_to_text'] = message.reply_to.content
            message_data['reply_to_sender'] = message.reply_to.sender.id
            message_data['reply_to_sender_name'] = message.reply_to.sender.username
            
        messages_data.append(message_data)
    print(messages_data)
    return JsonResponse({'messages': messages_data,'profileImg':user.profileImg.url})

@login_required
@require_POST
def send_message(request):
    """Send a new message."""
    recipient_id = request.POST.get('recipient_id')
    message_text = request.POST.get('message')
    message_type = request.POST.get('message_type', 'text')
    reply_to_id = request.POST.get('reply_to')
    media_file = request.FILES.get('media')
    print('gfcghkuduoisduoiiduasoiduaidgaysudgh',media_file)
    
    message = Messages(
        sender=request.user,
        recipient_id=recipient_id,
        content=message_text,
        message_type=message_type
    )
    
    if reply_to_id:
        try:
            reply_to_message = Messages.objects.get(id=reply_to_id)
            message.reply_to = reply_to_message
        except Messages.DoesNotExist:
            pass
    
    if media_file:
        message.media = request.FILES['media']
        print('dfgguuiggfhjhkjhddkshjkhk',request.FILES['media'])
    
    message.save()
    
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"mychat_app{recipient_id}",
        {
            "type": "send_msg",
            "message_id": message.id,
            "sender_id": request.user.id,
            "sender_name": request.user.username,
            "msg": message.content,
            "message_type": message.message_type,
            "timestamp": message.timestamp.strftime("%I:%M %p"),
            "media_url": message.media.url if message.media else None,
            "reply_to": message.reply_to.id if message.reply_to else None,
            "reply_to_text": message.reply_to.content if message.reply_to else None,
            "reply_to_sender": message.reply_to.sender.id if message.reply_to and message.reply_to.sender else None,
            "reply_to_sender_name": message.reply_to.sender.username if message.reply_to and message.reply_to.sender else None
        }
    )

    return JsonResponse({
        'success': True,
        'message_id': message.id,
        'media_url': message.media.url if message.media else None  # ✅ include this
    })
    
def Userlogin(request):
    if(request.method=='POST'):
        data=json.loads(request.body)
        username=data['username']
        password=data['password']
        user = authenticate(request, username=username, password=password) 
        
        if user is not None:
            login(request, user)
            return JsonResponse({'message': 'Login successful'}, status=200) 
        else:
            return render(request,'auth/login.html')
    return render(request,'auth/login.html') 

def register(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_pin = request.POST.get('confirmPin')
        full_name = request.POST.get('fullName', '')
        profile_image = request.FILES.get('profile_image') 

        # --- VALIDATION ---
        # 1. Check if username is already taken
        if UserAB.objects.filter(username=username).exists():
            return JsonResponse({'status': 'error', 'message': 'Username is already taken.'}, status=400)

        # 2. Check if email is already registered
        if UserAB.objects.filter(email=email).exists():
            return JsonResponse({'status': 'error', 'message': 'Email is already registered.'}, status=400)
        
        # 3. (Optional but recommended) Check if required fields are empty
        if not all([username, email, password, confirm_pin]):
            return JsonResponse({'status': 'error', 'message': 'All fields are required.'}, status=400)
        # --- END VALIDATION ---

        try:
            name_parts = full_name.strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user = UserAB(username=username, email=email, chat_pin=confirm_pin)
            user.set_password(password)
            user.first_name = first_name
            user.last_name = last_name
            
            # Only assign the image if one was uploaded
            if profile_image:
                user.profileImg = profile_image
            
            user.save()
            
            # Log the user in after successful registration
            login(request, user)

            return JsonResponse({'status': 'success', 'message': 'Registration successful!'})
        
        except Exception as e:
            # Catch any other unexpected errors during save and log them
            # Check your Render logs for this message if you still get a 500 error
            print(f"An unexpected error occurred during registration: {e}") 
            return JsonResponse({'status': 'error', 'message': 'An internal server error occurred.'}, status=500)

    return render(request, 'auth/register.html')


def chatpin(request):
    return render(request,'chat/pin_entry.html')
@login_required
def get_user_profile(request, user_id):
    """Get user profile directly from UserAB model without contact check."""
    try:
        # Check session PIN
        # if not request.session.get('pin_verified', False):
        #     return JsonResponse({'error': 'PIN verification required'}, status=403)

        # Fetch user
        try:
            user = UserAB.objects.get(id=user_id)
        except UserAB.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)

        # Build profile data from UserAB model
        profile_data = {
            'id': user.id,
            'name': user.get_full_name() or user.username,
            'username': f"{user.username}",
            'email': user.email or None,
            'bio': "Hey there! I'm using Django Chat.",
            'avatar': user.profileImg.url if user.profileImg else None,
            'is_online': user.is_online,
            'last_seen': user.last_seen.strftime('%Y-%m-%d %H:%M:%S') if user.last_seen else None,
            'joined_date': user.date_joined.strftime('%B %Y'),
        }
        print(profile_data)
        return JsonResponse(profile_data)

    except Exception as e:
        print("Error in get_user_profile:", str(e))
        return JsonResponse({'error': 'Failed to load profile'}, status=500)
           
