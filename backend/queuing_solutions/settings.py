"""
Django settings for queuing_solutions project.
"""

from pathlib import Path
import os
import urllib.parse
from datetime import timedelta
from dotenv import load_dotenv

# Use pymysql as MySQLdb
import pymysql
pymysql.install_as_MySQLdb()

# Bypass MariaDB version check for local dev (MariaDB 10.4 is running)
from django.db.backends.base.base import BaseDatabaseWrapper
BaseDatabaseWrapper.check_database_version_supported = lambda self: None

# Disable insert returning for MariaDB < 10.5 (as XAMPP is 10.4.28)
from django.db.backends.mysql.features import DatabaseFeatures
DatabaseFeatures.can_return_columns_from_insert = property(lambda self: False)

# Load env variables from .env
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

SECRET_KEY = os.getenv("SECRET_KEY", "django-insecure-default-key")
DEBUG = os.getenv("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

# Application definition
INSTALLED_APPS = [
    # Daphne must be loaded before staticfiles/django.contrib.staticfiles
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "channels",
    "django_prometheus",
    "drf_spectacular",
    
    # Local Apps
    "core",
    "accounts",
    "companies",
    "branches",
    "billing",
    "queuing",
    "appointments",
    "kot",
    "display",
    "notifications",
    "analytics",
    "feedback",
    "audit",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.ThreadLocalUserMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "queuing_solutions.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "queuing_solutions.wsgi.application"
ASGI_APPLICATION = "queuing_solutions.asgi.application"

# Database Configuration (MySQL/MariaDB parsing)
_db_host = os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST")
_db_user = os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER")
_db_pass = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD")
_db_name = os.getenv("MYSQLDATABASE") or os.getenv("MYSQL_DATABASE")
_db_port = os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT")

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("MYSQL_URL") or os.getenv("MYSQLURL") or os.getenv("MYSQLPRIVATEURL") or os.getenv("MYSQLPUBLICURL") or ""

if DATABASE_URL:
    urllib.parse.uses_netloc.append("mysql")
    url = urllib.parse.urlparse(DATABASE_URL)
    db_name = url.path[1:] if (url.path and url.path != "/") else (_db_name or "railway")
    db_user = url.username or _db_user or "root"
    db_pass = urllib.parse.unquote(url.password) if url.password else (_db_pass or "")
    db_host = url.hostname or _db_host or "127.0.0.1"
    db_port = int(url.port or _db_port or 3306)
else:
    db_name = _db_name or "queuing_solutions"
    db_user = _db_user or "root"
    db_pass = _db_pass or ""
    db_host = _db_host or "127.0.0.1"
    db_port = int(_db_port or 3306)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": db_name,
        "USER": db_user,
        "PASSWORD": db_pass,
        "HOST": db_host,
        "PORT": db_port,
        "OPTIONS": {
            "charset": "utf8mb4",
        },
    }
}

# Redis/In-Memory Channels configuration for WebSockets
# Switched to RedisChannelLayer to prevent silent message drop at target scale (~2000 WS connections)
# Falls back to InMemoryChannelLayer when REDIS_URL is not configured (local dev without Redis)
_redis_url = os.getenv("REDIS_URL", "")
if _redis_url:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [_redis_url],
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

# Auth User Model configuration
AUTH_USER_MODEL = "accounts.User"

# SimpleJWT configuration
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# Django REST Framework configuration
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "public_burst": "60/minute",
        "public_submit": "20/minute",
        "company_signup": "5/hour",
    }
}

# drf-spectacular configuration
SPECTACULAR_SETTINGS = {
    "TITLE": "Quesole API Docs",
    "DESCRIPTION": "Auto-generated documentation of the Quesole API surface",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# CORS configuration
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Security Headers & TLS enforcement behind reverse proxy (Railway)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True

if not DEBUG:
    SECURE_SSL_REDIRECT = False  # Railway edge proxy handles SSL redirection automatically
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = "DENY"
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# Cryptography & Storage Keys
FIELD_ENCRYPTION_KEY = os.getenv("FIELD_ENCRYPTION_KEY", "uO-qE9F5eN4B3A2C1D0E_F6G7H8I9J0K1L2M3N4O5P6=")
BLIND_INDEX_KEY = os.getenv("BLIND_INDEX_KEY", "default-blind-index-secure-key-1234567890")
CUSTOMER_PII_RETENTION_DAYS = int(os.getenv("CUSTOMER_PII_RETENTION_DAYS", "365"))
BACKUP_RETENTION_DAYS = int(os.getenv("BACKUP_RETENTION_DAYS", "7"))
USE_S3 = os.getenv("USE_S3", "False") == "True"
SMS_BACKEND = os.getenv("SMS_BACKEND", "console")

# SMS provider credentials (used when SMS_BACKEND is non-console)
# Twilio
TWILIO_ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER  = os.getenv("TWILIO_FROM_NUMBER", "")
# MSG91
MSG91_AUTH_KEY      = os.getenv("MSG91_AUTH_KEY", "")
MSG91_SENDER_ID     = os.getenv("MSG91_SENDER_ID", "QUESOL")

# ── File Storage ──────────────────────────────────────────────────────────────
# When USE_S3=True the default and media storages are redirected to an S3-
# compatible bucket via django-storages. The S3 backend is transparent to views:
# they continue to open/write FileField/ImageField normally; the library handles
# upload and pre-signed URL generation automatically.
#
# Required env vars (when USE_S3=True):
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_STORAGE_BUCKET_NAME,
#   AWS_S3_REGION_NAME  (e.g. "ap-south-1")
#   AWS_S3_ENDPOINT_URL (optional; set to override for non-AWS S3-compatible stores)
#
if USE_S3:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            # Keep static files on local disk; only media/uploads go to S3
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }
    AWS_ACCESS_KEY_ID       = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY   = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
    AWS_S3_REGION_NAME      = os.getenv("AWS_S3_REGION_NAME", "ap-south-1")
    AWS_S3_ENDPOINT_URL     = os.getenv("AWS_S3_ENDPOINT_URL", "") or None  # None → standard AWS endpoint
    AWS_S3_FILE_OVERWRITE   = False   # never silently overwrite files with the same name
    AWS_DEFAULT_ACL         = None    # bucket-owner-full-control; no public ACLs
    # Pre-signed URL expiry for invoice/export downloads (10 minutes)
    AWS_QUERYSTRING_EXPIRE  = int(os.getenv("AWS_QUERYSTRING_EXPIRE", "600"))

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Sentry SDK Integration (Hook only)
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=1.0,
        send_default_pii=True
    )

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
LOCALE_PATHS = [
    BASE_DIR / "locale",
]


STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Celery Configuration Options
# Use Redis for Celery when available; fall back to memory:// for local dev without Redis
CELERY_BROKER_URL = os.getenv("REDIS_URL", "") or "memory://"
CELERY_RESULT_BACKEND = os.getenv("REDIS_URL", "") or "cache+memory://"
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Kolkata'

# Celery Beat — periodic task schedule
# Run celery beat with: celery -A queuing_solutions beat -l info
from celery.schedules import crontab
CELERY_BEAT_SCHEDULE = {
    # Phase 3 alert-check tasks (every 5 minutes during business hours)
    "check-long-wait-times": {
        "task": "notifications.tasks.check_long_wait_times",
        "schedule": crontab(minute="*/5"),
    },
    "check-queue-length-spikes": {
        "task": "notifications.tasks.check_queue_length_spikes",
        "schedule": crontab(minute="*/5"),
    },
    "check-desk-idleness": {
        "task": "notifications.tasks.check_desk_idleness",
        "schedule": crontab(minute="*/10"),
    },
    "check-no-show-rate-spikes": {
        "task": "notifications.tasks.check_no_show_rate_spikes",
        "schedule": crontab(minute="*/10"),
    },
    "check-device-heartbeats": {
        "task": "notifications.tasks.check_device_heartbeats",
        "schedule": crontab(minute="*/5"),
    },
    "check-no-operator-online": {
        "task": "notifications.tasks.check_no_operator_online",
        "schedule": crontab(minute="*/10"),
    },
    "check-sla-breaches": {
        "task": "notifications.tasks.check_sla_breaches",
        "schedule": crontab(minute="0", hour="*/2"),
    },
    "check-daily-volume-anomalies": {
        "task": "notifications.tasks.check_daily_volume_anomalies",
        "schedule": crontab(minute="30", hour="7"),
    },
    # Phase 7 compliance tasks
    "purge-expired-customer-pii": {
        "task": "core.tasks.purge_expired_customer_pii",
        # Daily at midnight UTC (well before business hours in any timezone)
        "schedule": crontab(minute="0", hour="0"),
    },
    "run-mysql-backup": {
        "task": "core.backup.run_mysql_backup",
        # Daily at 01:00 UTC (offset from purge to avoid DB contention)
        "schedule": crontab(minute="0", hour="1"),
    },
}

# Ensure Celery tasks run synchronously in test suite
import sys
if 'test' in sys.argv or 'pytest' in sys.modules:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        }
    }
    REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"] = {
        "anon": "99999/day",
        "user": "99999/day",
        "public_burst": "99999/day",
        "public_submit": "99999/day",
        "company_signup": "99999/day",
    }


# Email backend configuration for email alert triggers (console backend for testing and local dev)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Dynamic tax settings
GST_PERCENT = 18.0

