# Production Deployment Guide

This guide covers Phase 10 production hardening tasks for the CFA SAT Tracker application.

## ✅ Completed

### Rate Limiting
- ✅ **django-ratelimit** installed and configured
- ✅ Login endpoint: 5 attempts per 15 minutes per IP
- ✅ Forgot password endpoint: 3 attempts per hour per IP
- ✅ Prevents brute force attacks on authentication

## 🔧 Setup Required

### 1. Email Service (Resend or SendGrid)

**Why:** Password reset emails, notification digests, and system alerts.

#### Option A: Resend (Recommended)
```bash
# Install Resend SDK
pip install resend

# Add to requirements.txt
echo "resend==0.7.0" >> backend/requirements.txt
```

**Environment Variables (Railway):**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://your-app.railway.app
```

**Code Integration:**
```python
# backend/myproject/settings.py
import resend

resend.api_key = os.getenv('RESEND_API_KEY')

# Update email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# Or use Resend's Python SDK directly in views
```

#### Option B: SendGrid
```bash
pip install sendgrid

# Add to requirements.txt
echo "sendgrid==6.11.0" >> backend/requirements.txt
```

**Environment Variables:**
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://your-app.railway.app
```

**Code Integration:**
```python
# backend/myproject/settings.py
EMAIL_BACKEND = 'sendgrid_backend.SendgridBackend'
SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
```

---

### 2. Sentry Error Tracking

**Why:** Real-time error monitoring, performance tracking, and alerting.

#### Setup Steps:

1. **Create Sentry Account:**
   - Go to https://sentry.io
   - Create a new Django project
   - Copy your DSN (Data Source Name)

2. **Install Sentry SDK:**
```bash
pip install sentry-sdk[django]

# Add to requirements.txt
echo "sentry-sdk[django]==1.40.0" >> backend/requirements.txt
```

3. **Configure Sentry:**
```python
# backend/myproject/settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,  # 10% of transactions for performance monitoring
    profiles_sample_rate=0.1,  # 10% for profiling
    environment=os.getenv('RAILWAY_ENVIRONMENT', 'production'),
    release=os.getenv('RAILWAY_GIT_COMMIT_SHA', 'unknown'),
)
```

4. **Environment Variables (Railway):**
```bash
SENTRY_DSN=https://xxxxxxxxxxxxx@o123456.ingest.sentry.io/123456
```

5. **Set Up Alerts:**
   - Go to Sentry → Alerts → Create Alert Rule
   - Alert on: Error rate > 5 errors/minute
   - Alert on: 5xx response rate > 1%
   - Notify via: Email, Slack, or PagerDuty

---

### 3. Database Query Optimization

**Why:** Prevent N+1 query problems and improve performance.

#### Already Optimized Viewsets:
Most viewsets already use `select_related()` and `prefetch_related()`:

```python
# Example from views_leadership.py
queryset = Evaluation360.objects.select_related(
    'evaluatee', 'template', 'store'
).prefetch_related('evaluators__user')
```

#### Check for N+1 Problems:

1. **Enable Django Debug Toolbar (Development Only):**
```bash
pip install django-debug-toolbar
```

```python
# settings.py (only in DEBUG mode)
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

2. **Use Django's Query Logging:**
```python
# settings.py (temporary for testing)
LOGGING = {
    'version': 1,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

3. **Run Tests and Check Query Count:**
```bash
# Look for endpoints making 10+ queries
python manage.py shell
>>> from django.test.utils import override_settings
>>> from django.db import connection
>>> from django.test import Client
>>> 
>>> client = Client()
>>> with override_settings(DEBUG=True):
...     response = client.get('/api/team/members/')
...     print(f"Queries: {len(connection.queries)}")
```

---

### 4. Postgres Backup Verification

**Why:** Ensure data can be recovered in case of failure.

#### Railway Postgres Backups:

Railway automatically backs up Postgres databases, but you should verify:

1. **Check Backup Status:**
   - Go to Railway Dashboard → Your Postgres Service
   - Click "Backups" tab
   - Verify backups are running daily

2. **Test Restore Process (Staging):**
```bash
# Download a backup
railway postgres backup download

# Restore to a test database
pg_restore -d test_database backup.dump
```

3. **Set Up Backup Monitoring:**
   - Create a cron job or Railway service to verify backups exist
   - Alert if no backup in last 24 hours

#### Manual Backup Script (Optional):
```bash
#!/bin/bash
# backup.sh - Run daily via cron or Railway cron job

DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL > "backup_$DATE.sql"

# Upload to S3 or another storage service
aws s3 cp "backup_$DATE.sql" s3://your-bucket/backups/
```

---

### 5. Performance Monitoring

#### Key Metrics to Track:

1. **Response Times:**
   - Target: < 200ms for list endpoints
   - Target: < 100ms for detail endpoints
   - Use Sentry Performance Monitoring

2. **Database Connection Pool:**
```python
# settings.py
DATABASES = {
    'default': {
        # ... existing config
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'OPTIONS': {
            'connect_timeout': 10,
        }
    }
}
```

3. **Gunicorn Workers:**
```python
# Procfile (Railway)
web: gunicorn myproject.wsgi:application --workers 4 --threads 2 --timeout 60
```

**Worker Formula:** `(2 x CPU cores) + 1`
- Railway typically provides 2 CPUs → 5 workers recommended

---

### 6. Security Checklist

- ✅ Rate limiting on auth endpoints
- ✅ CORS configured for frontend domain only
- ✅ CSRF protection enabled
- ✅ SECRET_KEY in environment variable (not in code)
- ✅ DEBUG=False in production
- ✅ ALLOWED_HOSTS configured
- ⚠️ **TODO:** Set up HTTPS redirect (Railway handles this automatically)
- ⚠️ **TODO:** Review and update CORS_ALLOWED_ORIGINS for production domain

---

### 7. Environment Variables Checklist

**Required for Production:**
```bash
# Django Core
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app
FRONTEND_URL=https://your-frontend.railway.app

# Database (Railway provides this)
DATABASE_URL=postgresql://...

# Email Service (choose one)
RESEND_API_KEY=re_xxxxxxxxxxxxx
# OR
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Error Tracking
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/123456

# Optional
RAILWAY_ENVIRONMENT=production
RAILWAY_GIT_COMMIT_SHA=abc123
```

---

### 8. Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Railway
- [ ] Email service configured and tested
- [ ] Sentry configured and receiving test errors
- [ ] Rate limiting tested (try 6 failed logins)
- [ ] Database backups verified
- [ ] Run `python manage.py check --deploy`
- [ ] Run `python manage.py migrate --plan` to verify migrations
- [ ] Test password reset flow end-to-end
- [ ] Load test with 100+ concurrent users (optional)
- [ ] Set up monitoring alerts (Sentry, Railway)

---

### 9. Monitoring & Alerts

#### Set Up These Alerts:

1. **Sentry:**
   - Error rate > 5/minute
   - 5xx response rate > 1%
   - Slow transactions > 1 second

2. **Railway:**
   - CPU usage > 80%
   - Memory usage > 80%
   - Deployment failures

3. **Custom Health Check:**
```python
# backend/api/views.py
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint for monitoring"""
    from django.db import connection
    
    try:
        # Check database connection
        connection.ensure_connection()
        
        return Response({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': timezone.now().isoformat(),
        })
    except Exception as e:
        return Response({
            'status': 'unhealthy',
            'error': str(e),
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
```

---

### 10. Performance Optimization Tips

1. **Enable Gzip Compression:**
```python
# settings.py
MIDDLEWARE = [
    'django.middleware.gzip.GZipMiddleware',
    # ... other middleware
]
```

2. **Cache Static Files:**
```python
# settings.py
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

3. **Add Database Indexes:**
   - Already done for most models
   - Check slow queries in Sentry and add indexes as needed

4. **Use Redis for Caching (Optional):**
```bash
pip install redis django-redis
```

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}
```

---

## Quick Start Commands

```bash
# Install production dependencies
cd backend
pip install -r requirements.txt

# Run production checks
python manage.py check --deploy

# Collect static files
python manage.py collectstatic --noinput

# Run migrations
python manage.py migrate

# Start production server
gunicorn myproject.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

---

## Support & Troubleshooting

### Common Issues:

1. **Rate Limit Errors:**
   - Check Railway logs: `railway logs`
   - Adjust rate limits in `views.py` if needed

2. **Email Not Sending:**
   - Verify API keys in Railway environment variables
   - Check Resend/SendGrid dashboard for delivery status
   - Test with: `python manage.py shell` → `send_mail(...)`

3. **Sentry Not Receiving Errors:**
   - Verify SENTRY_DSN is set
   - Test with: `raise Exception("Test error")` in a view
   - Check Sentry project settings

4. **Slow Queries:**
   - Enable query logging temporarily
   - Use Sentry Performance Monitoring
   - Add `select_related()` or `prefetch_related()` to viewsets

---

## Next Steps

1. Set up email service (Resend or SendGrid)
2. Configure Sentry error tracking
3. Test rate limiting with failed login attempts
4. Verify database backups in Railway
5. Set up monitoring alerts
6. Run load tests (optional)
7. Deploy to production! 🚀
