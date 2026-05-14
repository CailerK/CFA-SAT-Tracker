"""
Equipment + Food Safety endpoints (Phase 5).

  GET    /api/kitchen/equipment/categories/                 list (anyone)
  POST   /api/kitchen/equipment/categories/                 create (manager+)
  PATCH  /api/kitchen/equipment/categories/:id/             edit (manager+)
  DELETE /api/kitchen/equipment/categories/:id/             archive (manager+)

  GET    /api/kitchen/equipment/?category=cooking           list (anyone)
  POST   /api/kitchen/equipment/                            create (manager+)
  PATCH  /api/kitchen/equipment/:id/                        edit (manager+)
  DELETE /api/kitchen/equipment/:id/                        archive (manager+)

  GET    /api/kitchen/equipment/:id/schedules/              list schedules
  POST   /api/kitchen/equipment/:id/schedules/              add schedule (manager+)
  POST   /api/kitchen/equipment/schedules/:id/complete/     mark done

  GET    /api/kitchen/equipment/:id/logs/                   history
  POST   /api/kitchen/equipment/:id/logs/                   add log entry

  GET    /api/kitchen/food-safety/tasks/?daypart=morning    list
  POST   /api/kitchen/food-safety/tasks/                    create (manager+)
  POST   /api/kitchen/food-safety/tasks/:id/complete/       complete today
  POST   /api/kitchen/food-safety/tasks/:id/uncomplete/     undo

  GET    /api/kitchen/food-safety/temperature-targets/      list
  POST   /api/kitchen/food-safety/temperature-targets/      create (manager+)

  GET    /api/kitchen/food-safety/temperature-readings/     list recent
  POST   /api/kitchen/food-safety/temperature-readings/     log a reading
"""

from datetime import timedelta

from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Equipment,
    EquipmentCategory,
    FoodSafetyCompletion,
    FoodSafetyTask,
    MaintenanceLog,
    MaintenanceSchedule,
    TemperatureReading,
    TemperatureTarget,
)
from .permissions import ReadAllWriteManager, is_manager_or_above
from .serializers import (
    EquipmentCategorySerializer,
    EquipmentSerializer,
    FoodSafetyCompletionSerializer,
    FoodSafetyTaskSerializer,
    MaintenanceLogSerializer,
    MaintenanceScheduleSerializer,
    TemperatureReadingSerializer,
    TemperatureTargetSerializer,
)
from .viewsets import StoreScopedViewSet


def _today():
    return timezone.localdate()


# ============================================================================
# Equipment Categories
# ============================================================================

class EquipmentCategoryViewSet(StoreScopedViewSet):
    serializer_class = EquipmentCategorySerializer
    queryset = EquipmentCategory.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        return super().get_queryset().filter(archived_at__isnull=True).order_by(
            "order", "id"
        )

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])


# ============================================================================
# Equipment (with maintenance schedule attached)
# ============================================================================

class EquipmentViewSet(StoreScopedViewSet):
    serializer_class = EquipmentSerializer
    queryset = Equipment.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    # Schedule completion + log creation are team-member actions.
    def get_permissions(self):
        if self.action in {"schedules", "complete_schedule", "logs", "add_log"}:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        # Filter by category slug or id.
        cat = self.request.query_params.get("category")
        if cat:
            if cat.isdigit():
                qs = qs.filter(category_id=int(cat))
            else:
                qs = qs.filter(category__slug=cat)
        # Prefetch upcoming schedule for the card view.
        upcoming = MaintenanceSchedule.objects.filter(
            archived_at__isnull=True
        ).order_by("next_due")
        return qs.select_related("category").prefetch_related(
            Prefetch("schedules", queryset=upcoming, to_attr="next_schedule_list")
        ).order_by("category__order", "name")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    # --- Schedules sub-resource ---

    @action(detail=True, methods=["get", "post"], url_path="schedules")
    def schedules(self, request, pk=None):
        equipment = self.get_object()
        if request.method == "GET":
            rows = equipment.schedules.filter(archived_at__isnull=True).order_by(
                "next_due"
            )
            return Response(MaintenanceScheduleSerializer(rows, many=True).data)
        # POST — manager-only enforced at the class level wouldn't catch this
        # path, so re-check.
        from .permissions import is_manager_or_above
        if not is_manager_or_above(request.user):
            raise ValidationError("Manager role required to add schedules.")
        serializer = MaintenanceScheduleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(equipment=equipment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # --- Logs sub-resource ---

    @action(detail=True, methods=["get", "post"], url_path="logs")
    def logs(self, request, pk=None):
        equipment = self.get_object()
        if request.method == "GET":
            rows = equipment.logs.all()[:100]
            return Response(MaintenanceLogSerializer(rows, many=True).data)
        kind = request.data.get("kind")
        if kind not in {"history", "maintenance", "cleaning", "issue"}:
            raise ValidationError({"kind": "Required: history|maintenance|cleaning|issue."})
        log = MaintenanceLog.objects.create(
            equipment=equipment,
            kind=kind,
            notes=request.data.get("notes", ""),
            performed_by=request.user,
        )
        return Response(MaintenanceLogSerializer(log).data, status=status.HTTP_201_CREATED)


class MaintenanceScheduleViewSet(viewsets.ViewSet):
    """Standalone actions on a schedule (complete, edit)."""
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        try:
            sched = MaintenanceSchedule.objects.select_related("equipment").get(pk=pk)
        except MaintenanceSchedule.DoesNotExist:
            raise NotFound("Schedule not found.")
        # Multi-tenant guard.
        if sched.equipment.store_id != user.store_id and not user.is_superuser:
            raise NotFound("Schedule not found.")
        return sched

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        sched = self._get(pk, request.user)
        sched.last_completed = _today()
        # Roll next_due forward by the cadence.
        delta_map = {
            "daily": timedelta(days=1),
            "weekly": timedelta(days=7),
            "monthly": timedelta(days=30),
            "quarterly": timedelta(days=90),
            "yearly": timedelta(days=365),
        }
        delta = delta_map.get(sched.cadence, timedelta(days=7))
        sched.next_due = _today() + delta
        sched.save(update_fields=["last_completed", "next_due", "updated_at"])
        # Also log it.
        MaintenanceLog.objects.create(
            equipment=sched.equipment,
            kind="maintenance",
            notes=f"Completed: {sched.task_name}",
            performed_by=request.user,
        )
        return Response(MaintenanceScheduleSerializer(sched).data)

    def partial_update(self, request, pk=None):
        if not is_manager_or_above(request.user):
            raise ValidationError("Manager role required to edit schedules.")
        sched = self._get(pk, request.user)
        serializer = MaintenanceScheduleSerializer(
            sched, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        if not is_manager_or_above(request.user):
            raise ValidationError("Manager role required to delete schedules.")
        sched = self._get(pk, request.user)
        sched.archived_at = timezone.now()
        sched.save(update_fields=["archived_at", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Food Safety Tasks
# ============================================================================

class FoodSafetyTaskViewSet(StoreScopedViewSet):
    serializer_class = FoodSafetyTaskSerializer
    queryset = FoodSafetyTask.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_permissions(self):
        if self.action in {"complete", "uncomplete"}:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        daypart = self.request.query_params.get("daypart")
        if daypart:
            qs = qs.filter(daypart=daypart)
        today_qs = FoodSafetyCompletion.objects.filter(date=_today())
        return qs.prefetch_related(
            Prefetch("completions", queryset=today_qs, to_attr="today_completion_list")
        ).order_by("daypart", "order", "id")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        task = self.get_object()
        comp, created = FoodSafetyCompletion.objects.get_or_create(
            template=task, date=_today(),
            defaults={"completed_by": request.user},
        )
        return Response(
            FoodSafetyCompletionSerializer(comp).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="uncomplete")
    def uncomplete(self, request, pk=None):
        task = self.get_object()
        FoodSafetyCompletion.objects.filter(template=task, date=_today()).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================================
# Temperature Targets + Readings
# ============================================================================

class TemperatureTargetViewSet(StoreScopedViewSet):
    serializer_class = TemperatureTargetSerializer
    queryset = TemperatureTarget.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return qs.order_by("kind", "order", "id")


class TemperatureReadingViewSet(StoreScopedViewSet):
    serializer_class = TemperatureReadingSerializer
    queryset = TemperatureReading.objects.all()
    permission_classes = [IsAuthenticated]
    store_field_name = "target__store"  # crosses a relation

    def get_queryset(self):
        # Override base because store_field_name has __; manual scoping:
        user = self.request.user
        qs = TemperatureReading.objects.all()
        if not user.is_superuser:
            qs = qs.filter(target__store=user.store)
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(target__kind=kind)
        # Default: last 7 days.
        try:
            days = int(self.request.query_params.get("range", "7").rstrip("d"))
        except ValueError:
            days = 7
        since = timezone.now() - timedelta(days=days)
        qs = qs.filter(recorded_at__gte=since)
        return qs.select_related("target").order_by("-recorded_at", "-id")

    def perform_create(self, serializer):
        target = serializer.validated_data["target"]
        # Multi-tenant guard against logging against another store's target.
        if target.store_id != self.request.user.store_id and not self.request.user.is_superuser:
            raise ValidationError({"target": "Target not in your store."})
        serializer.save(recorded_by=self.request.user)
