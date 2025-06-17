from django.urls import path
from . import views
from django.conf import settings
from django.conf.urls.static import static
urlpatterns = [
   path('', views.index, name='home'),
   
    path('create-admin/', views.create_admin),

    path('api/verify-pin/', views.verify_pin, name='verify_pin'),
    path('api/messages/<int:contact_id>/', views.load_messages, name='load_messages'),
    path('api/messages/send/', views.send_message, name='send_message'),
    path('login/', views.Userlogin, name='login'),
    path('password_reset/', views.Userlogin, name='password_reset'),
    path('register/', views.register, name='register'),
    path('api/users/<int:user_id>/', views.get_user_profile, name='get_user_profile'),
 ]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
 