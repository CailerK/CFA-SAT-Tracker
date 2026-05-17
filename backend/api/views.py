import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.views.decorators.csrf import csrf_exempt
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Notification, User
from .serializers import UserMeSerializer

logger = logging.getLogger(__name__)


PASSWORD_RESET_GENERIC_MESSAGE = (
    'If an account with that email exists, a password reset link has been sent.'
)


def _as_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'y', 'on'}
    return False


def _build_frontend_url(path):
    base = (settings.FRONTEND_URL or 'http://localhost:3000').rstrip('/')
    suffix = path if path.startswith('/') else f'/{path}'
    return f'{base}{suffix}'


def _password_reset_notification_recipients():
    super_admins = list(
        User.objects.filter(is_active=True, is_superuser=True).order_by('id')
    )
    if super_admins:
        return super_admins
    # Fallback for environments that have only app-level admins configured.
    return list(User.objects.filter(is_active=True, is_admin=True).order_by('id'))


def _notify_password_reset_event(user, *, event):
    recipients = _password_reset_notification_recipients()
    if not recipients:
        return

    created_at = timezone.now()
    actor_name = f'{user.first_name} {user.last_name}'.strip() or user.email
    store_name = user.store.name if user.store else (user.company_id or 'Unknown store')
    if event == 'requested':
        title = 'Password reset requested'
        message = (
            f'{actor_name} ({user.email}) requested a password reset for {store_name}.'
        )
    else:
        title = 'Password reset completed'
        message = (
            f'{actor_name} ({user.email}) completed a password reset for {store_name}.'
        )

    Notification.objects.bulk_create([
        Notification(
            user=recipient,
            notification_type='system_update',
            title=title,
            message=message,
            action_url='/team-members',
            requires_manager=True,
            created_at=created_at,
        )
        for recipient in recipients
    ])


def _send_password_reset_email(user, reset_url):
    context = {
        'user': user,
        'reset_url': reset_url,
        'store_name': user.store.name if user.store else 'CFA SAT Tracker',
        'support_email': settings.DEFAULT_FROM_EMAIL,
        'expiry_hours': 24,
        'current_year': timezone.localdate().year,
    }
    subject = 'Reset your CFA SAT Tracker password'
    text_body = render_to_string('emails/password_reset.txt', context)
    html_body = render_to_string('emails/password_reset.html', context)

    email = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[user.email],
    )
    email.attach_alternative(html_body, 'text/html')
    email.send(fail_silently=False)


@api_view(['GET'])
@permission_classes([AllowAny])
def hello_world(request):
    return Response({
        'message': 'Hello from Django backend!',
        'status': 'Backend is running',
        'framework': 'Django + DRF'
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def api_status(request):
    return Response({
        'api': 'active',
        'version': '1.0.0',
        'endpoints': [
            '/api/hello/',
            '/api/status/',
            '/api/auth/login/',
            '/api/auth/logout/',
            '/api/auth/me/',
            '/api/auth/forgot-password/',
            '/api/auth/reset-password/'
        ]
    })

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
@ratelimit(key='ip', rate='5/15m', method='POST', block=True)
def login_view(request):
    """Handle user login with email and password
    
    Rate limited to 5 attempts per 15 minutes per IP address.
    """
    try:
        data = json.loads(request.body)
        email = (data.get('email') or '').strip().lower()
        password = data.get('password')
        remember_me = _as_bool(data.get('remember_me'))
        
        if not email or not password:
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            login(request, user)
            if remember_me:
                request.session.set_expiry(settings.SESSION_COOKIE_AGE)
            else:
                request.session.set_expiry(0)
            request.session.modified = True
            return Response({
                'message': 'Login successful',
                'user': UserMeSerializer(user).data,
                'remember_me': remember_me,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except json.JSONDecodeError:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception('Unexpected error during login')
        return Response({
            'error': 'An error occurred during login'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Handle user logout"""
    logout(request)
    return Response({
        'message': 'Logout successful'
    }, status=status.HTTP_200_OK)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current authenticated user info, including their assigned Store.

    Returns the richer UserMeSerializer payload so the frontend has the
    store + settings on a single round-trip after login.
    """
    return Response(
        {"user": UserMeSerializer(request.user).data},
        status=status.HTTP_200_OK,
    )

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
@ratelimit(key='ip', rate='3/1h', method='POST', block=True)
def forgot_password(request):
    """Handle forgot password request
    
    Rate limited to 3 attempts per hour per IP address.
    """
    try:
        data = json.loads(request.body)
        email = (data.get('email') or '').strip().lower()
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email__iexact=email, is_active=True)
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({
                'message': PASSWORD_RESET_GENERIC_MESSAGE
            }, status=status.HTTP_200_OK)
        
        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_url = _build_frontend_url(f'/reset-password/{uid}/{token}/')
        
        try:
            _send_password_reset_email(user, reset_url)
            _notify_password_reset_event(user, event='requested')
        except Exception:
            logger.exception('Failed to send password reset email for %s', user.email)
            return Response({
                'error': 'Failed to send reset email. Please try again later.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'message': PASSWORD_RESET_GENERIC_MESSAGE
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception('Unexpected error during forgot-password flow')
        return Response({
            'error': 'An error occurred processing your request'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def reset_password(request):
    """Handle password reset with token"""
    try:
        data = json.loads(request.body)
        uid = data.get('uid')
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not all([uid, token, new_password]):
            return Response({
                'error': 'UID, token, and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Decode the user ID
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({
                'error': 'Invalid reset link'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if token is valid
        if not default_token_generator.check_token(user, token):
            return Response({
                'error': 'Invalid or expired reset link'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({
                'error': exc.messages[0] if exc.messages else 'Password is not valid',
                'details': exc.messages,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Set new password
        user.set_password(new_password)
        user.save(update_fields=['password'])
        _notify_password_reset_event(user, event='completed')
        
        return Response({
            'message': 'Password has been reset successfully'
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception('Unexpected error during password reset')
        return Response({
            'error': 'An error occurred resetting your password'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
