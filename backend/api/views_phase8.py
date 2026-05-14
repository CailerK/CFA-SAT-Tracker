"""
Phase 8: Calendar, Guest Recovery, Vendors, Team Chat, Surveys viewsets.

All viewsets inherit from StoreScopedViewSet to enforce multi-tenancy.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
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
    Manager+ can create/assign/resolve; all users can read.
    """
    queryset = GuestComplaint.objects.select_related(
        'assigned_to', 'created_by', 'store'
    )
    serializer_class = GuestComplaintSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

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
    Manager+ can create channels; all users can read.
    """
    queryset = ChatChannel.objects.prefetch_related('memberships')
    serializer_class = ChatChannelSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()


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
        # Non-managers can only see active surveys.
        if not self.request.user.is_manager_or_above:
            qs = qs.filter(status='active')
        return qs

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

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
