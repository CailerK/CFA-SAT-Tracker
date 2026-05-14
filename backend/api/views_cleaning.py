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

from datetime import timedelta

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
        today_qs = CleaningCompletion.objects.filter(date=_today())
        return qs.prefetch_related(
            Prefetch("completions", queryset=today_qs, to_attr="today_completion_list")
        ).order_by("scope", "frequency", "order", "id")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        completion, created = CleaningCompletion.objects.get_or_create(
            task=task, date=_today(),
            defaults={
                "completed_by": request.user,
                "notes": (request.data.get("notes") or "")[:1000],
            },
        )
        if not created and request.data.get("notes") is not None:
            completion.notes = request.data["notes"][:1000]
            completion.save(update_fields=["notes"])
        return Response(
            CleaningCompletionSerializer(completion).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="uncomplete")
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        CleaningCompletion.objects.filter(task=task, date=_today()).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="counts")
    def counts(self, request):
        """For the page header: per-frequency completion counts for today.

        Query: ?scope=foh|kitchen
        Response: {daily: {done, total}, weekly: {...}, monthly: {...}, quarterly: {...}}
        """
        scope = request.query_params.get("scope", "foh")
        qs = (
            CleaningTask.objects
            .filter(store=request.user.store, scope=scope,
                    archived_at__isnull=True)
        )
        out = {}
        for freq, _ in CleaningTask.FREQUENCY_CHOICES:
            total = qs.filter(frequency=freq).count()
            done = CleaningCompletion.objects.filter(
                task__store=request.user.store,
                task__scope=scope,
                task__frequency=freq,
                task__archived_at__isnull=True,
                date=_today(),
            ).count()
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
