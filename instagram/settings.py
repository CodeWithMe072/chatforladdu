"""
Django settings for instagram project.
"""

from pathlib import Path
import os
import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Production/Development Switching ---
# This is a robust way to manage settings on Render.
# The 'RENDER' environment variable is automatically set to 'true' on Render.
IS_PRODUCTION = os.environ.get('RENDER') is not None

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-local-dev-key')

# DEBUG is False in production, True in local development
DEBUG = not IS_PRODUCTION

# --- Host Configuration ---
# Automatically adds the Render hostname to ALLOWED_HOSTS in production.
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
if IS_PRODUCTION:
    RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
    if RENDER_EXTERNAL_HOSTNAME:
        ALLOWED_HOSTS.append(RENDER_EXTERNAL_HOSTNAME)

# --- Application definition ---
INSTALLED_APPS = [
    'channels',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'chat',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise middleware should be placed here.
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'instagram.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Use ASGI for Channels support
ASGI_APPLICATION = 'instagram.asgi.application'

# --- Database Configuration ---
# Uses dj_database_url to automatically parse the DATABASE_URL from Render.
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///db.sqlite3',
        conn_max_age=600
    )
}

# --- Channels and Redis Configuration ---
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("REDIS_URL", "redis://127.0.0.1:6379")],
        },
    },
}
# --- Password validation ---
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# --- Internationalization ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# --- Auth Configuration ---
LOGIN_URL = '/login/'
AUTH_USER_MODEL = 'chat.UserAB'

# --- Static and Media Files ---
STATIC_URL = '/static/'
STATICFILES_DIRS = [os.path.join(BASE_DIR, 'static')]
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

MEDIA_URL = '/media/'
# IMPORTANT: This path points to the persistent disk on Render.
# You MUST create a disk and set its mount path to '/var/data/media'.
MEDIA_ROOT = '/var/data/media' if IS_PRODUCTION else os.path.join(BASE_DIR, 'media')

# --- Storage Configuration (Django 4.2+) ---
# This is the fix for your last error.
STORAGES = {
    # Handles user-uploaded files (ImageField, FileField).
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    # Handles static files (CSS, JS) via WhiteNoise.
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# --- Default primary key field type ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'