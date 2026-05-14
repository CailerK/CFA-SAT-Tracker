"""
Kitchen endpoints — checklists, dashboard rollup, waste tracker.

  GET    /api/kitchen/checklists/?shift=opening   list checklist templates
  POST   /api/kitchen/checklists/                  create (manager+)
  POST   /api/kitchen/checklists/:id/complete/     mark done today
  POST   /api/kitchen/checklists/:id/uncomplete/   undo

  GET    /api/kitchen/summary/                     dashboard rollup card data

  GET    /api/kitchen/waste/menu-items/?meal=lunch list menu items by period
  POST   /api/kitchen/waste/menu-items/            create (manager+)
  GET    /api/kitchen/waste/reasons/               list waste reasons
  POST   /api/kitchen/waste/reasons/               create (manager+)
  GET    /api/kitchen/waste/entries/?date=today    list waste log entries
  POST   /api/kitchen/waste/entries/               log an entry (any user)
  DELETE /api/kitchen/waste/entries/:id/           undo (any user, own only)

  GET    /api/kitchen/waste/kpis/?range=7d         today / week / yesterday / top item
  GET    /api/kitchen/waste/trend/?range=30d       per-day cost trend
  GET    /api/kitchen/waste/top-items/?range=30d   top wasted items by cost
  GET    /api/kitchen/waste/goals/                 from StoreSettings
  PATCH  /api/kitchen/waste/goals/                 update goals (manager+)
"""

from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, Prefetch, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    CleaningCompletion,
    CleaningTask,
    KitchenChecklistCompletion,
    KitchenChecklistTask,
    MealPeriod,
    MenuItem,
    StoreSettings,
    WasteEntry,
    WasteReason,
)
from .permissions import ReadAllWriteManager, is_manager_or_above
from .serializers import (
    KitchenChecklistCompletionSerializer,
    KitchenChecklistTaskSerializer,
    MealPeriodSerializer,
    MenuItemSerializer,
    WasteEntrySerializer,
    WasteReasonSerializer,
)
from .viewsets import StoreScopedViewSet


def _today():
    return timezone.localdate()


# ============================================================================
# Checklists (mirror of FOH)
# ============================================================================

class KitchenChecklistViewSet(StoreScopedViewSet):
    serializer_class = KitchenChecklistTaskSerializer
    queryset = KitchenChecklistTask.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_permissions(self):
        if self.action in {"complete", "uncomplete"}:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        shift = self.request.query_params.get("shift")
        if shift:
            qs = qs.filter(shift=shift)
        today_qs = KitchenChecklistCompletion.objects.filter(date=_today())
        return qs.prefetch_related(
            Prefetch("completions", queryset=today_qs, to_attr="today_completion_list")
        ).order_by("shift", "order", "id")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        comp, created = KitchenChecklistCompletion.objects.get_or_create(
            template=task, date=_today(),
            defaults={"completed_by": request.user},
        )
        return Response(
            KitchenChecklistCompletionSerializer(comp).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="uncomplete")
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        KitchenChecklistCompletion.objects.filter(
            template=task, date=_today()
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Dashboard summary (no model — pure aggregation)
# ============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def kitchen_summary(request):
    """Rollup card data for the Kitchen Dashboard.

    Response shape mirrors the hardcoded `progressData` + `cards` in
    KitchenDashboard.js so the frontend swap is a one-liner.
    """
    store = request.user.store
    if not store:
        return Response({"error": "No store assigned."}, status=404)

    today = _today()

    # Per-shift checklist progress (opening/transition/closing).
    def shift_progress(shift):
        total = KitchenChecklistTask.objects.filter(
            store=store, shift=shift, archived_at__isnull=True
        ).count()
        done = KitchenChecklistCompletion.objects.filter(
            template__store=store,
            template__shift=shift,
            template__archived_at__isnull=True,
            date=today,
        ).count()
        pct = round((done / total) * 100) if total else 0
        return {"total": total, "done": done, "percent": pct}

    opening = shift_progress("opening")
    transition = shift_progress("transition")
    closing = shift_progress("closing")
    overall_total = opening["total"] + transition["total"] + closing["total"]
    overall_done = opening["done"] + transition["done"] + closing["done"]
    overall_pct = round((overall_done / overall_total) * 100) if overall_total else 0

    # Waste — today's totals.
    today_entries = WasteEntry.objects.filter(
        store=store, recorded_at__date=today
    )
    waste_today_count = today_entries.count()
    waste_today_cost = sum(
        float(e.unit_price_at_time) * e.qty for e in today_entries
    )

    # Equipment — Phase 5 will add real data; placeholder 0/0 for now.
    cleaning_done = CleaningCompletion.objects.filter(
        task__store=store, task__scope="kitchen",
        task__archived_at__isnull=True, date=today,
    ).count()
    cleaning_total = CleaningTask.objects.filter(
        store=store, scope="kitchen", archived_at__isnull=True
    ).count()

    return Response({
        "progress": {
            "overall": overall_pct,
            "opening": opening["percent"],
            "transition": transition["percent"],
            "closing": closing["percent"],
        },
        "cards": [
            {
                "id": "food-safety",
                "title": "Food Safety",
                "emoji": "🛡️",
                "page": "kitchen-safety",
                "stats": [
                    {"label": "Checklists", "value": "0/0", "sublabel": "Today"},
                    {"label": "Temp Checks", "value": "0/0", "sublabel": "Today"},
                ],
                "progress": 0,
            },
            {
                "id": "waste",
                "title": "Waste Tracker",
                "emoji": "🗑️",
                "page": "kitchen-waste",
                "stats": [
                    {"label": "Today's waste", "value": f"${waste_today_cost:.2f}", "sublabel": ""},
                    {"label": "Items tracked", "value": str(waste_today_count), "sublabel": ""},
                ],
                "progress": 0,
            },
            {
                "id": "equipment",
                "title": "Equipment",
                "emoji": "🔧",
                "page": "kitchen-equipment",
                "stats": [
                    {"label": "Status", "value": "—", "sublabel": "Phase 5"},
                    {"label": "Needs work", "value": "—", "sublabel": ""},
                ],
                "progress": 0,
            },
            {
                "id": "checklists",
                "title": "Shift Checklists",
                "emoji": "📋",
                "page": "kitchen-checklists",
                "stats": [
                    {"label": "Completed",
                     "value": f"{overall_done}/{overall_total}",
                     "sublabel": "Today"},
                    {"label": "Rate", "value": f"{overall_pct}%", "sublabel": ""},
                ],
                "progress": overall_pct,
            },
        ],
        # Bonus: kitchen-cleaning rollup since the dashboard cards already cover it.
        "cleaning": {"done": cleaning_done, "total": cleaning_total},
    })


# ============================================================================
# Waste — menu items
# ============================================================================

class MenuItemViewSet(StoreScopedViewSet):
    serializer_class = MenuItemSerializer
    queryset = MenuItem.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        meal = self.request.query_params.get("meal")
        if meal:
            qs = qs.filter(meal_period__slug=meal)
        return qs.select_related("meal_period").order_by(
            "meal_period__order", "order", "name"
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])


# ============================================================================
# Waste — reasons
# ============================================================================

class WasteReasonViewSet(StoreScopedViewSet):
    serializer_class = WasteReasonSerializer
    queryset = WasteReason.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().filter(is_active=True).order_by("order", "id")


# ============================================================================
# Waste — entries
# ============================================================================

class WasteEntryViewSet(StoreScopedViewSet):
    serializer_class = WasteEntrySerializer
    queryset = WasteEntry.objects.all()
    permission_classes = [IsAuthenticated]  # any user can log waste

    def get_queryset(self):
        qs = super().get_queryset().select_related(
            "menu_item__meal_period", "reason", "recorded_by"
        )
        params = self.request.query_params
        # ?date=today  or ?date=YYYY-MM-DD
        date = params.get("date")
        if date == "today":
            qs = qs.filter(recorded_at__date=_today())
        elif date:
            try:
                d = datetime.strptime(date, "%Y-%m-%d").date()
                qs = qs.filter(recorded_at__date=d)
            except ValueError:
                pass
        # ?meal=lunch
        meal = params.get("meal")
        if meal:
            qs = qs.filter(menu_item__meal_period__slug=meal)
        return qs.order_by("-recorded_at", "-id")

    def perform_create(self, serializer):
        menu_item = serializer.validated_data["menu_item"]
        # Snapshot the unit price so historical totals don't drift if menu
        # prices change later.
        serializer.save(
            store=self.request.user.store,
            recorded_by=self.request.user,
            unit_price_at_time=menu_item.unit_price,
        )


# ============================================================================
# Waste — KPIs / trend / top-items / goals (aggregations, no model)
# ============================================================================

def _parse_range_days(arg: str | None, default: int = 7) -> int:
    if not arg:
        return default
    try:
        return min(max(int(arg.rstrip("d")), 1), 365)
    except ValueError:
        return default


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def waste_kpis(request):
    """Today / This Week / Yesterday / Top item."""
    store = request.user.store
    today = _today()
    yesterday = today - timedelta(days=1)
    week_start = today - timedelta(days=6)

    def total_for(date_filter):
        entries = WasteEntry.objects.filter(store=store, **date_filter)
        cost = sum(float(e.unit_price_at_time) * e.qty for e in entries)
        return {"cost": cost, "count": entries.count()}

    today_t = total_for({"recorded_at__date": today})
    yesterday_t = total_for({"recorded_at__date": yesterday})
    week_t = total_for({"recorded_at__date__gte": week_start})

    # Top item this week.
    from django.db.models import F, FloatField, ExpressionWrapper
    week_entries = WasteEntry.objects.filter(
        store=store, recorded_at__date__gte=week_start
    ).select_related("menu_item")
    by_item = {}
    for e in week_entries:
        key = e.menu_item.name
        by_item.setdefault(key, {"cost": 0, "count": 0, "emoji": e.menu_item.emoji})
        by_item[key]["cost"] += float(e.unit_price_at_time) * e.qty
        by_item[key]["count"] += e.qty
    top = max(by_item.items(), key=lambda kv: kv[1]["cost"], default=(None, None))
    top_name, top_data = top

    delta_pct = None
    if yesterday_t["cost"]:
        delta_pct = round(
            ((today_t["cost"] - yesterday_t["cost"]) / yesterday_t["cost"]) * 100, 1
        )

    return Response({
        "today": {
            "cost": round(today_t["cost"], 2),
            "count": today_t["count"],
            "delta_vs_yesterday_pct": delta_pct,
        },
        "this_week": {
            "cost": round(week_t["cost"], 2),
            "count": week_t["count"],
        },
        "yesterday": {
            "cost": round(yesterday_t["cost"], 2),
            "count": yesterday_t["count"],
        },
        "top_item": {
            "name": top_name,
            "cost": round(top_data["cost"], 2) if top_data else 0,
            "count": top_data["count"] if top_data else 0,
            "emoji": top_data["emoji"] if top_data else "",
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def waste_trend(request):
    """Per-day cost for the past N days."""
    store = request.user.store
    days = _parse_range_days(request.query_params.get("range"), default=30)
    end = _today()
    start = end - timedelta(days=days - 1)
    entries = WasteEntry.objects.filter(
        store=store, recorded_at__date__gte=start, recorded_at__date__lte=end
    )
    by_date = {}
    for e in entries:
        d = e.recorded_at.date().isoformat()
        by_date[d] = by_date.get(d, 0) + float(e.unit_price_at_time) * e.qty
    points = []
    for offset in range(days):
        d_obj = start + timedelta(days=offset)
        d = d_obj.isoformat()
        points.append({
            "date": d,
            "label": d_obj.strftime("%b %-d"),
            "y": round(by_date.get(d, 0), 2),
        })
    return Response({"range_days": days, "points": points})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def waste_top_items(request):
    """Top wasted items by cost over the past N days."""
    store = request.user.store
    days = _parse_range_days(request.query_params.get("range"), default=30)
    start = _today() - timedelta(days=days - 1)
    entries = (
        WasteEntry.objects
        .filter(store=store, recorded_at__date__gte=start)
        .select_related("menu_item")
    )
    totals = {}
    for e in entries:
        key = e.menu_item.id
        if key not in totals:
            totals[key] = {
                "id": key,
                "name": e.menu_item.name,
                "emoji": e.menu_item.emoji,
                "cost": 0.0,
                "items": 0,
            }
        totals[key]["cost"] += float(e.unit_price_at_time) * e.qty
        totals[key]["items"] += e.qty
    total_cost = sum(t["cost"] for t in totals.values()) or 1
    rows = []
    for t in totals.values():
        rows.append({
            "id": t["id"],
            "name": t["name"],
            "emoji": t["emoji"],
            "items": t["items"],
            "cost": round(t["cost"], 2),
            "pct": round((t["cost"] / total_cost) * 100, 1),
        })
    rows.sort(key=lambda r: r["cost"], reverse=True)
    return Response({"range_days": days, "items": rows[:10]})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def waste_goals(request):
    """Read/write waste goal targets (stored on StoreSettings)."""
    store = request.user.store
    if not store:
        return Response({"error": "No store assigned."}, status=404)
    settings_obj, _ = StoreSettings.objects.get_or_create(store=store)

    if request.method == "GET":
        return Response({
            "daily": float(settings_obj.waste_goal_daily),
            "weekly": float(settings_obj.waste_goal_weekly),
            "monthly": float(settings_obj.waste_goal_monthly),
        })

    if not is_manager_or_above(request.user):
        return Response(
            {"error": "Only managers can change goals."}, status=403
        )
    changes = {}
    for k in ("daily", "weekly", "monthly"):
        if k in request.data:
            try:
                changes[f"waste_goal_{k}"] = Decimal(str(request.data[k]))
            except (TypeError, ValueError, ArithmeticError):
                raise ValidationError({k: "Must be a number."})
    for k, v in changes.items():
        setattr(settings_obj, k, v)
    settings_obj.save()
    return Response({
        "daily": float(settings_obj.waste_goal_daily),
        "weekly": float(settings_obj.waste_goal_weekly),
        "monthly": float(settings_obj.waste_goal_monthly),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def meal_periods_list(request):
    """Global catalog of meal periods (breakfast/lunch/dinner)."""
    return Response(MealPeriodSerializer(MealPeriod.objects.all(), many=True).data)
