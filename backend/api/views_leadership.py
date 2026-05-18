"""
Phase 7: Leadership 360 + Team Development viewsets.

All viewsets inherit from StoreScopedViewSet to enforce multi-tenancy.
"""

from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    DevelopmentTrackPlan,
    Evaluation360,
    Evaluation360Template,
    EvaluationEvaluator,
    LeadershipArea,
    LeadershipNote,
    LessonCompletion,
    PositionTrack,
    TrackProgress,
    UserDevelopmentPlan,
)
from .permissions import IsAdminOrAbove, IsManagerOrAbove, subordinate_roles, is_admin_or_above
from .serializers import (
    DevelopmentTrackPlanSerializer,
    Evaluation360Serializer,
    Evaluation360TemplateSerializer,
    EvaluationEvaluatorSerializer,
    LeadershipAreaSerializer,
    LeadershipNoteSerializer,
    LessonCompletionSerializer,
    PositionTrackSerializer,
    TrackProgressSerializer,
    UserDevelopmentPlanSerializer,
)
from .viewsets import StoreScopedViewSet


class Evaluation360TemplateViewSet(StoreScopedViewSet):
    """
    CRUD for 360 evaluation templates.
    Manager+ can create/edit templates; all authenticated users can read.
    """
    queryset = Evaluation360Template.objects.all()
    serializer_class = Evaluation360TemplateSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()


class Evaluation360ViewSet(StoreScopedViewSet):
    """
    CRUD for 360 evaluations.
    Manager+ can create evaluations; evaluatees + evaluators can view theirs.
    """
    queryset = Evaluation360.objects.select_related(
        'evaluatee', 'template', 'store'
    ).prefetch_related('evaluators__user')
    serializer_class = Evaluation360Serializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.is_manager_or_above:
            return qs
        return qs.filter(
            models.Q(evaluatee=user) | models.Q(evaluators__user=user)
        ).distinct()

    def perform_create(self, serializer):
        evaluation = serializer.save()
        evaluators = self.request.data.get("evaluators", [])
        if not isinstance(evaluators, list):
            raise ValidationError({"evaluators": "Expected a list of evaluators."})

        created_count = 0
        for entry in evaluators:
            user_id = entry.get("user")
            evaluator_type = entry.get("evaluator_type")
            if not user_id or evaluator_type not in {"peer", "manager", "direct_report"}:
                continue
            EvaluationEvaluator.objects.get_or_create(
                evaluation=evaluation,
                user_id=user_id,
                defaults={"evaluator_type": evaluator_type},
            )
            created_count += 1

        if created_count:
            evaluation.progress_percent = 0
            evaluation.save(update_fields=["progress_percent"])

    @action(detail=True, methods=['post'], url_path='respond')
    def respond(self, request, pk=None):
        """
        POST /api/leadership/360/:id/respond/
        Body: { "responses": {...} }
        
        Allows an evaluator to submit their responses for this evaluation.
        """
        evaluation = self.get_object()
        user = request.user
        
        # Find the evaluator record for this user.
        try:
            evaluator = evaluation.evaluators.get(user=user)
        except EvaluationEvaluator.DoesNotExist:
            return Response(
                {"detail": "You are not an evaluator for this evaluation."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update the evaluator's responses.
        evaluator.responses = request.data.get('responses', {})
        evaluator.completed_at = timezone.now()
        evaluator.save()
        
        # Recalculate progress_percent: count how many evaluators have completed.
        total = evaluation.evaluators.count()
        completed = evaluation.evaluators.filter(completed_at__isnull=False).count()
        evaluation.progress_percent = round((completed / total) * 100) if total > 0 else 0
        
        # If all evaluators have completed, mark the evaluation as completed.
        if completed == total:
            evaluation.status = 'completed'
            evaluation.completed_at = timezone.now()
        
        evaluation.save()
        
        return Response(
            Evaluation360Serializer(evaluation, context={'request': request}).data,
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """
        GET /api/leadership/360/stats/
        Returns: { "total": X, "in_progress": Y, "completed": Z }
        """
        qs = self.get_queryset()
        return Response({
            "total": qs.count(),
            "in_progress": qs.filter(status='in_progress').count(),
            "completed": qs.filter(status='completed').count(),
            "reviewed": qs.filter(status='completed').count(),
        })


class PositionTrackViewSet(StoreScopedViewSet):
    """
    CRUD for position tracks (career progression paths) — backs the Career
    Path editor on Team Development.

    Permissions:
      - Read: any authenticated user (subject to the store's
        `dev_tracks_visible_to_team` toggle for non-managers).
      - Write (create/update/destroy/reorder): admin (`is_admin=True`) or
        superuser only. Managers explicitly do NOT get edit access here —
        the Career Path is store-wide configuration, not a per-team list.
    """
    queryset = PositionTrack.objects.all()
    serializer_class = PositionTrackSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reorder']:
            return [IsAdminOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        qs = super().get_queryset().filter(archived_at__isnull=True).order_by("order", "id")
        # Hide the path entirely from team-members when the store has
        # toggled visibility off. Managers/admins always see it.
        user = self.request.user
        if user.is_authenticated and not user.is_manager_or_above and not user.is_superuser:
            settings = getattr(user.store, "settings", None) if getattr(user, "store", None) else None
            if settings and not settings.dev_tracks_visible_to_team:
                return qs.none()
        return qs

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at", "updated_at"])

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Bulk-update the `order` field for the user's store.

        Body: `{"track_ids": [3, 1, 4, 2]}` — first id is order=0, etc. We
        use a list rather than per-id offsets so the front end can just
        send the dragged sequence; we recompute the offsets server-side.
        """
        track_ids = request.data.get("track_ids") or []
        if not isinstance(track_ids, list):
            raise ValidationError({"track_ids": "Must be a list of track ids."})

        # Only update tracks in this store — silently drop foreign ids.
        tracks = {
            t.id: t for t in
            PositionTrack.objects.filter(
                store=request.user.store, archived_at__isnull=True,
            )
        }
        updated = 0
        for index, tid in enumerate(track_ids):
            track = tracks.get(int(tid)) if str(tid).isdigit() or isinstance(tid, int) else None
            if not track:
                continue
            if track.order != index:
                track.order = index
                track.save(update_fields=["order", "updated_at"])
                updated += 1
        return Response({"updated": updated})


class TrackProgressViewSet(StoreScopedViewSet):
    """
    CRUD for user progress through position tracks.
    Users can view their own progress; managers can update anyone's.
    """
    queryset = TrackProgress.objects.select_related('user', 'track')
    serializer_class = TrackProgressSerializer

    def get_queryset(self):
        qs = super().get_queryset().select_related('user', 'track').filter(
            track__archived_at__isnull=True
        )
        user = self.request.user
        scope = self.request.query_params.get("scope", "all")
        position = self.request.query_params.get("position")

        # Non-managers can only see their own progress.
        if not user.is_manager_or_above:
            qs = qs.filter(user=user)
        elif scope == "my-team":
            qs = qs.filter(user__manager=user)

        if position:
            variants = {
                position,
                position.replace("-", " "),
                position.replace("-", "_"),
            }
            clause = models.Q()
            for variant in variants:
                clause |= models.Q(track__name__iexact=variant)
            qs = qs.filter(clause)

        if self.request.query_params.get("q"):
            q = self.request.query_params["q"]
            qs = qs.filter(
                models.Q(user__first_name__icontains=q)
                | models.Q(user__last_name__icontains=q)
                | models.Q(track__name__icontains=q)
            )
        return qs

    def get_permissions(self):
        # Managers can create/update any user's progress.
        # Team members can only update their own.
        if self.action in ['create', 'update', 'partial_update']:
            # We'll check ownership in perform_update if not a manager.
            return super().get_permissions()
        return super().get_permissions()

    def perform_update(self, serializer):
        # If not a manager, ensure they're only updating their own record.
        if not self.request.user.is_manager_or_above:
            if serializer.instance.user != self.request.user:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only update your own progress.")
        serializer.save()


class LeadershipAreaViewSet(StoreScopedViewSet):
    """
    CRUD for user's selected leadership focus areas.
    Users can manage their own areas.
    """
    queryset = LeadershipArea.objects.select_related('user')
    serializer_class = LeadershipAreaSerializer

    def get_queryset(self):
        # Users can only see/manage their own leadership areas.
        return LeadershipArea.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        area, created = LeadershipArea.objects.get_or_create(
            user=request.user,
            area_key=serializer.validated_data['area_key'],
        )
        data = self.get_serializer(area).data
        return Response(
            data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def perform_create(self, serializer):
        # Auto-set the user to the current user.
        serializer.save(user=self.request.user)


class LeadershipNoteViewSet(StoreScopedViewSet):
    """
    CRUD for personal leadership development notes.
    Users can only see/manage their own notes.
    """
    queryset = LeadershipNote.objects.select_related('user')
    serializer_class = LeadershipNoteSerializer

    def get_queryset(self):
        # Users can only see their own notes.
        return LeadershipNote.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Auto-set the user to the current user.
        serializer.save(user=self.request.user)


class UserDevelopmentPlanViewSet(StoreScopedViewSet):
    """
    CRUD for a user's enrollment in leadership development plans.

    The catalog of plans (slug -> name/description/total_steps) lives in the
    frontend constant `DEV_PLANS` while the user transcribes them. Each row
    here is a single user's enrollment in one plan, with status + current_step.

    Business rule: a user may only have **one active enrollment at a time**.
    Completed enrollments are unlimited (history). Enforced in `perform_create`
    and `perform_update` below.
    """
    queryset = UserDevelopmentPlan.objects.select_related('user').prefetch_related(
        'lesson_completions'
    )
    serializer_class = UserDevelopmentPlanSerializer

    def get_queryset(self):
        # Strict per-user isolation: only the requesting user's own
        # enrollments are returned. Managers do NOT see other users' plans
        # via this endpoint — assignment is fire-and-forget; once created
        # the enrollment belongs to the assignee.
        return UserDevelopmentPlan.objects.filter(
            user=self.request.user,
        ).select_related('user', 'assigned_by').prefetch_related('lesson_completions')

    def _has_other_active(self, target_user, exclude_id=None):
        qs = UserDevelopmentPlan.objects.filter(
            user=target_user, status='active',
        )
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    def perform_create(self, serializer):
        requester = self.request.user
        # Default the enrollment to the requester. Admins+ may pass a
        # different `user` to assign to a team member.
        target_user = serializer.validated_data.get('user') or requester
        is_assignment = target_user.id != requester.id
        if is_assignment:
            # Assigning a development plan to someone else is reserved for
            # admin-tier (admin role, is_admin flag, or superuser). Shift
            # leads / managers can monitor progress but cannot enroll
            # another user — that's an admin/director-level decision.
            if not is_admin_or_above(requester):
                raise ValidationError(
                    {'user': 'Only admins or superusers can assign plans to other users.'}
                )
            # Same-store guard: a manager can only assign to users in their
            # own store (multi-tenancy invariant).
            if (getattr(requester, 'store_id', None)
                    and getattr(target_user, 'store_id', None)
                    and requester.store_id != target_user.store_id):
                raise ValidationError(
                    {'user': 'You can only assign plans to team members in '
                             'your own store.'}
                )

        # 1-active-plan-per-user rule applies to the TARGET user.
        intended_status = serializer.validated_data.get('status', 'active')
        if intended_status == 'active' and self._has_other_active(target_user):
            who = 'This team member' if is_assignment else 'You'
            raise ValidationError(
                {'detail': f'{who} already has an active development plan. '
                           'Complete or remove it before starting another.'}
            )

        save_kwargs = {'user': target_user}
        if is_assignment:
            save_kwargs['assigned_by'] = requester
        serializer.save(**save_kwargs)

    def perform_update(self, serializer):
        instance = serializer.instance
        new_status = serializer.validated_data.get('status', instance.status)
        # Block reactivation (paused/completed → active) if another plan is
        # already active for THIS enrollment's owner. Pausing or completing
        # the active plan is always OK.
        if (new_status == 'active'
                and instance.status != 'active'
                and self._has_other_active(instance.user, exclude_id=instance.id)):
            raise ValidationError(
                {'detail': 'You already have another active development plan. '
                           'Pause or remove it before resuming this one.'}
            )
        # Auto-stamp / clear completed_at on transitions.
        # active → completed   : stamp now
        # paused → completed   : stamp now
        # completed → active   : clear
        # completed → paused   : clear (treat as resetting completion status)
        # anything → paused/active (non-completed): make sure completed_at is null
        if new_status == 'completed' and instance.status != 'completed':
            serializer.save(completed_at=timezone.now())
        elif new_status != 'completed' and instance.status == 'completed':
            serializer.save(completed_at=None)
        else:
            serializer.save()

    # ------------------------------------------------------------------
    # GET /api/leadership/development-plans/team_progress/
    # ------------------------------------------------------------------
    # Returns every dev-plan enrollment belonging to a user STRICTLY BELOW
    # the requester in the role hierarchy and IN THE SAME STORE. Used by the
    # manager/admin "Team progress" panel on the Dev Plans library page so
    # leaders can see how their reports are progressing through plans.
    #
    # - Managers see team-members + shift-leads
    # - Directors see managers + below
    # - Admins see directors + below
    # - Superusers see every role below super-admin (still store-scoped)
    # - Team members get 403 (no subordinates)
    @action(detail=False, methods=['get'], url_path='team_progress')
    def team_progress(self, request):
        requester = request.user
        roles = subordinate_roles(requester)
        if not roles:
            return Response(
                {'detail': 'You do not have any subordinates to view.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Same-store guard. Without a store the user can't see anything.
        store_id = getattr(requester, 'store_id', None)
        if store_id is None:
            return Response({'results': []})

        # Anti-snooping: even though we filter by `role__in=roles`, also
        # exclude the requester themselves and any superuser (defense in depth
        # — superusers should never appear under another admin's panel even
        # if their role string accidentally matches).
        qs = (
            UserDevelopmentPlan.objects
            .filter(
                user__role__in=roles,
                user__store_id=store_id,
                user__is_superuser=False,
            )
            .exclude(user_id=requester.id)
            .select_related('user', 'assigned_by')
            .prefetch_related('lesson_completions')
            .order_by('user__last_name', 'user__first_name', '-started_at')
        )
        serializer = self.get_serializer(qs, many=True)
        return Response({'results': serializer.data})


class LessonCompletionViewSet(StoreScopedViewSet):
    """
    Per-lesson completion records inside a development-plan enrollment.

    Users can only see/manage completions for their own enrollments.
    Creating a row marks the lesson done; deleting it un-completes the lesson.
    The parent enrollment's `current_step` is auto-synced to the count of
    completed lessons, and the enrollment is auto-flipped to `completed` once
    all lessons are done (and back to `active` when a final one is removed).
    """
    queryset = LessonCompletion.objects.select_related('enrollment', 'enrollment__user')
    serializer_class = LessonCompletionSerializer

    def get_queryset(self):
        # Per-user isolation first.
        qs = LessonCompletion.objects.filter(
            enrollment__user=self.request.user,
        ).select_related('enrollment')
        # CRITICAL: scope to a specific enrollment when the caller asks for it.
        # Lesson keys ('01', '02', ...) are NOT plan-namespaced — they repeat
        # across every dev plan — so without this filter a user who has
        # paused one plan and opened another would see the old plan's
        # completions overwrite the new plan's empty state by lesson_key
        # collision. See test_lesson_completion_isolation_by_enrollment.
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        return qs

    def _validate_enrollment(self, enrollment):
        if enrollment.user_id != self.request.user.id:
            raise ValidationError(
                {'enrollment': 'You can only manage completions for your '
                               'own enrollments.'}
            )

    def _sync_enrollment(self, enrollment):
        """Recalc current_step from completions and flip status if needed."""
        completed_count = enrollment.lesson_completions.count()
        enrollment.current_step = completed_count
        total = enrollment.total_steps or 0
        if total > 0 and completed_count >= total:
            if enrollment.status != 'completed':
                enrollment.status = 'completed'
                enrollment.completed_at = timezone.now()
        else:
            # Roll back from 'completed' if a row was deleted after auto-complete.
            if enrollment.status == 'completed':
                # Prefer 'active' so the user keeps working; but if another plan
                # is now active, go to 'paused' to keep the 1-active invariant.
                has_other_active = UserDevelopmentPlan.objects.filter(
                    user=enrollment.user, status='active',
                ).exclude(id=enrollment.id).exists()
                enrollment.status = 'paused' if has_other_active else 'active'
                enrollment.completed_at = None
        enrollment.save(
            update_fields=['current_step', 'status', 'completed_at', 'updated_at']
        )

    def perform_create(self, serializer):
        enrollment = serializer.validated_data['enrollment']
        self._validate_enrollment(enrollment)
        instance = serializer.save()
        self._sync_enrollment(instance.enrollment)

    def perform_destroy(self, instance):
        enrollment = instance.enrollment
        super().perform_destroy(instance)
        self._sync_enrollment(enrollment)


# ============================================================================
# Team Development → Edit Tracks page
# ============================================================================

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def team_development_settings(request):
    """Read or update store-wide Team Development settings.

    GET: any authenticated user — returns the visibility flag so the UI
         knows whether to render the Career Path card.
    PATCH: admin or superuser only — updates the flag.

    Body: `{"dev_tracks_visible_to_team": true|false}`.
    """
    user = request.user
    store = getattr(user, "store", None)
    if not store:
        raise ValidationError({"store": "User has no store assigned."})

    # `StoreSettings` is 1:1 with Store, but legacy stores may not have the
    # row yet — auto-create on first access so reads don't 500.
    from .models import StoreSettings
    settings, _ = StoreSettings.objects.get_or_create(store=store)

    if request.method == "PATCH":
        if not is_admin_or_above(user):
            raise PermissionDenied("Only admins can change Team Development settings.")
        if "dev_tracks_visible_to_team" in request.data:
            settings.dev_tracks_visible_to_team = bool(
                request.data["dev_tracks_visible_to_team"]
            )
            settings.save(update_fields=["dev_tracks_visible_to_team", "updated_at"])

    return Response({
        "dev_tracks_visible_to_team": settings.dev_tracks_visible_to_team,
        "can_edit": is_admin_or_above(user),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_pathway(request):
    """Per-user career pathway: the store's tracks + this user's progress.

    Always scoped to `request.user`. Returns:
      - `tracks`: every active PositionTrack in the user's store (ordered).
      - `progress`: list of TrackProgress rows for *this user* keyed by
                    track id, plus a `current_track_id` (the most-advanced
                    in-progress track, or null) for highlighting.

    Respects the store's visibility toggle: if the team has the path turned
    off, returns empty `tracks`/`progress` so the UI can render an empty
    state without leaking which roles exist.
    """
    user = request.user
    store = getattr(user, "store", None)
    if not store:
        return Response({"tracks": [], "progress": [], "current_track_id": None})

    # Visibility gate (managers/admins always see).
    settings = getattr(store, "settings", None)
    if (
        settings
        and not settings.dev_tracks_visible_to_team
        and not user.is_manager_or_above
        and not user.is_superuser
    ):
        return Response({
            "tracks": [],
            "progress": [],
            "current_track_id": None,
            "hidden_by_admin": True,
        })

    tracks = PositionTrack.objects.filter(
        store=store, archived_at__isnull=True,
    ).order_by("order", "id")

    progress = TrackProgress.objects.filter(
        user=user, track__in=tracks,
    ).select_related("track")

    # "Current" = the most-advanced in_progress row; falls back to the
    # earliest not_started track if every row is fresh.
    current_id = None
    in_progress = sorted(
        [p for p in progress if p.status == "in_progress"],
        key=lambda p: p.track.order,
        reverse=True,
    )
    if in_progress:
        current_id = in_progress[0].track_id

    return Response({
        "tracks": PositionTrackSerializer(tracks, many=True).data,
        "progress": TrackProgressSerializer(progress, many=True).data,
        "current_track_id": current_id,
    })


# =============================================================================
# Manage Development Tracks (per-position certification/training plans)
# =============================================================================

class DevelopmentTrackPlanViewSet(StoreScopedViewSet):
    """CRUD for the "Manage Development Tracks" section on Team Development.

    Admins/superusers may create/edit/delete. All authenticated store members
    may read so trainees can see what's expected of them. Filter by
    `?from_position=team-member` to fetch only the tracks for one career step.
    """
    queryset = DevelopmentTrackPlan.objects.all()
    serializer_class = DevelopmentTrackPlanSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update',
                           'destroy', 'reorder']:
            return [IsAdminOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        qs = (super().get_queryset()
              .filter(archived_at__isnull=True)
              .order_by('from_position', 'order', 'id'))
        position = self.request.query_params.get('from_position')
        if position:
            qs = qs.filter(from_position=position)
        return qs

    def perform_create(self, serializer):
        store = getattr(self.request.user, "store", None)
        if store is None:
            raise PermissionDenied(
                "You must be assigned to a store before creating development tracks."
            )
        position = serializer.validated_data.get("from_position")
        save_kwargs = {"store": store, "created_by": self.request.user}
        if position and "order" not in self.request.data:
            max_order = (
                DevelopmentTrackPlan.objects
                .filter(
                    store=store,
                    from_position=position,
                    archived_at__isnull=True,
                )
                .aggregate(models.Max("order"))
                .get("order__max")
            )
            save_kwargs["order"] = 0 if max_order is None else max_order + 1
        serializer.save(**save_kwargs)

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=['archived_at', 'updated_at'])

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """Re-order plans within a single `from_position` bucket."""
        position = request.data.get('from_position')
        ids = request.data.get('plan_ids') or []
        if not position or not isinstance(ids, list):
            raise ValidationError(
                {"detail": "Need from_position + plan_ids list."}
            )
        plans = {
            p.id: p for p in DevelopmentTrackPlan.objects.filter(
                store=request.user.store,
                from_position=position,
                archived_at__isnull=True,
            )
        }
        updated = 0
        for i, pid in enumerate(ids):
            try:
                pid_int = int(pid)
            except (TypeError, ValueError):
                continue
            p = plans.get(pid_int)
            if p and p.order != i:
                p.order = i
                p.save(update_fields=['order', 'updated_at'])
                updated += 1
        return Response({"updated": updated})
