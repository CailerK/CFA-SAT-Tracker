"""
Django settings for myproject project.

Reads sensitive values from environment variables so the same code runs
locally (with sane defaults) and on Railway (with secrets set in the dashboard).
"""

import os
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent  # repo root (contains backend/ and frontend/)

# Load .env from backend/ if present (local dev convenience).
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool) -> bool:
    """Parse an env var as a bool. Accepts 1/0, true/false, yes/no."""
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


# -----------------------------------------------------------------------------
# Core security
# -----------------------------------------------------------------------------
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    # Dev-only fallback. NEVER deploy with this; Railway must set DJANGO_SECRET_KEY.
    "django-insecure-gp)!0xb6)d6@@&9019^*7uz*^8fynub-f4)l0q88zo28ptqe6g",
)

DEBUG = env_bool("DJANGO_DEBUG", default=True)

# ALLOWED_HOSTS: comma-separated env var. Railway provides RAILWAY_PUBLIC_DOMAIN
# automatically, so we include it if present.
_allowed = os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")
ALLOWED_HOSTS = [h.strip() for h in _allowed.split(",") if h.strip()]
_railway_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN")
if _railway_domain:
    ALLOWED_HOSTS.append(_railway_domain)

# Trust Railway's HTTPS proxy for CSRF + secure cookies.
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]
if _railway_domain:
    CSRF_TRUSTED_ORIGINS.append(f"https://{_railway_domain}")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")


# -----------------------------------------------------------------------------
# Apps
# -----------------------------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "api",
]

AUTH_USER_MODEL = "api.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise must come right after SecurityMiddleware to serve static files in prod.
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "myproject.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        # In production the React build's index.html lives in frontend/build/.
        # Django can also render it as a template fallback (for client-side routes).
        "DIRS": [PROJECT_ROOT / "frontend" / "build"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "myproject.wsgi.application"


# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
# Locally: SQLite (no DATABASE_URL).
# On Railway: DATABASE_URL is injected automatically by the Postgres plugin.
if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.config(
            conn_max_age=600,
            ssl_require=not DEBUG,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# -----------------------------------------------------------------------------
# Password validation
# -----------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# -----------------------------------------------------------------------------
# i18n / tz
# -----------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Chicago"
USE_I18N = True
USE_TZ = True


# -----------------------------------------------------------------------------
# Static files (React build + Django admin assets)
# -----------------------------------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"   # collectstatic target (served by WhiteNoise)

# React's `npm run build` puts hashed assets in frontend/build/static/.
# Include that folder so collectstatic gathers it into STATIC_ROOT.
_react_build_static = PROJECT_ROOT / "frontend" / "build" / "static"
STATICFILES_DIRS = [_react_build_static] if _react_build_static.exists() else []

# Hashed manifest storage + gzip/brotli for fast static delivery in prod.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# -----------------------------------------------------------------------------
# CORS / CSRF
# -----------------------------------------------------------------------------
# In dev, React runs on :3000 and Django on :8000 (different origins → need CORS).
# In prod, Django serves the React build itself (same origin → CORS not needed
# but harmless to leave configured).
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
if _railway_domain:
    CORS_ALLOWED_ORIGINS.append(f"https://{_railway_domain}")

CORS_ALLOW_CREDENTIALS = True


# -----------------------------------------------------------------------------
# REST framework — closed by default
# -----------------------------------------------------------------------------
# Every endpoint requires login UNLESS the view explicitly opts out via
# @permission_classes([AllowAny]). This is what makes the site "open at the URL
# but only usable with the right login."
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}


# -----------------------------------------------------------------------------
# Email (password reset)
# -----------------------------------------------------------------------------
# Dev: prints emails to the console. Prod: set EMAIL_* env vars on Railway.
EMAIL_BACKEND = os.environ.get(
    "DJANGO_EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")

DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "noreply@cfasattracker.com")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Used to build password-reset links. Falls back to the Railway domain.
FRONTEND_URL = os.environ.get(
    "FRONTEND_URL",
    f"https://{_railway_domain}" if _railway_domain else "http://localhost:3000",
)
PASSWORD_RESET_TIMEOUT = 60 * 60 * 24  # 24 hours


# -----------------------------------------------------------------------------
# Sessions (remember-me)
# -----------------------------------------------------------------------------
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14  # 2 weeks
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True

# Lock cookies down in production (HTTPS only).
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
