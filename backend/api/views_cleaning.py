"""
Cleaning & Maintenance endpoints.

  GET    /api/cleaning/tasks/?scope=foh&frequency=daily   list templates
  POST   /api/cleaning/tasks/                              create (manager+)
  PATCH  /api/cleaning/tasks/:id/                          edit   (manager+)
  DELETE /api/cleaning/tasks/:id/                          archive (manager+)
  POST   /api/cleaning/tasks/:id/complete/                 mark done today
  POST   /api/cleaning/tasks/:id/uncomplete/               undo
  GET    /api/cleaning/tasks/counts/?scope=foh             per-frequency rollup
  GET    /api/cleaning/tasks/history/?range=30d            recent completions
"""

from calendar import monthrange
from datetime import date as _date_cls, timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CleaningCompletion, CleaningTask
from .permissions import ReadAllWriteManager
from .serializers import (
    CleaningCompletionSerializer,
    CleaningTaskSerializer,
)
from .viewsets import StoreScopedViewSet


def _today():
    return timezone.localdate()


def period_window(frequency, today=None):
    """Return (start_date, end_date) inclusive for the active period of `frequency`.

    Daily     : today only (resets at local midnight).
    Weekly    : Monday..Sunday containing `today` (resets midnight Sun→Mon —
                i.e. "Sunday night" — fresh week starts Monday).
    Monthly   : first..last day of `today`'s month (resets midnight on the 1st,
                i.e. at the end of the last day of the month).
    Quarterly : first day of Jan/Apr/Jul/Oct .. last day of Mar/Jun/Sep/Dec
                containing `today`.
    """
    if today is None:
        today = _today()
    if frequency == 'daily':
        return today, today
    if frequency == 'weekly':
        # Python weekday(): Mon=0..Sun=6. Week is Mon..Sun, resets Sunday night.
        days_since_monday = today.weekday()
        start = today - timedelta(days=days_since_monday)
        end = start + timedelta(days=6)
        return start, end
    if frequency == 'monthly':
        start = today.replace(day=1)
        end = today.replace(day=monthrange(today.year, today.month)[1])
        return start, end
    if frequency == 'quarterly':
        q_index = (today.month - 1) // 3
        start_month = q_index * 3 + 1
        end_month = start_month + 2
        start = _date_cls(today.year, start_month, 1)
        end = _date_cls(today.year, end_month, monthrange(today.year, end_month)[1])
        return start, end
    # Unknown frequency — fall back to single day.
    return today, today


class CleaningTaskViewSet(StoreScopedViewSet):
    """CRUD + completion + rollup for cleaning tasks."""

    serializer_class = CleaningTaskSerializer
    queryset = CleaningTask.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    # Completion actions are open to any team member.
    def get_permissions(self):
        if self.action in {"complete", "uncomplete", "counts", "history"}:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        scope = self.request.query_params.get("scope")
        frequency = self.request.query_params.get("frequency")
        if scope:
            qs = qs.filter(scope=scope)
        if frequency:
            qs = qs.filter(frequency=frequency)
        # Prefetch every completion that could fall inside any active period
        # window (the widest is quarterly). The serializer narrows per-task by
        # the task's own frequency.
        q_start, _q_end = period_window('quarterly', _today())
        period_qs = (
            CleaningCompletion.objects
            .filter(date__gte=q_start)
            .order_by('-date')
        )
        return qs.prefetch_related(
            Prefetch("completions", queryset=period_qs, to_attr="period_completion_list")
        ).order_by("scope", "frequency", "order", "id")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        today = _today()
        start, end = period_window(task.frequency, today)
        # If already completed within the active period, return the existing row
        # rather than creating a duplicate. This is what makes weekly/monthly/
        # quarterly checkboxes "stick" until the period ends.
        existing = (
            CleaningCompletion.objects
            .filter(task=task, date__gte=start, date__lte=end)
            .order_by('-date')
            .first()
        )
        notes = request.data.get("notes")
        if existing is not None:
            if notes is not None:
                existing.notes = notes[:1000]
                existing.save(update_fields=["notes"])
            return Response(
                CleaningCompletionSerializer(existing).data,
                status=status.HTTP_200_OK,
            )
        completion, created = CleaningCompletion.objects.get_or_create(
            task=task, date=today,
            defaults={
                "completed_by": request.user,
                "notes": (notes or "")[:1000],
            },
        )
        if not created and notes is not None:
            completion.notes = notes[:1000]
            completion.save(update_fields=["notes"])
        return Response(
            CleaningCompletionSerializer(completion).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="uncomplete")
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        # Clear any completion within the current period so the box unchecks
        # immediately regardless of which day in the period it was marked.
        start, end = period_window(task.frequency, _today())
        CleaningCompletion.objects.filter(
            task=task, date__gte=start, date__lte=end,
        ).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="counts")
    def counts(self, request):
        """For the page header: per-frequency completion counts for the
        currently-active period of each frequency.

        Query: ?scope=foh|kitchen
        Response: {daily: {done, total}, weekly: {...}, monthly: {...}, quarterly: {...}}
        """
        scope = request.query_params.get("scope", "foh")
        today = _today()
        qs = (
            CleaningTask.objects
            .filter(store=request.user.store, scope=scope,
                    archived_at__isnull=True)
        )
        out = {}
        for freq, _ in CleaningTask.FREQUENCY_CHOICES:
            total = qs.filter(frequency=freq).count()
            start, end = period_window(freq, today)
            done = (
                CleaningCompletion.objects
                .filter(
                    task__store=request.user.store,
                    task__scope=scope,
                    task__frequency=freq,
                    task__archived_at__isnull=True,
                    date__gte=start,
                    date__lte=end,
                )
                .values('task_id').distinct().count()
            )
            out[freq] = {"done": done, "total": total}
        return Response(out)

    @action(detail=False, methods=["get"], url_path="history")
    def history(self, request):
        """List recent completions across all tasks. ?range=30d default."""
        scope = request.query_params.get("scope")
        try:
            days = int(request.query_params.get("range", "30").rstrip("d"))
        except ValueError:
            days = 30
        days = min(max(days, 1), 365)
        start = _today() - timedelta(days=days - 1)

        comps = (
            CleaningCompletion.objects
            .filter(
                task__store=request.user.store,
                task__archived_at__isnull=True,
                date__gte=start,
            )
            .select_related("task", "completed_by")
            .order_by("-date", "-id")
        )
        if scope:
            comps = comps.filter(task__scope=scope)

        rows = [
            {
                "id": c.id,
                "task_id": c.task_id,
                "task_name": c.task.name,
                "scope": c.task.scope,
                "frequency": c.task.frequency,
                "date": c.date.isoformat(),
                "completed_at": c.completed_at,
                "completed_by_name": (
                    f"{c.completed_by.first_name} {c.completed_by.last_name}".strip()
                    if c.completed_by else None
                ),
                "notes": c.notes,
            }
            for c in comps[:500]  # safety cap
        ]
        return Response({"range_days": days, "completions": rows})
