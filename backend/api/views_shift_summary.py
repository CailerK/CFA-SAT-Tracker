"""
Shift Summary endpoints.

  GET    /api/shift-summaries/                  list submitted summaries
  POST   /api/shift-summaries/                  submit a final summary
  GET    /api/shift-summaries/:id/              detail
  PATCH  /api/shift-summaries/:id/              edit (manager+)
  DELETE /api/shift-summaries/:id/              hard delete (admin)
  GET    /api/shift-summaries/draft/today/      resume in-progress draft
  PATCH  /api/shift-summaries/draft/today/      autosave draft
  DELETE /api/shift-summaries/draft/today/      discard draft
  GET    /api/shift-summaries/tags/             tag catalog (wins + challenges)
  POST   /api/shift-summaries/tags/             create tag (manager+)
  PATCH  /api/shift-summaries/tags/:id/         edit tag (manager+)
  DELETE /api/shift-summaries/tags/:id/         delete tag (manager+)
"""

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ShiftSummary, ShiftTag
from .permissions import (
    ReadAllWriteManager,
    is_manager_or_above,
)
from .serializers import ShiftSummarySerializer, ShiftTagSerializer
from .viewsets import StoreScopedViewSet


class ShiftSummaryViewSet(StoreScopedViewSet):
    """List/create/detail. The 'draft/today' shortcuts live as @action methods."""

    serializer_class = ShiftSummarySerializer
    queryset = ShiftSummary.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        # Default list view hides drafts; pass ?include_drafts=true to see them.
        if self.action == "list" and self.request.query_params.get(
            "include_drafts"
        ) not in {"1", "true", "yes"}:
            qs = qs.filter(is_draft=False)
        # Optional filters
        shift = self.request.query_params.get("shift")
        if shift:
            qs = qs.filter(shift_type=shift)
        status_q = self.request.query_params.get("status")
        if status_q:
            qs = qs.filter(shift_status=status_q)
        return qs.order_by("-shift_date", "-id")

    def perform_create(self, serializer):
        # Auto-stamp store via the base viewset, plus shift_lead = current user
        # and submitted_at if not a draft.
        user = self.request.user
        is_draft = serializer.validated_data.get("is_draft", False)
        save_kwargs = {
            "store": user.store,
            "shift_lead": user,
        }
        if not is_draft:
            save_kwargs["submitted_at"] = timezone.now()
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        # Flipping is_draft False → True is fine; False → False keeps prior
        # submitted_at. False (was draft) → submit sets submitted_at.
        instance = serializer.instance
        was_draft = instance.is_draft
        will_be_draft = serializer.validated_data.get("is_draft", instance.is_draft)
        save_kwargs = {}
        if was_draft and not will_be_draft and instance.submitted_at is None:
            save_kwargs["submitted_at"] = timezone.now()
        serializer.save(**save_kwargs)

    def perform_destroy(self, instance):
        # Managers can hard-delete drafts they own; non-managers can only
        # delete their own drafts. Submitted summaries: admin only.
        user = self.request.user
        if instance.submitted_at is not None and not user.is_superuser:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                "Submitted summaries can only be deleted by an admin."
            )
        if (
            instance.is_draft
            and instance.shift_lead_id != user.id
            and not is_manager_or_above(user)
        ):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own drafts.")
        instance.delete()

    # ---------- Draft shortcuts (one active draft per user per day) ----------

    @action(detail=False, methods=["get", "patch", "delete"], url_path="draft/today")
    def draft_today(self, request):
        """One-stop endpoint for the in-progress shift summary draft.

        GET   — returns the draft, or 204 if none.
        PATCH — autosave: upsert the draft with the body fields.
        DELETE— discard the draft.
        """
        today = timezone.localdate()
        draft = ShiftSummary.objects.filter(
            store=request.user.store,
            shift_lead=request.user,
            shift_date=today,
            is_draft=True,
        ).first()

        if request.method == "GET":
            if not draft:
                return Response(status=status.HTTP_204_NO_CONTENT)
            return Response(ShiftSummarySerializer(draft).data)

        if request.method == "DELETE":
            if draft:
                draft.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        # PATCH — upsert.
        data = dict(request.data)
        data["is_draft"] = True
        data.setdefault("shift_date", today.isoformat())
        data.setdefault("shift_type", "opening")

        if draft is None:
            serializer = ShiftSummarySerializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save(
                store=request.user.store,
                shift_lead=request.user,
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            serializer = ShiftSummarySerializer(draft, data=data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)


# ---------- Shift Tag catalog (separate from the summary viewset) ----------


class ShiftTagViewSet(StoreScopedViewSet):
    """The catalog of win/challenge tags that drive the chips on a shift summary."""
    serializer_class = ShiftTagSerializer
    queryset = ShiftTag.objects.all()
    permission_classes = [IsAuthenticated, ReadAllWriteManager]

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        return qs.filter(is_active=True).order_by("kind", "order", "id")
