"""
Phase 9: Polish - Notifications, Dashboard Insights, Weekly Digest.

Endpoints for notification management, dashboard insights catalog/values,
and weekly digest aggregation.
"""

from datetime import datetime, timedelta

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    FOHTaskCompletion,
    Notification,
    ShiftSummary,
    WasteEntry,
)
from .serializers import NotificationSerializer


# =============================================================================
# Notifications
# =============================================================================

class NotificationViewSet(viewsets.ModelViewSet):
    """
    CRUD for user notifications.
    Users can only see their own notifications.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only see their own notifications.
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """
        POST /api/notifications/:id/mark-read/
        Marks a single notification as read.
        """
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """
        POST /api/notifications/mark-all-read/
        Marks all user's notifications as read.
        """
        count = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"marked_read": count}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        """
        GET /api/notifications/unread-count/
        Returns the count of unread notifications for the user.
        """
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})


# =============================================================================
# Dashboard Insights
# =============================================================================

# Catalog of available insights with their IDs and metadata.
INSIGHTS_CATALOG = [
    {
        "id": "tasks_completed_today",
        "title": "Tasks Completed Today",
        "description": "Number of FOH tasks completed today",
        "icon": "CheckCircle",
        "category": "operations",
    },
    {
        "id": "waste_today",
        "title": "Waste Today",
        "description": "Total waste cost for today",
        "icon": "TrendingDown",
        "category": "kitchen",
    },
    {
        "id": "shifts_logged",
        "title": "Shifts Logged",
        "description": "Number of shift summaries logged this week",
        "icon": "Calendar",
        "category": "operations",
    },
    {
        "id": "team_size",
        "title": "Team Size",
        "description": "Active team members count",
        "icon": "Users",
        "category": "team",
    },
    {
        "id": "open_complaints",
        "title": "Open Complaints",
        "description": "Guest complaints awaiting resolution",
        "icon": "AlertCircle",
        "category": "guest_recovery",
    },
    {
        "id": "upcoming_events",
        "title": "Upcoming Events",
        "description": "Calendar events in the next 7 days",
        "icon": "Calendar",
        "category": "calendar",
    },
]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_insights_catalog(request):
    """
    GET /api/dashboard/insights/catalog/
    Returns the full catalog of available insights.
    """
    return Response({"insights": INSIGHTS_CATALOG})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_insights_values(request):
    """
    GET /api/dashboard/insights/values/?ids=tasks_completed_today,waste_today
    Returns actual values for the requested insight IDs.
    """
    from .models import CalendarEvent, GuestComplaint, User
    
    requested_ids = request.GET.get('ids', '').split(',')
    requested_ids = [id.strip() for id in requested_ids if id.strip()]
    
    if not requested_ids:
        return Response({"values": {}})
    
    store = request.user.store
    today = timezone.now().date()
    week_start = today - timedelta(days=today.weekday())
    
    values = {}
    
    for insight_id in requested_ids:
        if insight_id == "tasks_completed_today":
            count = FOHTaskCompletion.objects.filter(
                template__store=store,
                date=today,
                completed_at__isnull=False
            ).count()
            values[insight_id] = {
                "value": count,
                "label": f"{count} tasks",
                "trend": None,
            }
        
        elif insight_id == "waste_today":
            total = WasteEntry.objects.filter(
                store=store,
                recorded_at__date=today
            ).aggregate(
                total=Sum('unit_price_at_time')
            )['total'] or 0
            values[insight_id] = {
                "value": float(total),
                "label": f"${total:.2f}",
                "trend": None,
            }
        
        elif insight_id == "shifts_logged":
            count = ShiftSummary.objects.filter(
                store=store,
                date__gte=week_start,
                date__lte=today
            ).count()
            values[insight_id] = {
                "value": count,
                "label": f"{count} shifts",
                "trend": None,
            }
        
        elif insight_id == "team_size":
            count = User.objects.filter(
                store=store,
                is_active=True
            ).count()
            values[insight_id] = {
                "value": count,
                "label": f"{count} members",
                "trend": None,
            }
        
        elif insight_id == "open_complaints":
            count = GuestComplaint.objects.filter(
                store=store,
                status__in=['open', 'in_progress']
            ).count()
            values[insight_id] = {
                "value": count,
                "label": f"{count} open",
                "trend": None,
            }
        
        elif insight_id == "upcoming_events":
            next_week = today + timedelta(days=7)
            count = CalendarEvent.objects.filter(
                store=store,
                starts_at__date__gte=today,
                starts_at__date__lte=next_week
            ).count()
            values[insight_id] = {
                "value": count,
                "label": f"{count} events",
                "trend": None,
            }
    
    return Response({"values": values})


# =============================================================================
# Weekly Digest
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def weekly_digest(request):
    """
    GET /api/weekly-digest/?week=YYYY-MM-DD
    Returns aggregated stats for the specified week.
    If no week is provided, uses the current week.
    """
    from .models import (
        CleaningCompletion,
        GuestComplaint,
        KitchenChecklistCompletion,
        TraineeAssignment,
    )
    
    # Parse week parameter (start of week date).
    week_param = request.GET.get('week')
    if week_param:
        try:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {"detail": "Invalid week format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        today = timezone.now().date()
        week_start = today - timedelta(days=today.weekday())
    
    week_end = week_start + timedelta(days=6)
    store = request.user.store
    
    # Aggregate stats for the week.
    digest = {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "shifts_logged": ShiftSummary.objects.filter(
            store=store,
            date__gte=week_start,
            date__lte=week_end
        ).count(),
        "foh_tasks_completed": FOHTaskCompletion.objects.filter(
            template__store=store,
            date__gte=week_start,
            date__lte=week_end,
            completed_at__isnull=False
        ).count(),
        "cleaning_tasks_completed": CleaningCompletion.objects.filter(
            task__store=store,
            date__gte=week_start,
            date__lte=week_end
        ).count(),
        "kitchen_tasks_completed": KitchenChecklistCompletion.objects.filter(
            template__store=store,
            date__gte=week_start,
            date__lte=week_end,
            completed_at__isnull=False
        ).count(),
        "waste_total": float(
            WasteEntry.objects.filter(
                store=store,
                recorded_at__date__gte=week_start,
                recorded_at__date__lte=week_end
            ).aggregate(total=Sum('unit_price_at_time'))['total'] or 0
        ),
        "waste_entries": WasteEntry.objects.filter(
            store=store,
            recorded_at__date__gte=week_start,
            recorded_at__date__lte=week_end
        ).count(),
        "complaints_received": GuestComplaint.objects.filter(
            store=store,
            occurred_at__date__gte=week_start,
            occurred_at__date__lte=week_end
        ).count(),
        "complaints_resolved": GuestComplaint.objects.filter(
            store=store,
            resolved_at__date__gte=week_start,
            resolved_at__date__lte=week_end
        ).count(),
        "training_completed": TraineeAssignment.objects.filter(
            plan__store=store,
            completed_at__date__gte=week_start,
            completed_at__date__lte=week_end
        ).count(),
    }
    
    return Response(digest)
