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
    CalendarEvent,
    Evaluation360,
    EvaluationEvaluator,
    FOHTaskCompletion,
    Notification,
    ShiftSummary,
    TraineeAssignment,
    UserDevelopmentPlan,
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
        # Sensitive notifications (requires_manager=True) are hidden from
        # team-member roles — used for guest concerns, disciplinary docs,
        # 360 results, etc.
        from .permissions import is_manager_or_above
        qs = Notification.objects.filter(user=self.request.user)
        if not is_manager_or_above(self.request.user):
            qs = qs.filter(requires_manager=False)
        return qs

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
                shift_date__gte=week_start,
                shift_date__lte=today
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
    Operator Overview — admin-only weekly summary across Evaluations,
    Documentation, Training, Leadership Roadmaps, and Team Overview.
    Range defaults to "last 7 days" ending today; ?week=YYYY-MM-DD picks the
    week starting on that date.
    """
    from .permissions import is_admin_or_above
    from .models import (
        EmployeeRecord,
        Evaluation360,
        TraineeAssignment,
        TrainingPlan,
        UserDevelopmentPlan,
    )
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if not is_admin_or_above(request.user):
        return Response({"detail": "Admins only."}, status=status.HTTP_403_FORBIDDEN)

    week_param = request.GET.get('week')
    if week_param:
        try:
            week_start = datetime.strptime(week_param, '%Y-%m-%d').date()
            week_end = week_start + timedelta(days=6)
        except ValueError:
            return Response(
                {"detail": "Invalid week format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        today = timezone.localdate()
        week_end = today
        week_start = today - timedelta(days=6)

    store = request.user.store
    now = timezone.now()
    today = timezone.localdate()

    # ---------- Evaluations ----------
    evals = Evaluation360.objects.filter(store=store)
    eval_completed = evals.filter(status='completed').count()
    eval_pending = evals.filter(status='in_progress').count()
    eval_overdue_qs = evals.filter(
        status='in_progress', due_date__lt=today
    ).select_related('evaluatee').order_by('due_date')
    eval_overdue = eval_overdue_qs.count()
    evaluations_overdue_items = [
        {
            "id": e.id,
            "name": (e.evaluatee.get_full_name() or e.evaluatee.email),
            "role": (getattr(e.evaluatee, 'role', '') or 'Team Member').replace('_', ' ').title(),
            "due_iso": e.due_date.isoformat() if e.due_date else None,
        }
        for e in eval_overdue_qs[:10]
    ]

    # ---------- Documentation ----------
    records = EmployeeRecord.objects.filter(store=store)
    doc_disciplinary = records.filter(kind='warning').count()
    doc_pips = records.filter(kind='pip').count()
    doc_admin = records.filter(kind='admin').count()
    recent_disciplinary = [
        {
            "id": r.id,
            "name": r.employee.get_full_name() or r.employee.email,
            "role": (getattr(r.employee, 'role', '') or 'Team Member').replace('_', ' ').title(),
            "label": (r.title or 'Warning'),
        }
        for r in records.filter(kind='warning')
                       .select_related('employee')
                       .order_by('-created_at')[:5]
    ]
    recent_admin = [
        {
            "id": r.id,
            "name": r.employee.get_full_name() or r.employee.email,
            "role": (getattr(r.employee, 'role', '') or 'Team Member').replace('_', ' ').title(),
            "label": (r.title or 'Admin'),
        }
        for r in records.filter(kind='admin')
                       .select_related('employee')
                       .order_by('-created_at')[:5]
    ]
    active_perf_plans = [
        {
            "id": r.id,
            "name": r.employee.get_full_name() or r.employee.email,
            "goals_text": "Pending Acknowledgment",
        }
        for r in records.filter(kind='pip', status='active')
                       .select_related('employee')
                       .order_by('-created_at')[:10]
    ]
    pending_ack_qs = records.filter(status='active', acknowledged_at__isnull=True)
    pending_ack_total = pending_ack_qs.count()
    pending_ack_items = [
        {
            "id": r.id,
            "name": r.employee.get_full_name() or r.employee.email,
            "role": (getattr(r.employee, 'role', '') or 'Team Member').replace('_', ' ').title(),
        }
        for r in pending_ack_qs.select_related('employee').order_by('-created_at')[:10]
    ]

    # ---------- Training ----------
    training = TraineeAssignment.objects.filter(plan__store=store)
    training_completed = training.filter(status='completed').count()
    training_in_progress = training.filter(status='in_progress').count()
    training_overdue = 0  # TraineeAssignment has no due date today; placeholder.
    in_progress_items = []
    for t in (training.filter(status='in_progress')
                      .select_related('user', 'plan', 'assigned_by')
                      .order_by('-assigned_at')[:10]):
        total = getattr(t.plan, 'total_steps', 0) or 0
        pct = int(round((t.completed_steps / total) * 100)) if total else 0
        in_progress_items.append({
            "id": t.id,
            "name": t.user.get_full_name() or t.user.email,
            "plan": getattr(t.plan, 'title', '') or getattr(t.plan, 'name', '') or 'Training plan',
            "percent": pct,
            "trainer": (t.assigned_by.get_full_name() if t.assigned_by else None),
        })

    # ---------- Leadership Roadmaps ----------
    dev_plans = UserDevelopmentPlan.objects.filter(user__store=store)
    lead_active = dev_plans.exclude(status='completed').count()
    lead_completed = dev_plans.filter(status='completed').count()
    # Average progress across active enrollments.
    active_qs = dev_plans.exclude(status='completed')
    avg_progress = 0
    if active_qs.exists():
        total = sum(p.progress_percent for p in active_qs)
        avg_progress = int(round(total / active_qs.count()))
    active_roadmaps = []
    for p in (active_qs.select_related('user')
                       .order_by('-started_at')[:10]):
        active_roadmaps.append({
            "id": p.id,
            "name": p.user.get_full_name() or p.user.email,
            "dept": (getattr(p.user, 'department', None) or 'Kitchen'),
            "percent": p.progress_percent,
        })

    # ---------- Team Overview ----------
    team_users = User.objects.filter(store=store, is_active=True)
    active_users = team_users.count()
    new_hires_qs = team_users.filter(date_joined__date__gte=week_start)
    new_hires = new_hires_qs.count()
    last_login_floor = now - timedelta(days=7)
    recently_active = team_users.filter(last_login__gte=last_login_floor).count()
    activity_rate = int(round((recently_active / active_users) * 100)) if active_users else 0
    recent_new_hires = [
        {
            "id": u.id,
            "name": u.get_full_name() or u.email,
            "role": (getattr(u, 'role', '') or 'Team Member').replace('_', ' ').title(),
            "date_iso": u.date_joined.date().isoformat(),
        }
        for u in new_hires_qs.order_by('-date_joined')[:8]
    ]

    return Response({
        "range": {"start": week_start.isoformat(), "end": week_end.isoformat()},
        "hero": {
            "user_name": (request.user.get_full_name() or request.user.email.split('@')[0]),
            "date_iso": today.isoformat(),
            "store_count": 1,
        },
        "evaluations": {
            "completed": eval_completed,
            "pending": eval_pending,
            "overdue": eval_overdue,
            "overdue_items": evaluations_overdue_items,
        },
        "documentation": {
            "disciplinary": doc_disciplinary,
            "pips": doc_pips,
            "admin": doc_admin,
            "recent_disciplinary": recent_disciplinary,
            "recent_admin": recent_admin,
            "active_performance_plans": active_perf_plans,
            "pending_acknowledgment_total": pending_ack_total,
            "pending_acknowledgment_items": pending_ack_items,
        },
        "training": {
            "completed": training_completed,
            "in_progress": training_in_progress,
            "overdue": training_overdue,
            "in_progress_items": in_progress_items,
        },
        "leadership": {
            "active": lead_active,
            "goals_done": lead_completed,
            "avg_progress": avg_progress,
            "active_roadmaps": active_roadmaps,
        },
        "team_overview": {
            "active_users": active_users,
            "new_hires": new_hires,
            "recently_active": recently_active,
            "activity_rate": activity_rate,
            "recent_new_hires": recent_new_hires,
        },
    })


# =============================================================================
# Dashboard "My Priorities"
# =============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_priorities(request):
    """Aggregate the current user's open priorities across the app.

    Sources:
      - Active development plans (assigned by manager, with deadlines)
      - Active training plan assignments (in_progress)
      - Upcoming calendar 'deadline' events (next 14 days, store-scoped)
      - 360 evaluations where the user is an evaluator and hasn't completed

    Returned shape:
        {
          "count": N,
          "items": [
            {
              "id": "plan:42",
              "kind": "development_plan" | "training" | "deadline" | "evaluation_360",
              "title": "Heart of Leadership",
              "subtitle": "Recommended task - weekly frequency",
              "due_at": "2026-05-20",  // ISO date, or null
              "is_overdue": bool,
              "navigate_to": "leadership-dev-plans" | "training" | ...
            },
            ...
          ]
        }
    """
    user = request.user
    today = timezone.localdate()
    horizon = today + timedelta(days=14)
    items = []

    # 1) Assigned development plans not yet complete.
    dev_plans = UserDevelopmentPlan.objects.filter(
        user=user,
    ).exclude(status='completed').order_by('deadline', '-started_at')
    for p in dev_plans:
        # Only surface assigned (manager-pushed) plans OR any plan with a deadline.
        if not p.assigned_by_id and not p.deadline:
            continue
        due = p.deadline
        items.append({
            "id": f"dev_plan:{p.id}",
            "kind": "development_plan",
            "title": p.plan_key.replace('-', ' ').title(),
            "subtitle": "Assigned development plan"
                        + (f" — {p.current_step}/{p.total_steps} steps" if p.total_steps else ""),
            "due_at": due.isoformat() if due else None,
            "is_overdue": bool(due and due < today),
            "navigate_to": "leadership-dev-plans",
        })

    # 2) Active training assignments.
    training = TraineeAssignment.objects.filter(
        user=user, status='in_progress',
    ).select_related('plan').order_by('assigned_at')
    for t in training:
        items.append({
            "id": f"training:{t.id}",
            "kind": "training",
            "title": t.plan.title if hasattr(t.plan, 'title') else str(t.plan),
            "subtitle": f"Training plan — step {t.completed_steps} of "
                        f"{getattr(t.plan, 'total_steps', '?')}",
            "due_at": None,
            "is_overdue": False,
            "navigate_to": "team-training",
        })

    # 3) Upcoming calendar deadlines (store-scoped).
    if user.store_id:
        deadlines = CalendarEvent.objects.filter(
            store=user.store,
            category='deadline',
            starts_at__date__gte=today - timedelta(days=1),
            starts_at__date__lte=horizon,
        ).order_by('starts_at')[:10]
        for ev in deadlines:
            d = ev.starts_at.date()
            items.append({
                "id": f"deadline:{ev.id}",
                "kind": "deadline",
                "title": ev.title,
                "subtitle": "Upcoming deadline",
                "due_at": d.isoformat(),
                "is_overdue": d < today,
                "navigate_to": "calendar",
            })

    # 4) 360 evaluations where this user is an evaluator and hasn't submitted.
    pending_evals = EvaluationEvaluator.objects.filter(
        user=user, completed_at__isnull=True,
        evaluation__status='in_progress',
    ).select_related('evaluation', 'evaluation__evaluatee', 'evaluation__template')[:10]
    for ee in pending_evals:
        ev = ee.evaluation
        due = ev.due_date
        items.append({
            "id": f"eval360:{ee.id}",
            "kind": "evaluation_360",
            "title": f"360 for {ev.evaluatee.get_full_name() or ev.evaluatee.email}",
            "subtitle": f"{ev.template.name if ev.template else 'Evaluation'} — your input needed",
            "due_at": due.isoformat() if due else None,
            "is_overdue": bool(due and due < today),
            "navigate_to": "leadership-360",
        })

    # Sort: overdue first, then by due date ascending, then by kind.
    def sort_key(p):
        return (0 if p['is_overdue'] else 1,
                p['due_at'] or '9999-12-31',
                p['kind'])
    items.sort(key=sort_key)

    return Response({
        "count": len(items),
        "items": items,
    })
