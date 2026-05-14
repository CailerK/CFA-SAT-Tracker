"""
FOH Daily Tasks endpoints.

Resource pattern: GET /api/foh/tasks/?shift=opening returns the recurring
task templates *with today's completion attached* on each row, so the
frontend renders the checkbox state in one round-trip.

Mutations:
  POST /api/foh/tasks/                       create template     (manager+)
  PATCH /api/foh/tasks/:id/                  edit text/order     (manager+)
  DELETE /api/foh/tasks/:id/                 soft-archive        (manager+)
  POST  /api/foh/tasks/:id/complete/         mark done today     (anyone)
  POST  /api/foh/tasks/:id/uncomplete/       undo today          (anyone)
  POST  /api/foh/tasks/reorder/              bulk order update   (manager+)
  GET   /api/foh/tasks/history/?range=7d     completion rollup
"""

from datetime import timedelta

from django.db.models import Count, Prefetch, Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import FOHTaskCompletion, FOHTaskTemplate
from .permissions import ReadAllWriteManager, is_manager_or_above
from .serializers import (
    FOHTaskCompletionSerializer,
    FOHTaskTemplateSerializer,
)
from .viewsets import StoreScopedViewSet


def _today():
    return timezone.localdate()


class FOHTaskTemplateViewSet(StoreScopedViewSet):
    """CRUD + completion + history for FOH task templates."""

    serializer_class = FOHTaskTemplateSerializer
    queryset = FOHTaskTemplate.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        qs = super().get_queryset()
        # Hide archived rows from list/detail by default. (Admins can still
        # see them via the Django admin.)
        qs = qs.filter(archived_at__isnull=True)
        # Filter by shift if specified.
        shift = self.request.query_params.get("shift")
        if shift:
            qs = qs.filter(shift=shift)
        # Prefetch today's completion so the serializer doesn't issue N queries.
        today_qs = FOHTaskCompletion.objects.filter(date=_today())
        return qs.prefetch_related(
            Prefetch("completions", queryset=today_qs, to_attr="today_completion_list")
        ).order_by("shift", "order", "id")

    def perform_destroy(self, instance):
        # Soft delete — keep history rows intact.
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    # ---------- completion actions ----------

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        """Record completion for today. Idempotent — if already complete, returns existing."""
        template = self.get_object()
        completion, created = FOHTaskCompletion.objects.get_or_create(
            template=template,
            date=_today(),
            defaults={
                "completed_by": request.user,
                "initials": (request.data.get("initials") or "").strip()[:4],
            },
        )
        # If they passed initials on a re-complete, update them.
        if not created and request.data.get("initials"):
            completion.initials = request.data["initials"].strip()[:4]
            completion.save(update_fields=["initials"])
        ser = FOHTaskCompletionSerializer(completion)
        return Response(
            ser.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="uncomplete")
    def uncomplete(self, request, pk=None):
        """Undo today's completion."""
        template = self.get_object()
        FOHTaskCompletion.objects.filter(
            template=template, date=_today()
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ---------- bulk reorder ----------

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Body: {"items": [{"id": 1, "order": 0}, ...]}. Manager only.

        ReadAllWriteManager already gates non-SAFE methods to managers, so
        no extra check needed here.
        """
        items = request.data.get("items") or []
        if not isinstance(items, list):
            raise ValidationError({"items": "Must be a list of {id, order} objects."})
        try:
            ids = [int(i["id"]) for i in items]
        except (KeyError, TypeError, ValueError):
            raise ValidationError({"items": "Each item needs an integer id."})
        # Scope to the user's store via the base queryset before updating.
        scoped_map = {
            t.id: t for t in self.get_queryset().filter(id__in=ids)
        }
        for item in items:
            t = scoped_map.get(int(item["id"]))
            if t is None:
                continue  # skip ids the user can't access
            t.order = int(item.get("order", 0))
            t.save(update_fields=["order"])
        return Response({"updated": len(scoped_map)})

    # ---------- history rollup ----------

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        """Per-day rollup grouped by shift.

        Query: ?range=7d|14d|30d  (default 7d)
        Response: [{date, opening: {done, total}, transition: {…}, closing: {…}, total: {…}, missed: [text]}]
        """
        range_arg = request.query_params.get("range", "7d")
        try:
            days = int(range_arg.rstrip("d"))
        except ValueError:
            days = 7
        days = min(max(days, 1), 90)

        end = _today()
        start = end - timedelta(days=days - 1)

        # Per-shift totals across active templates.
        totals_by_shift = dict(
            self.get_queryset()
            .values_list("shift")
            .annotate(c=Count("id"))
        )

        # Completions over the date range.
        completions = (
            FOHTaskCompletion.objects.filter(
                template__store=request.user.store,
                template__archived_at__isnull=True,
                date__gte=start, date__lte=end,
            )
            .select_related("template")
        )

        # Bucket by date+shift.
        by_date = {}
        for c in completions:
            d = c.date.isoformat()
            day = by_date.setdefault(d, {
                "date": d,
                "opening": {"done": 0, "total": totals_by_shift.get("opening", 0)},
                "transition": {"done": 0, "total": totals_by_shift.get("transition", 0)},
                "closing": {"done": 0, "total": totals_by_shift.get("closing", 0)},
                "completed_template_ids": set(),
            })
            shift = c.template.shift
            if shift in day:
                day[shift]["done"] += 1
            day["completed_template_ids"].add(c.template_id)

        # Compute missed task names for each day.
        active_templates = list(self.get_queryset())
        active_by_id = {t.id: t for t in active_templates}
        result = []
        for offset in range(days):
            d_obj = end - timedelta(days=offset)
            d = d_obj.isoformat()
            day = by_date.get(d) or {
                "date": d,
                "opening": {"done": 0, "total": totals_by_shift.get("opening", 0)},
                "transition": {"done": 0, "total": totals_by_shift.get("transition", 0)},
                "closing": {"done": 0, "total": totals_by_shift.get("closing", 0)},
                "completed_template_ids": set(),
            }
            completed_ids = day.pop("completed_template_ids")
            missed = [
                active_by_id[t_id].text
                for t_id in active_by_id
                if t_id not in completed_ids
            ][:10]  # cap missed list per day
            total_done = sum(day[s]["done"] for s in ("opening", "transition", "closing"))
            total_total = sum(day[s]["total"] for s in ("opening", "transition", "closing"))
            day["total"] = {"done": total_done, "total": total_total}
            day["missed"] = missed
            result.append(day)
        return Response({"days": result, "range": f"{days}d"})
