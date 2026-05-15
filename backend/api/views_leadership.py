"""
Phase 7: Leadership 360 + Team Development viewsets.

All viewsets inherit from StoreScopedViewSet to enforce multi-tenancy.
"""

from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import (
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
from .permissions import IsManagerOrAbove
from .serializers import (
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
    CRUD for position tracks (career progression paths).
    Manager+ can create/edit; all authenticated users can read.
    """
    queryset = PositionTrack.objects.all()
    serializer_class = PositionTrackSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManagerOrAbove()]
        return super().get_permissions()

    def get_queryset(self):
        return super().get_queryset().filter(archived_at__isnull=True).order_by("order", "id")

    def perform_destroy(self, instance):
        instance.archived_at = timezone.now()
        instance.save(update_fields=["archived_at", "updated_at"])


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
        return UserDevelopmentPlan.objects.filter(
            user=self.request.user,
        ).prefetch_related('lesson_completions')

    def _has_other_active(self, exclude_id=None):
        qs = UserDevelopmentPlan.objects.filter(
            user=self.request.user, status='active',
        )
        if exclude_id is not None:
            qs = qs.exclude(id=exclude_id)
        return qs.exists()

    def perform_create(self, serializer):
        # New enrollments default to status='active' — block if one already exists.
        intended_status = serializer.validated_data.get('status', 'active')
        if intended_status == 'active' and self._has_other_active():
            raise ValidationError(
                {'detail': 'You already have an active development plan. '
                           'Complete or remove it before starting another.'}
            )
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        new_status = serializer.validated_data.get('status', instance.status)
        # Block reactivation if another plan is active.
        if (new_status == 'active'
                and instance.status != 'active'
                and self._has_other_active(exclude_id=instance.id)):
            raise ValidationError(
                {'detail': 'You already have another active development plan. '
                           'Complete or remove it before reactivating this one.'}
            )
        # Auto-stamp completed_at when transitioning to completed; clear it on
        # transitions back to active so re-enrolling resets the timestamp.
        if new_status == 'completed' and instance.status != 'completed':
            serializer.save(completed_at=timezone.now())
        elif new_status == 'active' and instance.status == 'completed':
            serializer.save(completed_at=None)
        else:
            serializer.save()


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
        return LessonCompletion.objects.filter(
            enrollment__user=self.request.user,
        ).select_related('enrollment')

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
                enrollment.status = 'active'
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
