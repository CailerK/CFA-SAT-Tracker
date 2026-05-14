"""
Team domain endpoints (Phase 6).

  GET    /api/team/members/?status=active&q=                roster
  POST   /api/team/members/                                  add (manager+)
  PATCH  /api/team/members/:id/                              edit (manager+)
  DELETE /api/team/members/:id/                              deactivate (manager+)
  GET    /api/team/stats/                                    active / inactive / managers
  GET    /api/team/managers/                                 list of managers in store

  GET    /api/team/documentation/employees/?filter=          per-employee rollup
  GET    /api/team/documentation/stats/?window=60d           dashboard KPIs
  GET    /api/team/documentation/employees/:id/records/      employee history
  POST   /api/team/documentation/employees/:id/records/      add (manager+)
  PATCH  /api/team/documentation/records/:id/                edit (manager+)
  DELETE /api/team/documentation/records/:id/                delete (manager+)

  GET    /api/training/plans/                                list
  POST   /api/training/plans/                                create (manager+)
  GET    /api/training/trainees/?status=                     list trainees
  POST   /api/training/trainees/                             assign training (manager+)
  PATCH  /api/training/trainees/:id/                         update progress
  GET    /api/training/stats/                                KPI strip
  GET    /api/training/progress-by-department/               donut data

  GET    /api/team/quick-links/                              list
  POST   /api/team/quick-links/                              create (manager+)
  GET    /api/team/quick-links/categories/                   list
  POST   /api/team/quick-links/categories/                   create (manager+)
"""

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Department,
    EmployeeRecord,
    QuickLink,
    QuickLinkCategory,
    Store,
    TraineeAssignment,
    TrainingActivity,
    TrainingPlan,
    User,
)
from .permissions import ReadAllWriteManager
from .serializers import (
    EmployeeRecordSerializer,
    QuickLinkCategorySerializer,
    QuickLinkSerializer,
    TeamMemberSerializer,
    TraineeAssignmentSerializer,
    TrainingActivitySerializer,
    TrainingPlanSerializer,
)
from .viewsets import StoreScopedViewSet


# ============================================================================
# Team Members (User roster)
# ============================================================================

class TeamMemberViewSet(viewsets.ModelViewSet):
    """The Team Members page. Lists User objects in the requester's store."""
    serializer_class = TeamMemberSerializer
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return User.objects.none()
        qs = User.objects.all() if user.is_superuser else User.objects.filter(
            store=user.store
        )
        params = self.request.query_params

        # ?status=active|inactive|managers
        statuf = params.get("status")
        if statuf == "active":
            qs = qs.filter(is_active=True)
        elif statuf == "inactive":
            qs = qs.filter(is_active=False)
        elif statuf == "managers":
            qs = qs.filter(role__in=["manager", "shift_lead", "shift_leader",
                                      "director", "admin"])

        # ?dept=foh — filter by a single department slug.
        dept = params.get("dept")
        if dept:
            qs = qs.filter(departments__name=dept)

        # ?q= search across name + email.
        q = params.get("q") or params.get("search")
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(email__icontains=q)
            )
        return qs.distinct().order_by("first_name", "last_name", "id")

    def perform_create(self, serializer):
        # New members are always added to the requester's store.
        serializer.save(store=self.request.user.store)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def team_stats(request):
    """Pill-counter values for the Team page header."""
    user = request.user
    qs = User.objects.all() if user.is_superuser else User.objects.filter(
        store=user.store
    )
    return Response({
        "active": qs.filter(is_active=True).count(),
        "inactive": qs.filter(is_active=False).count(),
        "managers": qs.filter(
            role__in=["manager", "shift_lead", "shift_leader",
                      "director", "admin"]
        ).count(),
    })


# ============================================================================
# Documentation (EmployeeRecord)
# ============================================================================

def _user_in_store(user_id, requester):
    """Look up a target user, scoped to the requester's store."""
    try:
        u = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        raise NotFound("User not found.")
    if u.store_id != requester.store_id and not requester.is_superuser:
        raise NotFound("User not found.")
    return u


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def employee_records(request, user_id):
    """List / create documentation records for a specific employee."""
    target = _user_in_store(user_id, request.user)

    if request.method == "GET":
        rows = target.records.all().order_by("-recorded_at")
        return Response(EmployeeRecordSerializer(rows, many=True).data)

    # POST — manager+ only.
    from .permissions import is_manager_or_above
    if not is_manager_or_above(request.user):
        raise ValidationError("Manager role required to add records.")
    serializer = EmployeeRecordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(
        user=target,
        store=request.user.store,
        recorded_by=request.user,
    )
    return Response(serializer.data, status=status.HTTP_201_CREATED)


class EmployeeRecordViewSet(StoreScopedViewSet):
    """Standalone CRUD on individual records (edit/delete)."""
    serializer_class = EmployeeRecordSerializer
    queryset = EmployeeRecord.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().order_by("-recorded_at")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def documentation_stats(request):
    """KPI numbers for the Team Documentation page header."""
    user = request.user
    window_arg = request.query_params.get("window", "60d")
    try:
        days = int(window_arg.rstrip("d"))
    except ValueError:
        days = 60
    since = timezone.now() - timedelta(days=days)

    base = EmployeeRecord.objects.filter(store=user.store) if not user.is_superuser \
        else EmployeeRecord.objects.all()
    base = base.filter(recorded_at__gte=since)

    total = base.count()
    disciplinary = base.filter(kind__in=["warning", "pip"]).count()
    admin = base.filter(kind="admin").count()
    employees_with_docs = base.values("user").distinct().count()

    return Response({
        "total": total,
        "disciplinary": disciplinary,
        "admin": admin,
        "employees_with_docs": employees_with_docs,
        "window_days": days,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def documentation_employees(request):
    """Per-employee rollup: counts of disc/PIP/admin + latest record."""
    user = request.user
    qs = User.objects.filter(records__isnull=False)
    if not user.is_superuser:
        qs = qs.filter(store=user.store)

    filter_q = request.query_params.get("filter")
    if filter_q == "disciplinary":
        qs = qs.filter(records__kind__in=["warning", "pip"])
    elif filter_q == "pip":
        qs = qs.filter(records__kind="pip")
    elif filter_q == "admin":
        qs = qs.filter(records__kind="admin")

    search_q = request.query_params.get("q")
    if search_q:
        qs = qs.filter(
            Q(first_name__icontains=search_q)
            | Q(last_name__icontains=search_q)
        )

    rows = []
    for u in qs.distinct().prefetch_related("records")[:200]:
        recs = list(u.records.all().order_by("-recorded_at"))
        counts = {
            "disc": sum(1 for r in recs if r.kind == "warning"),
            "pip": sum(1 for r in recs if r.kind == "pip"),
            "admin": sum(1 for r in recs if r.kind == "admin"),
        }
        active_warns = counts["disc"] + counts["pip"]
        risk = "standard"
        if active_warns >= 3 or counts["pip"] > 0:
            risk = "high"
        elif active_warns >= 1:
            risk = "mid"
        latest = recs[0] if recs else None
        rows.append({
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}".strip() or u.email,
            "initials": u.initials,
            "role": u.role,
            "risk_level": risk,
            "counts": counts,
            "latest": {
                "id": latest.id,
                "title": latest.title,
                "kind": "warning" if latest.kind in {"warning", "pip"} else "admin",
                "date": latest.recorded_at.strftime("%b %-d"),
                "status": latest.status.capitalize(),
                "text": latest.body[:200],
            } if latest else None,
        })
    return Response(rows)


# ============================================================================
# Training
# ============================================================================

class TrainingPlanViewSet(StoreScopedViewSet):
    serializer_class = TrainingPlanSerializer
    queryset = TrainingPlan.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().filter(archived_at__isnull=True).order_by("name")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])


class TraineeAssignmentViewSet(viewsets.ModelViewSet):
    """Trainees actively going through a training plan."""
    serializer_class = TraineeAssignmentSerializer
    queryset = TraineeAssignment.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        user = self.request.user
        qs = TraineeAssignment.objects.select_related("user", "plan", "plan__department")
        if not user.is_superuser:
            qs = qs.filter(user__store=user.store)
        statuf = self.request.query_params.get("status")
        if statuf in {"in_progress", "completed", "paused"}:
            qs = qs.filter(status=statuf)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(user__first_name__icontains=q)
                | Q(user__last_name__icontains=q)
                | Q(plan__name__icontains=q)
            )
        return qs.order_by("-assigned_at", "-id")

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def training_stats(request):
    user = request.user
    qs = TraineeAssignment.objects.all()
    if not user.is_superuser:
        qs = qs.filter(user__store=user.store)
    active = qs.filter(status="in_progress").count()
    completed = qs.filter(status="completed").count()
    total = qs.count()
    completion_rate = round((completed / total) * 100) if total else 0
    # "New hires" = users created in the past 30 days.
    new_hires_q = User.objects.filter(
        created_at__gte=timezone.now() - timedelta(days=30)
    )
    if not user.is_superuser:
        new_hires_q = new_hires_q.filter(store=user.store)
    plans_q = TrainingPlan.objects.filter(archived_at__isnull=True)
    if not user.is_superuser:
        plans_q = plans_q.filter(store=user.store)
    return Response({
        "active_trainees": active,
        "completion_rate": completion_rate,
        "new_hires": new_hires_q.count(),
        "active_plans": plans_q.count(),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def training_progress_by_department(request):
    """For the donut chart: average progress % per department."""
    user = request.user
    qs = TraineeAssignment.objects.all().select_related("plan__department")
    if not user.is_superuser:
        qs = qs.filter(user__store=user.store)
    buckets = {}
    for a in qs:
        dept = a.plan.department.display_name if (a.plan and a.plan.department) else "Other"
        buckets.setdefault(dept, []).append(a.progress_percent)
    rows = []
    for name, percents in buckets.items():
        avg = round(sum(percents) / len(percents)) if percents else 0
        rows.append({"name": name, "progress": avg})
    return Response(rows)


# ============================================================================
# Quick Links
# ============================================================================

class QuickLinkCategoryViewSet(StoreScopedViewSet):
    serializer_class = QuickLinkCategorySerializer
    queryset = QuickLinkCategory.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().filter(archived_at__isnull=True).order_by(
            "order", "id"
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])


class QuickLinkViewSet(StoreScopedViewSet):
    serializer_class = QuickLinkSerializer
    queryset = QuickLink.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().filter(archived_at__isnull=True).order_by(
            "order", "id"
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])
