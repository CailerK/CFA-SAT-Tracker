"""
Setup Sheets endpoints.

Two resources:
  /api/setup-sheets/templates/   — reusable templates
  /api/setup-sheets/             — saved week-of sheets

Custom actions:
  POST /api/setup-sheets/:id/duplicate/   — clone an existing sheet
  POST /api/setup-sheets/:id/share/       — share with another user

NOTE: file uploads (HotSchedules Excel exports) are accepted but not yet
parsed on the server. We just record the filename so the UI can show it.
Persistent file storage on Railway requires a volume mount which we'll add
in a polish phase.
"""

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    SetupSheet,
    SetupSheetShare,
    SetupSheetTemplate,
    TimeBlock,
    User,
)
from .permissions import ReadAllWriteManager, is_manager_or_above
from .serializers import (
    SetupSheetSerializer,
    SetupSheetShareSerializer,
    SetupSheetTemplateSerializer,
)
from .viewsets import StoreScopedViewSet


class SetupSheetTemplateViewSet(StoreScopedViewSet):
    """CRUD for reusable setup sheet templates."""

    serializer_class = SetupSheetTemplateSerializer
    queryset = SetupSheetTemplate.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True)
        return qs.order_by("-updated_at", "-id")

    def perform_create(self, serializer):
        serializer.save(store=self.request.user.store, created_by=self.request.user)

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at"])


class SetupSheetViewSet(StoreScopedViewSet):
    """CRUD for saved setup sheets.

    Anyone can READ (the shared roster of the store), but only managers and
    the sheet's owner can mutate. We open up some actions further down.
    """

    serializer_class = SetupSheetSerializer
    queryset = SetupSheet.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    # Owners can edit their own sheets even if they're not managers.
    def get_permissions(self):
        if self.action in {"retrieve", "list"}:
            return [IsAuthenticated()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        # Filters
        params = self.request.query_params
        if params.get("mine") in {"1", "true", "yes"}:
            qs = qs.filter(owner=self.request.user)
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        # Cheap server-side search by name.
        q = params.get("q") or params.get("search")
        if q:
            qs = qs.filter(name__icontains=q)
        return qs.prefetch_related("time_blocks", "shares").order_by(
            "-updated_at", "-id"
        )

    def perform_create(self, serializer):
        # Auto-set store + owner = current user.
        serializer.save(
            store=self.request.user.store,
            owner=self.request.user,
            created_by=self.request.user,
        )

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        # Only the owner or a manager+ can update.
        if instance.owner_id != user.id and not is_manager_or_above(user):
            raise ValidationError("You can only edit sheets you own.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if instance.owner_id != user.id and not is_manager_or_above(user):
            raise ValidationError("You can only delete sheets you own.")
        instance.delete()

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        """Clone a sheet (with its time blocks) as a new draft."""
        source = self.get_object()
        # Use Django's pattern of setting pk=None to clone.
        clone = SetupSheet.objects.get(pk=source.pk)
        clone.pk = None
        clone.name = f"{source.name} (copy)"
        clone.status = "draft"
        clone.owner = request.user
        clone.created_by = request.user
        clone.is_shared = False
        clone.save()
        # Clone time blocks too.
        for tb in source.time_blocks.all():
            TimeBlock.objects.create(
                sheet=clone,
                label=tb.label, start_time=tb.start_time,
                end_time=tb.end_time, position=tb.position,
                positions_needed=tb.positions_needed,
                notes=tb.notes, order=tb.order,
            )
        return Response(SetupSheetSerializer(clone).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="share")
    def share(self, request, pk=None):
        """Body: {user_id: int, permission: 'view'|'edit'}."""
        sheet = self.get_object()
        user_id = request.data.get("user_id")
        permission = request.data.get("permission", "view")
        if not user_id:
            raise ValidationError({"user_id": "Required."})
        if permission not in {"view", "edit"}:
            raise ValidationError({"permission": "Must be 'view' or 'edit'."})
        try:
            target = User.objects.get(pk=user_id, store=request.user.store)
        except User.DoesNotExist:
            raise NotFound("User not found in this store.")
        share, created = SetupSheetShare.objects.update_or_create(
            sheet=sheet, shared_with=target,
            defaults={"permission": permission, "shared_by": request.user},
        )
        sheet.is_shared = True
        sheet.save(update_fields=["is_shared", "updated_at"])
        return Response(
            SetupSheetShareSerializer(share).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="upload")
    def upload(self, request, pk=None):
        """Accept a HotSchedules Excel upload. For v1 we just acknowledge the
        upload and record the filename — server-side parsing is a v2 task."""
        sheet = self.get_object()
        if is_manager_or_above(request.user) is False and sheet.owner_id != request.user.id:
            raise ValidationError("Only the owner or a manager can upload.")
        f = request.FILES.get("file")
        if not f:
            raise ValidationError({"file": "Multipart 'file' field is required."})
        # Future: persist to S3 / Railway volume + queue a parsing job.
        return Response({
            "received": True,
            "filename": f.name,
            "size_bytes": f.size,
            "note": "File received but not parsed in this version.",
        })
