"""
DRF serializers — the wire format for every API endpoint.

Convention: snake_case keys in JSON (Django default). Frontend normalizes
to camelCase at the App.js boundary (see frontend/src/App.js).
"""

from rest_framework import serializers

from .models import (
    FOHTaskCompletion,
    FOHTaskTemplate,
    ShiftSummary,
    ShiftTag,
    Store,
    StoreSettings,
    User,
    UserPreferences,
)


class StoreSettingsSerializer(serializers.ModelSerializer):
    """All toggles + waste goals. Manager-only writes (gated at viewset)."""

    class Meta:
        model = StoreSettings
        fields = [
            "features",
            "access",
            "cleaning_settings",
            "foh_require_initials",
            "waste_goal_daily",
            "waste_goal_weekly",
            "waste_goal_monthly",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class StoreSerializer(serializers.ModelSerializer):
    """Public-facing Store info plus nested settings.

    On GET /api/stores/me/ we return everything. On PATCH only the fields
    listed under `Meta.fields` are accepted — `id` and store_number are
    read-only so a manager can rename their store but not switch to someone
    else's.
    """

    settings = StoreSettingsSerializer(read_only=True)

    class Meta:
        model = Store
        fields = [
            "id",
            "name",
            "store_number",
            "address",
            "phone",
            "email",
            "vision",
            "mission",
            "timezone_name",
            "settings",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "store_number", "created_at", "updated_at"]


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Per-user UI preferences. The currently-authenticated user owns their
    own record — we don't expose other users' preferences via the API."""

    class Meta:
        model = UserPreferences
        fields = [
            "language",
            "theme_color",
            "dark_mode",
            "compact_mode",
            "notifications",
            "quick_action_ids",
            "insight_ids",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class UserMeSerializer(serializers.ModelSerializer):
    """User payload returned by /api/auth/me/ and a few other endpoints.

    Includes derived `initials` and a slim `store` reference. Does NOT
    include password or session tokens.
    """

    initials = serializers.CharField(read_only=True)
    store = StoreSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "initials",
            "role",
            "company_id",
            "phone",
            "avatar",
            "is_demo_user",
            "is_superuser",
            "is_staff",
            "store",
        ]
        read_only_fields = fields  # everything is read-only on this endpoint


# ============================================================================
# Phase 1: FOH Daily Tasks
# ============================================================================

class FOHTaskCompletionSerializer(serializers.ModelSerializer):
    """Embedded under FOHTaskTemplate so the frontend gets today's completion
    state in the same list request — no second round-trip."""
    completed_by_name = serializers.SerializerMethodField()
    completed_by_initials = serializers.SerializerMethodField()

    class Meta:
        model = FOHTaskCompletion
        fields = [
            "id",
            "date",
            "completed_at",
            "completed_by",
            "completed_by_name",
            "completed_by_initials",
            "initials",
        ]
        read_only_fields = ["id", "completed_at", "completed_by_name",
                            "completed_by_initials"]

    def get_completed_by_name(self, obj):
        u = obj.completed_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_completed_by_initials(self, obj):
        return obj.completed_by.initials if obj.completed_by else None


class FOHTaskTemplateSerializer(serializers.ModelSerializer):
    """The recurring task. Includes today's completion (if any) so the UI
    can render the checkbox state in one shot."""
    today_completion = serializers.SerializerMethodField()

    class Meta:
        model = FOHTaskTemplate
        fields = [
            "id", "shift", "text", "order",
            "archived_at", "today_completion",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "today_completion", "created_at", "updated_at"]

    def get_today_completion(self, obj):
        # The viewset prefetches `today_completion_list` for efficiency; fall
        # back to a direct lookup for individual GETs.
        prefetched = getattr(obj, "today_completion_list", None)
        if prefetched is not None:
            comp = prefetched[0] if prefetched else None
        else:
            from django.utils import timezone
            comp = obj.completions.filter(date=timezone.localdate()).first()
        return FOHTaskCompletionSerializer(comp).data if comp else None


# ============================================================================
# Phase 1: Shift Summary
# ============================================================================

class ShiftTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShiftTag
        fields = ["id", "kind", "label", "order", "is_active"]
        read_only_fields = ["id"]


class ShiftSummarySerializer(serializers.ModelSerializer):
    """Read/write serializer. Tag IDs sent on write; full tag objects on read."""
    tags = ShiftTagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=ShiftTag.objects.all(),
        many=True, write_only=True, required=False, source="tags",
    )
    shift_lead_name = serializers.SerializerMethodField()
    shift_lead_initials = serializers.SerializerMethodField()

    class Meta:
        model = ShiftSummary
        fields = [
            "id",
            "shift_lead", "shift_lead_name", "shift_lead_initials",
            "shift_date", "shift_type", "shift_status",
            "rating", "recap",
            "sales_note", "labor_percent",
            "sos_note", "handoff_note", "needs_follow_up",
            "is_draft",
            "tags", "tag_ids",
            "created_at", "updated_at", "submitted_at",
        ]
        read_only_fields = [
            "id", "shift_lead_name", "shift_lead_initials",
            "created_at", "updated_at", "submitted_at",
        ]

    def get_shift_lead_name(self, obj):
        u = obj.shift_lead
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_shift_lead_initials(self, obj):
        return obj.shift_lead.initials if obj.shift_lead else None
