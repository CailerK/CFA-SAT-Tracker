"""
Phase 8: Calendar, Guest Recovery, Vendors, Team Chat, Surveys viewsets.

All viewsets inherit from StoreScopedViewSet to enforce multi-tenancy.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import (
    CalendarEvent,
    ChatChannel,
    ChatMembership,
    ChatMessage,
    GuestComplaint,
    Survey,
    SurveyAnswer,
    SurveyQuestion,
    SurveyResponse,
    User,
    Vendor,
)
from .permissions import IsManagerOrAbove
from .serializers import (
    CalendarEventSerializer,
    ChatChannelSerializer,
    ChatMembershipSerializer,
    ChatMessageSerializer,
    GuestComplaintSerializer,
    SurveyAnswerSerializer,
    SurveyQuestionSerializer,
    SurveyResponseSerializer,
    SurveySerializer,
    VendorSerializer,
)
from .viewsets import StoreScopedViewSet


# =============================================================================
# Calendar
# =============================================================================

class CalendarEventViewSet(StoreScopedViewSet):
    """
    CRUD for calendar events.
    Manager+ can create/edit; all users can read.
    """
    queryset = CalendarEvent.objects.select_related('created_by', 'store')
    serializer_class = CalendarEventSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='upcoming')
    def upcoming(self, request):
        """
        GET /api/calendar/upcoming/
        Returns events starting today or later, limited to next 30 days.
        """
        from datetime import timedelta
        today = timezone.now()
        end_date = today + timedelta(days=30)
        qs = self.get_queryset().filter(
            starts_at__gte=today,
            starts_at__lte=end_date
        )
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# =============================================================================
# Guest Recovery
# =============================================================================

class GuestComplaintViewSet(StoreScopedViewSet):
    """
    CRUD for guest complaints.

    Permissions: manager+ for **every** action (list, retrieve, create,
    update, destroy, assign, resolve, stats). Guest contact info and
    incident details are sensitive and shouldn't be visible to team
    members — the whole feature is manager-and-above only.
    """
    queryset = GuestComplaint.objects.select_related(
        'assigned_to', 'created_by', 'store'
    )
    serializer_class = GuestComplaintSerializer
    permission_classes = [IsManagerOrAbove]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='assign')
    def assign(self, request, pk=None):
        """
        POST /api/guest-complaints/:id/assign/
        Body: { "assigned_to": user_id }
        
        Assigns the complaint to a team member.
        """
        complaint = self.get_object()
        user_id = request.data.get('assigned_to')
        
        if not user_id:
            return Response(
                {"detail": "assigned_to is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        complaint.assigned_to_id = user_id
        complaint.status = 'in_progress'
        complaint.save()
        
        return Response(
            self.get_serializer(complaint).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """
        POST /api/guest-complaints/:id/resolve/
        Body: { "resolution": "..." }
        
        Marks the complaint as resolved.
        """
        complaint = self.get_object()
        resolution = request.data.get('resolution', '')
        
        complaint.status = 'resolved'
        complaint.resolution = resolution
        complaint.resolved_at = timezone.now()
        complaint.save()
        
        return Response(
            self.get_serializer(complaint).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        GET /api/guest-complaints/stats/
        Returns: { "total": X, "open": Y, "in_progress": Z, "resolved": W }
        """
        qs = self.get_queryset()
        return Response({
            "total": qs.count(),
            "open": qs.filter(status='open').count(),
            "in_progress": qs.filter(status='in_progress').count(),
            "resolved": qs.filter(status='resolved').count(),
        })


# =============================================================================
# Vendors
# =============================================================================

class VendorViewSet(StoreScopedViewSet):
    """
    CRUD for vendor directory.
    Manager+ can create/edit; all users can read.
    """
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()


# =============================================================================
# Team Chat
# =============================================================================

class ChatChannelViewSet(StoreScopedViewSet):
    """
    CRUD for chat channels.

    Permissions:
      - Read: any member of the store.
      - Create: any authenticated user (everyone can spin up a custom group).
      - Update / partial-update / Save Messaging Permissions: manager+ OR
        the creator of the channel (owner can run their own group).
      - Destroy: same as update, BUT default channels (`is_default=True`)
        can never be destroyed regardless of role.
    """
    queryset = ChatChannel.objects.prefetch_related('memberships')
    serializer_class = ChatChannelSerializer

    def get_permissions(self):
        # Object-level checks (creator vs. manager) happen in the action
        # methods below; class-level we just require auth so creators can
        # reach their own channels.
        return super().get_permissions()

    def _user_can_manage(self, user, channel):
        """Manager+ OR the channel's creator may mutate the channel."""
        from .permissions import is_manager_or_above
        if is_manager_or_above(user):
            return True
        return bool(channel.created_by_id and channel.created_by_id == user.id)

    def perform_create(self, serializer):
        # Auto-tag the creator and join them so they're owner+member.
        instance = serializer.save(created_by=self.request.user)
        ChatMembership.objects.get_or_create(channel=instance, user=self.request.user)

    def update(self, request, *args, **kwargs):
        channel = self.get_object()
        if not self._user_can_manage(request.user, channel):
            return Response(
                {"detail": "Only the group owner or a manager can edit this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        channel = self.get_object()
        if not self._user_can_manage(request.user, channel):
            return Response(
                {"detail": "Only the group owner or a manager can edit this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        channel = self.get_object()
        if channel.is_default:
            return Response(
                {"detail": "Default groups cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not self._user_can_manage(request.user, channel):
            return Response(
                {"detail": "Only the group owner or a manager can delete this group."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        channel = self.get_object()
        membership, _ = ChatMembership.objects.get_or_create(
            channel=channel,
            user=request.user,
        )
        membership.last_read_at = timezone.now()
        membership.save(update_fields=['last_read_at'])
        return Response({
            "status": "ok",
            "last_read_at": membership.last_read_at,
        })

    @action(detail=True, methods=['get', 'post'], url_path='members')
    def members(self, request, pk=None):
        """GET roster / POST {user_ids:[]} to bulk-add."""
        from .permissions import is_manager_or_above
        channel = self.get_object()
        if request.method == 'GET':
            qs = channel.memberships.select_related('user').order_by('joined_at')
            data = []
            for m in qs:
                u = m.user
                first = (u.first_name or u.email or '?')[:1]
                last = (u.last_name or '')[:1]
                data.append({
                    "id": m.id,
                    "user_id": u.id,
                    "name": u.get_full_name() or u.email,
                    "initials": (first + last).upper(),
                    "role": getattr(u, 'role', '') or '',
                    "is_admin": bool(getattr(u, 'is_admin', False)),
                    "is_superuser": bool(getattr(u, 'is_superuser', False)),
                    "department": getattr(u, 'department', '') or '',
                    "shift": getattr(u, 'shift_preference', '') or '',
                    "joined_at": m.joined_at.isoformat() if m.joined_at else None,
                })
            return Response(data)

        if not self._user_can_manage(request.user, channel):
            return Response(
                {"detail": "Only the group owner or a manager can add members."},
                status=status.HTTP_403_FORBIDDEN,
            )
        user_ids = request.data.get('user_ids', []) or []
        if not isinstance(user_ids, list):
            return Response({"detail": "user_ids must be a list."}, status=status.HTTP_400_BAD_REQUEST)
        from django.contrib.auth import get_user_model
        User = get_user_model()
        added = 0
        for uid in user_ids:
            try:
                u = User.objects.get(id=int(uid), store=request.user.store)
            except (User.DoesNotExist, ValueError, TypeError):
                continue
            _, was = ChatMembership.objects.get_or_create(channel=channel, user=u)
            if was:
                added += 1
        return Response({"added": added, "total_members": channel.memberships.count()})

    @action(detail=True, methods=['delete'], url_path='members/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        """Manager+ removes anyone; user may always remove themselves (leave)."""
        from .permissions import is_manager_or_above
        channel = self.get_object()
        try:
            uid = int(user_id)
        except (TypeError, ValueError):
            return Response(status=status.HTTP_400_BAD_REQUEST)
        is_self = uid == request.user.id
        if not (is_self or is_manager_or_above(request.user)):
            return Response({"detail": "Manager role required."}, status=status.HTTP_403_FORBIDDEN)
        ChatMembership.objects.filter(channel=channel, user_id=uid).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChatMessageViewSet(StoreScopedViewSet):
    """
    CRUD for chat messages.
    All users can post messages; messages are scoped by channel membership.
    """
    queryset = ChatMessage.objects.select_related('author', 'channel')
    serializer_class = ChatMessageSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        # Filter to channels the user is a member of.
        user_channels = ChatMembership.objects.filter(
            user=self.request.user
        ).values_list('channel_id', flat=True)
        return qs.filter(channel_id__in=user_channels)

    def perform_create(self, serializer):
        channel = serializer.validated_data["channel"]
        # Role-gated channels: if allowed_roles is non-empty, only those roles
        # (or admin/superuser) may post.
        allowed = list(channel.allowed_roles or [])
        if allowed:
            user_role = getattr(self.request.user, 'role', '') or ''
            is_admin = bool(getattr(self.request.user, 'is_admin', False)
                            or getattr(self.request.user, 'is_superuser', False))
            if not is_admin and user_role not in allowed:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    "Your role is not permitted to send messages in this group."
                )
        ChatMembership.objects.get_or_create(channel=channel, user=self.request.user)
        serializer.save(author=self.request.user)

    @action(detail=False, methods=['get'], url_path='channel/(?P<channel_id>[^/.]+)')
    def by_channel(self, request, channel_id=None):
        """
        GET /api/chat/messages/channel/:channel_id/
        Returns messages for a specific channel.
        """
        qs = self.get_queryset().filter(channel_id=channel_id).order_by('created_at')
        # Limit to last 100 messages for performance.
        qs = qs[:100]
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)


# =============================================================================
# Surveys
# =============================================================================

class SurveyViewSet(StoreScopedViewSet):
    """
    CRUD for surveys.
    Manager+ can create/edit; all users can read active surveys.
    """
    queryset = Survey.objects.prefetch_related('questions')
    serializer_class = SurveySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_q = self.request.query_params.get('status')
        if status_q:
            qs = qs.filter(status=status_q)
        # Non-managers can only see active surveys.
        if not self.request.user.is_manager_or_above:
            qs = qs.filter(status='active')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def perform_create(self, serializer):
        survey = serializer.save(created_by=self.request.user)
        questions = self.request.data.get('questions', [])
        if questions and not isinstance(questions, list):
            raise ValidationError({"questions": "Expected a list of question objects."})
        for index, question in enumerate(questions):
            text = (question.get('text') or '').strip()
            kind = question.get('kind') or 'text'
            if not text or kind not in {'text', 'rating', 'multiple_choice', 'yes_no'}:
                continue
            SurveyQuestion.objects.create(
                survey=survey,
                text=text,
                kind=kind,
                options=question.get('options') or [],
                order=index,
                required=bool(question.get('required', False)),
            )

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        surveys = list(self.get_queryset()[:200])
        visible = len(surveys)
        active = sum(1 for survey in surveys if survey.status == 'active')
        responses = sum(survey.responses.count() for survey in surveys)
        team_size = max(1, User.objects.filter(
            store=request.user.store,
            is_active=True,
        ).count())
        avg_rate = 0
        if surveys:
            avg_rate = round(
                sum(
                    min(100, round((survey.responses.count() / team_size) * 100))
                    for survey in surveys
                ) / visible
            )
        return Response({
            "visible": visible,
            "active": active,
            "responses": responses,
            "avg_rate": avg_rate,
        })

    @action(detail=True, methods=['post'], url_path='respond')
    def respond(self, request, pk=None):
        """
        POST /api/surveys/:id/respond/
        Body: { "answers": [{"question": id, "value": ...}, ...] }
        
        Submits a response to the survey.
        """
        survey = self.get_object()
        
        if survey.status != 'active':
            return Response(
                {"detail": "Survey is not active."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        answers_data = request.data.get('answers', [])
        
        # Create the response.
        response = SurveyResponse.objects.create(
            survey=survey,
            user=None if survey.is_anonymous else request.user
        )
        
        # Create answers.
        for answer_data in answers_data:
            SurveyAnswer.objects.create(
                response=response,
                question_id=answer_data['question'],
                value=answer_data['value']
            )
        
        return Response(
            SurveyResponseSerializer(response, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['get'], url_path='results')
    def results(self, request, pk=None):
        """
        GET /api/surveys/:id/results/
        Returns aggregated survey results (manager-only).
        """
        if not request.user.is_manager_or_above:
            return Response(
                {"detail": "Only managers can view survey results."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        survey = self.get_object()
        responses = survey.responses.prefetch_related('answers__question')
        
        serializer = SurveyResponseSerializer(responses, many=True, context={'request': request})
        return Response({
            "survey": self.get_serializer(survey).data,
            "responses": serializer.data,
            "total_responses": responses.count(),
        })
