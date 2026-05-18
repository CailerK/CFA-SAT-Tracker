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

        # ?ordering=name|-name|email|role|-role|recent|-recent
        # `name` sorts by first_name then last_name; `recent` is created_at.
        ordering = (params.get("ordering") or "").strip()
        order_map = {
            "name":      ["first_name", "last_name", "id"],
            "-name":     ["-first_name", "-last_name", "-id"],
            "email":     ["email", "id"],
            "-email":    ["-email", "-id"],
            "role":      ["role", "first_name", "last_name"],
            "-role":     ["-role", "first_name", "last_name"],
            "recent":    ["-created_at", "-id"],
            "-recent":   ["created_at", "id"],
        }
        order_fields = order_map.get(ordering) or [
            "first_name", "last_name", "id",
        ]
        return qs.distinct().order_by(*order_fields)

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
    """Standalone CRUD on individual records (edit/delete).

    Plus an `acknowledge` action that's open to the record's subject (the
    user named in `record.user`) so employees can sign off on their own
    warnings / PIPs. Managers can also acknowledge on behalf of someone
    when needed.
    """
    serializer_class = EmployeeRecordSerializer
    queryset = EmployeeRecord.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().order_by("-recorded_at")

    def perform_create(self, serializer):
        # Auto-flag warnings + PIPs as needing employee acknowledgement.
        kind = serializer.validated_data.get("kind", "")
        requires = serializer.validated_data.get("requires_acknowledgement")
        if requires is None:
            requires = kind in {"warning", "pip"}
        serializer.save(
            recorded_by=self.request.user,
            requires_acknowledgement=requires,
        )

    def get_permissions(self):
        if self.action == "acknowledge":
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=True, methods=["post"], url_path="acknowledge")
    def acknowledge(self, request, pk=None):
        """
        POST /api/team/documentation/records/:id/acknowledge/
        The record's subject (or a manager+) marks the record acknowledged.
        Returns the updated record.
        """
        from .permissions import is_manager_or_above
        record = self.get_object()
        is_subject = record.user_id == request.user.id
        if not (is_subject or is_manager_or_above(request.user)):
            return Response(
                {"detail": "Only the employee named in the record (or a manager) can acknowledge."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if record.acknowledged_at is None:
            record.acknowledged_at = timezone.now()
            record.acknowledged_by = request.user
            record.save(update_fields=["acknowledged_at", "acknowledged_by"])
        return Response(self.get_serializer(record).data)


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


# ---- Risk classification (shared by /employees/ and /analytics/) ------------

# 7 risk buckets, surfaced in the Documentation Analytics page's "Risk Level
# Distribution" chart. Order matters — it's also the display order in the UI,
# and the precedence used by `_classify_risk` (first match wins, top-down).
RISK_BUCKETS = [
    ("final_warning", "Final Warning"),
    ("excessive",     "Excessive (>3 docs)"),
    ("critical",      "Critical"),
    ("high",          "High"),
    ("medium",        "Medium"),
    ("low",           "Low"),
    ("none",          "None"),
]


def _classify_risk(records):
    """Bucket an employee into one of RISK_BUCKETS based on their records.

    Rules (first match wins, evaluated top-down):
      - final_warning: any record whose title contains "final warning"
                       (case-insensitive). This is the most severe state — a
                       single mis-step away from termination.
      - excessive: 4+ disciplinary records (warnings + PIPs) total.
      - critical: at least one active PIP.
      - high: 3 warnings (no PIP).
      - medium: 2 warnings.
      - low: 1 warning, OR admin-only notes with no warnings/PIPs.
      - none: no records at all.
    """
    warnings = [r for r in records if r.kind == "warning"]
    pips     = [r for r in records if r.kind == "pip"]
    admins   = [r for r in records if r.kind == "admin"]
    disc_total = len(warnings) + len(pips)

    if any("final warning" in (r.title or "").lower() for r in records):
        return "final_warning"
    if disc_total > 3:
        return "excessive"
    if len(pips) >= 1:
        return "critical"
    if len(warnings) >= 3:
        return "high"
    if len(warnings) == 2:
        return "medium"
    if len(warnings) == 1 or admins:
        return "low"
    return "none"


# Risk levels that count as "needs attention" — anything more serious than
# admin-only notes. Used by both the KPI and the Attention Needed tab.
ATTENTION_RISKS = {"medium", "high", "critical", "excessive", "final_warning"}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def documentation_analytics(request):
    """Discipline analytics for the Team Documentation page.

    Returns the data backing the "View Analytics" view:
      - totals: high-level KPIs across the store's active roster
      - risk_distribution: counts/percentages across all 7 risk buckets
      - employees: per-employee rollup (used by the Attention Needed +
                   All Employees tabs)

    Scope: store-scoped (or unrestricted for superusers). Only active users
    are counted in totals / distribution / employees.
    """
    user = request.user

    # Roster: active users in the requester's store (or all if superuser).
    roster_qs = User.objects.filter(is_active=True)
    if not user.is_superuser:
        roster_qs = roster_qs.filter(store=user.store)
    roster = list(roster_qs.prefetch_related("records"))

    # Bucket every active user by risk, even those with zero records (they
    # land in the "none" bucket and dominate the chart, which mirrors LD
    # Growth's layout).
    buckets = {key: 0 for key, _ in RISK_BUCKETS}
    employees = []
    total_incidents = 0
    employees_with_incidents = 0

    for u in roster:
        recs = list(u.records.all().order_by("-recorded_at"))
        warnings = sum(1 for r in recs if r.kind == "warning")
        pips     = sum(1 for r in recs if r.kind == "pip")
        admins   = sum(1 for r in recs if r.kind == "admin")
        disc = warnings + pips

        risk = _classify_risk(recs)
        buckets[risk] += 1

        # "Incidents" mirrors LD Growth — disciplinary records only
        # (warnings + PIPs). Admin notes don't count.
        if disc > 0:
            employees_with_incidents += 1
            total_incidents += disc

        latest = recs[0] if recs else None
        employees.append({
            "id": u.id,
            "name": f"{u.first_name} {u.last_name}".strip() or u.email,
            "initials": u.initials,
            "role": u.role,
            "risk_level": risk,
            "counts": {"disc": warnings, "pip": pips, "admin": admins},
            "latest": {
                "id": latest.id,
                "title": latest.title,
                "kind": latest.kind,
                "date": latest.recorded_at.strftime("%b %-d, %Y"),
                "status": latest.status,
            } if latest else None,
        })

    total_employees = len(roster)
    need_attention = sum(buckets[k] for k in ATTENTION_RISKS)

    # Risk distribution — preserve RISK_BUCKETS order, include percentages
    # rounded to one decimal so the chart can render labels like "(7.5%)".
    distribution = []
    for key, label in RISK_BUCKETS:
        count = buckets[key]
        pct = round((count / total_employees) * 100, 1) if total_employees else 0.0
        distribution.append({
            "key": key,
            "label": label,
            "count": count,
            "percentage": pct,
        })

    # Sort employees by risk severity (most-severe first), then by name. This
    # is the order both the Attention Needed and All Employees tabs render.
    risk_order = {key: idx for idx, (key, _) in enumerate(RISK_BUCKETS)}
    employees.sort(key=lambda e: (risk_order[e["risk_level"]], e["name"].lower()))

    return Response({
        "totals": {
            "total_employees": total_employees,
            "employees_with_incidents": employees_with_incidents,
            "total_incidents": total_incidents,
            "need_attention": need_attention,
        },
        "risk_distribution": distribution,
        "employees": employees,
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
