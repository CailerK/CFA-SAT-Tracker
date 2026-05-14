"""
DRF serializers — the wire format for every API endpoint.

Convention: snake_case keys in JSON (Django default). Frontend normalizes
to camelCase at the App.js boundary (see frontend/src/App.js).
"""

from django.utils import timezone
from django.utils.text import slugify
from rest_framework import serializers

from .models import (
    CalendarEvent,
    ChatChannel,
    ChatMembership,
    ChatMessage,
    CleaningCompletion,
    CleaningTask,
    Department,
    EmployeeRecord,
    Equipment,
    EquipmentCategory,
    Evaluation360,
    Evaluation360Template,
    EvaluationEvaluator,
    FOHTaskCompletion,
    FOHTaskTemplate,
    FoodSafetyCompletion,
    FoodSafetyTask,
    GuestComplaint,
    KitchenChecklistCompletion,
    KitchenChecklistTask,
    LeadershipArea,
    LeadershipNote,
    MaintenanceLog,
    MaintenanceSchedule,
    MealPeriod,
    MenuItem,
    Notification,
    PositionTrack,
    QuickLink,
    QuickLinkCategory,
    SetupSheet,
    SetupSheetShare,
    SetupSheetTemplate,
    ShiftSummary,
    ShiftTag,
    Store,
    StoreSettings,
    Survey,
    SurveyAnswer,
    SurveyQuestion,
    SurveyResponse,
    TemperatureReading,
    TemperatureTarget,
    TimeBlock,
    TrackProgress,
    TraineeAssignment,
    TrainingActivity,
    TrainingPlan,
    User,
    UserPreferences,
    Vendor,
    WasteEntry,
    WasteReason,
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


class UserManagementListSerializer(serializers.ModelSerializer):
    """Serializer for listing users in the user management interface."""
    initials = serializers.CharField(read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)
    store_number = serializers.CharField(source='store.store_number', read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "initials",
            "role",
            "phone",
            "is_admin",
            "is_superuser",
            "is_staff",
            "is_demo_user",
            "store_name",
            "store_number",
            "shift_preference",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "initials", "full_name", "store_name", 
                            "store_number", "created_at", "updated_at"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email


class UserManagementDetailSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating users in the user management interface."""
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    initials = serializers.CharField(read_only=True)
    store_name = serializers.CharField(source='store.name', read_only=True)

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
            "phone",
            "password",
            "is_admin",
            "is_superuser",
            "is_staff",
            "is_demo_user",
            "store",
            "store_name",
            "company_id",
            "shift_preference",
            "manager",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id", 
            "initials", 
            "store_name", 
            "created_at", 
            "updated_at",
            "is_superuser",  # Can only be set via Django admin or server-side
            "is_staff",      # Can only be set via Django admin or server-side
            "is_demo_user",  # Can only be set via Django admin or server-side
        ]

    def validate(self, data):
        """
        Validate user data.
        
        Note: is_superuser, is_staff, and is_demo_user are read-only fields
        and can only be set via Django admin or server-side scripts.
        
        Admins can:
        - Create new admins (is_admin=True on new users)
        - NOT change is_admin on existing admins (can only modify non-admins)
        """
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            # For UPDATES: Regular admins can't modify is_admin on existing admins
            if self.instance and self.instance.is_admin:
                if 'is_admin' in data and data['is_admin'] != self.instance.is_admin:
                    raise serializers.ValidationError({
                        'is_admin': "You cannot modify admin status of existing admins."
                    })
            
            # For CREATES: Admins CAN create new admins (no restriction)
        
        return data

    def create(self, validated_data):
        """Create a new user with proper password hashing."""
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        
        if password:
            user.set_password(password)
        else:
            # Set a random password if none provided
            user.set_password(User.objects.make_random_password())
        
        user.save()
        return user

    def update(self, instance, validated_data):
        """Update user, handling password separately."""
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance


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


# ============================================================================
# Phase 2: Setup Sheets
# ============================================================================

class TimeBlockSerializer(serializers.ModelSerializer):
    """Nested under a Template or a Sheet. Frontend reads/writes these as
    part of the parent's `time_blocks` list."""

    class Meta:
        model = TimeBlock
        fields = [
            "id", "day_of_week", "label",
            "start_time", "end_time",
            "position", "positions_needed", "notes", "order",
        ]
        read_only_fields = ["id"]


class SetupSheetTemplateSerializer(serializers.ModelSerializer):
    """A reusable template. `time_blocks_count` is derived for the card UI;
    `time_blocks` is the nested list used by the Edit Template page."""
    time_blocks_count = serializers.IntegerField(read_only=True)
    time_blocks = TimeBlockSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SetupSheetTemplate
        fields = [
            "id", "name", "description",
            "time_blocks_count", "time_blocks",
            "created_by", "created_by_name",
            "archived_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "time_blocks_count", "time_blocks", "created_by_name",
            "created_at", "updated_at",
        ]

    def get_created_by_name(self, obj):
        u = obj.created_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email


class SetupSheetShareSerializer(serializers.ModelSerializer):
    """Per-user share row, returned nested on a SetupSheet."""
    shared_with_name = serializers.SerializerMethodField()

    class Meta:
        model = SetupSheetShare
        fields = ["id", "shared_with", "shared_with_name", "permission", "created_at"]
        read_only_fields = ["id", "shared_with_name", "created_at"]

    def get_shared_with_name(self, obj):
        u = obj.shared_with
        return f"{u.first_name} {u.last_name}".strip() or u.email


class SetupSheetSerializer(serializers.ModelSerializer):
    """A saved weekly setup sheet."""
    owner_name = serializers.SerializerMethodField()
    week_range = serializers.SerializerMethodField()
    time_blocks = TimeBlockSerializer(many=True, read_only=True)
    shares = SetupSheetShareSerializer(many=True, read_only=True)

    class Meta:
        model = SetupSheet
        fields = [
            "id", "name",
            "week_start", "week_end", "week_range",
            "is_shared",
            "owner", "owner_name",
            "employees_count", "areas_count", "hours",
            "source_template",
            "status",
            "time_blocks", "shares",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "owner_name", "week_range", "time_blocks", "shares",
            "created_at", "updated_at",
        ]

    def get_owner_name(self, obj):
        u = obj.owner
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_week_range(self, obj):
        # "Apr 18 – Apr 25, 2026" — convenience for the SavedSetups list UI.
        if not obj.week_start:
            return ""
        if not obj.week_end:
            return obj.week_start.strftime("%b %-d, %Y")
        if obj.week_start.year == obj.week_end.year:
            return (
                f"{obj.week_start.strftime('%b %-d')} – "
                f"{obj.week_end.strftime('%b %-d, %Y')}"
            )
        return (
            f"{obj.week_start.strftime('%b %-d, %Y')} – "
            f"{obj.week_end.strftime('%b %-d, %Y')}"
        )


# ============================================================================
# Phase 3: Cleaning & Maintenance
# ============================================================================

class CleaningCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CleaningCompletion
        fields = [
            "id", "date", "completed_at",
            "completed_by", "completed_by_name", "notes",
        ]
        read_only_fields = ["id", "completed_at", "completed_by_name"]

    def get_completed_by_name(self, obj):
        u = obj.completed_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email


class CleaningTaskSerializer(serializers.ModelSerializer):
    """Cleaning task with today's completion attached (mirrors FOH pattern)."""
    today_completion = serializers.SerializerMethodField()

    class Meta:
        model = CleaningTask
        fields = [
            "id", "scope", "name", "frequency",
            "days", "supplies", "links", "estimated_minutes", "order",
            "today_completion", "archived_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "today_completion", "archived_at", "created_at", "updated_at",
        ]

    def get_today_completion(self, obj):
        # `today_completion` is a misnomer for non-daily tasks: it represents
        # the most recent completion within the active period for the task's
        # frequency, so the UI checkbox reflects "done this week/month/quarter".
        from .views_cleaning import period_window
        start, end = period_window(obj.frequency)
        prefetched = getattr(obj, "period_completion_list", None)
        if prefetched is not None:
            comp = next(
                (c for c in prefetched if start <= c.date <= end),
                None,
            )
        else:
            comp = (
                obj.completions
                .filter(date__gte=start, date__lte=end)
                .order_by('-date')
                .first()
            )
        return CleaningCompletionSerializer(comp).data if comp else None


# ============================================================================
# Phase 4: Kitchen Checklists
# ============================================================================

class KitchenChecklistCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = KitchenChecklistCompletion
        fields = ["id", "date", "completed_at", "completed_by", "completed_by_name"]
        read_only_fields = ["id", "completed_at", "completed_by_name"]

    def get_completed_by_name(self, obj):
        u = obj.completed_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email


class KitchenChecklistTaskSerializer(serializers.ModelSerializer):
    today_completion = serializers.SerializerMethodField()

    class Meta:
        model = KitchenChecklistTask
        fields = [
            "id", "shift", "text", "order",
            "archived_at", "today_completion",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "today_completion", "created_at", "updated_at"]

    def get_today_completion(self, obj):
        prefetched = getattr(obj, "today_completion_list", None)
        if prefetched is not None:
            comp = prefetched[0] if prefetched else None
        else:
            from django.utils import timezone
            comp = obj.completions.filter(date=timezone.localdate()).first()
        return KitchenChecklistCompletionSerializer(comp).data if comp else None


# ============================================================================
# Phase 4: Waste Tracker
# ============================================================================

class MealPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPeriod
        fields = ["id", "slug", "label", "emoji", "order"]


class MenuItemSerializer(serializers.ModelSerializer):
    meal_period_slug = serializers.CharField(source="meal_period.slug", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id", "name", "emoji", "unit_price", "order",
            "meal_period", "meal_period_slug",
            "archived_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "meal_period_slug", "archived_at", "created_at", "updated_at"]


class WasteReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteReason
        fields = ["id", "slug", "label", "emoji", "order", "is_active"]
        read_only_fields = ["id"]


class WasteEntrySerializer(serializers.ModelSerializer):
    """A logged waste entry. menu_item_id required on create; the rest is
    looked up server-side at logging time."""
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    menu_item_emoji = serializers.CharField(source="menu_item.emoji", read_only=True)
    meal_period_slug = serializers.CharField(
        source="menu_item.meal_period.slug", read_only=True
    )
    reason_label = serializers.CharField(source="reason.label", read_only=True)
    recorded_by_name = serializers.SerializerMethodField()
    total_cost = serializers.FloatField(read_only=True)

    class Meta:
        model = WasteEntry
        fields = [
            "id",
            "menu_item", "menu_item_name", "menu_item_emoji", "meal_period_slug",
            "qty", "unit",
            "unit_price_at_time", "total_cost",
            "reason", "reason_label",
            "notes",
            "recorded_at", "recorded_by", "recorded_by_name",
        ]
        read_only_fields = [
            "id", "menu_item_name", "menu_item_emoji", "meal_period_slug",
            "unit_price_at_time", "total_cost", "reason_label",
            "recorded_at", "recorded_by", "recorded_by_name",
        ]

    def get_recorded_by_name(self, obj):
        u = obj.recorded_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email


# ============================================================================
# Phase 5: Equipment
# ============================================================================

class MaintenanceScheduleSerializer(serializers.ModelSerializer):
    urgency = serializers.CharField(read_only=True)

    class Meta:
        model = MaintenanceSchedule
        fields = [
            "id", "equipment", "task_name", "cadence",
            "next_due", "last_completed", "urgency_threshold_days",
            "urgency", "archived_at",
        ]
        read_only_fields = ["id", "urgency", "archived_at"]


class MaintenanceLogSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceLog
        fields = [
            "id", "equipment", "kind", "notes",
            "performed_by", "performed_by_name", "performed_at",
        ]
        read_only_fields = ["id", "performed_by", "performed_by_name", "performed_at"]

    def get_performed_by_name(self, obj):
        u = obj.performed_by
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email


class EquipmentSerializer(serializers.ModelSerializer):
    """Equipment with its top-of-list maintenance schedule attached."""
    schedule = serializers.SerializerMethodField()
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    class Meta:
        model = Equipment
        fields = [
            "id", "name", "icon", "status", "notes",
            "category", "category_slug",
            "installed_at", "warranty_expires",
            "archived_at", "created_at", "updated_at",
            "schedule",
        ]
        read_only_fields = ["id", "category_slug", "schedule", "archived_at",
                            "created_at", "updated_at"]

    def get_schedule(self, obj):
        # Surface the next-due schedule for the card UI (matches the
        # `schedule: {task, cadence, date, urgency}` shape from the frontend).
        prefetched = getattr(obj, "next_schedule_list", None)
        if prefetched is not None:
            sched = prefetched[0] if prefetched else None
        else:
            sched = obj.schedules.filter(archived_at__isnull=True).order_by(
                "next_due"
            ).first()
        if not sched:
            return None
        return {
            "id": sched.id,
            "task": sched.task_name,
            "cadence": sched.cadence,
            "date": sched.next_due.strftime("%b %-d") if sched.next_due else None,
            "next_due": sched.next_due.isoformat() if sched.next_due else None,
            "urgency": sched.urgency,
        }


class EquipmentCategorySerializer(serializers.ModelSerializer):
    count = serializers.SerializerMethodField()

    class Meta:
        model = EquipmentCategory
        fields = ["id", "slug", "label", "emoji", "order", "count",
                  "archived_at", "created_at", "updated_at"]
        read_only_fields = ["id", "count", "archived_at", "created_at", "updated_at"]

    def get_count(self, obj):
        return obj.equipment_items.filter(archived_at__isnull=True).count()


# ============================================================================
# Phase 5: Food Safety
# ============================================================================

class FoodSafetyCompletionSerializer(serializers.ModelSerializer):
    completed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = FoodSafetyCompletion
        fields = ["id", "date", "completed_at", "completed_by", "completed_by_name"]
        read_only_fields = ["id", "completed_at", "completed_by_name"]

    def get_completed_by_name(self, obj):
        u = obj.completed_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None


class FoodSafetyTaskSerializer(serializers.ModelSerializer):
    today_completion = serializers.SerializerMethodField()

    class Meta:
        model = FoodSafetyTask
        fields = ["id", "daypart", "text", "order",
                  "today_completion", "archived_at",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "today_completion", "archived_at",
                            "created_at", "updated_at"]

    def get_today_completion(self, obj):
        prefetched = getattr(obj, "today_completion_list", None)
        if prefetched is not None:
            comp = prefetched[0] if prefetched else None
        else:
            from django.utils import timezone
            comp = obj.completions.filter(date=timezone.localdate()).first()
        return FoodSafetyCompletionSerializer(comp).data if comp else None


class TemperatureTargetSerializer(serializers.ModelSerializer):
    last_reading = serializers.SerializerMethodField()

    class Meta:
        model = TemperatureTarget
        fields = [
            "id", "kind", "name",
            "expected_min", "expected_max",
            "order", "last_reading",
            "archived_at", "created_at",
        ]
        read_only_fields = ["id", "last_reading", "archived_at", "created_at"]

    def get_last_reading(self, obj):
        r = obj.readings.order_by("-recorded_at").first()
        if not r:
            return None
        return {
            "id": r.id,
            "value": float(r.value),
            "unit": r.unit,
            "status": r.status,
            "recorded_at": r.recorded_at,
        }


class TemperatureReadingSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()
    target_name = serializers.CharField(source="target.name", read_only=True)
    target_kind = serializers.CharField(source="target.kind", read_only=True)
    expected_min = serializers.DecimalField(
        source="target.expected_min", max_digits=6, decimal_places=2, read_only=True
    )
    expected_max = serializers.DecimalField(
        source="target.expected_max", max_digits=6, decimal_places=2, read_only=True
    )

    class Meta:
        model = TemperatureReading
        fields = [
            "id", "target", "target_name", "target_kind",
            "expected_min", "expected_max",
            "value", "unit", "status",
            "recorded_at", "recorded_by", "recorded_by_name",
        ]
        read_only_fields = ["id", "target_name", "target_kind",
                            "expected_min", "expected_max", "status",
                            "recorded_at", "recorded_by", "recorded_by_name"]

    def get_recorded_by_name(self, obj):
        u = obj.recorded_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None


# ============================================================================
# Phase 6: Team Members (User roster view)
# ============================================================================

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "display_name", "description", "icon"]
        read_only_fields = ["id"]


class TeamMemberSerializer(serializers.ModelSerializer):
    """The Team Members page consumes a list of users with extra fields."""
    name = serializers.SerializerMethodField()
    initials = serializers.CharField(read_only=True)
    manager_name = serializers.SerializerMethodField()
    departments = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "name", "initials", "email", "phone",
            "role", "shift_preference",
            "is_admin", "is_active", "is_demo_user",
            "manager", "manager_name",
            "departments",
            "avatar",
        ]
        read_only_fields = ["id", "name", "initials", "manager_name", "departments"]

    def get_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.email

    def get_manager_name(self, obj):
        m = obj.manager
        if not m:
            return None
        return f"{m.first_name} {m.last_name}".strip() or m.email

    def get_departments(self, obj):
        return [
            {"id": d.id, "name": d.display_name or d.name, "slug": d.name}
            for d in obj.departments.all()
        ]


# ============================================================================
# Phase 6: Employee Documentation
# ============================================================================

class EmployeeRecordSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeRecord
        fields = [
            "id", "user", "user_name",
            "recorded_by", "recorded_by_name",
            "kind", "title", "body", "status",
            "recorded_at", "resolved_at",
        ]
        read_only_fields = ["id", "user_name", "recorded_by", "recorded_by_name",
                            "recorded_at"]

    def _name(self, u):
        if not u:
            return None
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_user_name(self, obj):
        return self._name(obj.user)

    def get_recorded_by_name(self, obj):
        return self._name(obj.recorded_by)


# ============================================================================
# Phase 6: Training
# ============================================================================

class TrainingPlanSerializer(serializers.ModelSerializer):
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = TrainingPlan
        fields = [
            "id", "name", "description",
            "department", "department_name",
            "total_steps", "archived_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "department_name", "archived_at",
                            "created_at", "updated_at"]

    def get_department_name(self, obj):
        return obj.department.display_name if obj.department else None


class TraineeAssignmentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initials = serializers.CharField(source="user.initials", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    progress_percent = serializers.IntegerField(read_only=True)
    department_name = serializers.SerializerMethodField()

    class Meta:
        model = TraineeAssignment
        fields = [
            "id",
            "user", "user_name", "user_initials",
            "plan", "plan_name",
            "assigned_by", "status",
            "completed_steps", "progress_percent",
            "department_name",
            "assigned_at", "completed_at",
        ]
        read_only_fields = ["id", "user_name", "user_initials",
                            "plan_name", "progress_percent", "department_name",
                            "assigned_at"]

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_department_name(self, obj):
        # Prefer the plan's department; otherwise the user's first department.
        if obj.plan and obj.plan.department:
            return obj.plan.department.display_name
        d = obj.user.departments.first()
        return d.display_name if d else None


class TrainingActivitySerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TrainingActivity
        fields = ["id", "assignment", "kind", "notes",
                  "recorded_by", "recorded_by_name", "recorded_at"]
        read_only_fields = ["id", "recorded_by", "recorded_by_name", "recorded_at"]

    def get_recorded_by_name(self, obj):
        u = obj.recorded_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None


# ============================================================================
# Phase 6: Quick Links
# ============================================================================

class QuickLinkCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = QuickLinkCategory
        fields = ["id", "name", "color", "order", "archived_at",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "archived_at", "created_at", "updated_at"]


class QuickLinkSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_color = serializers.CharField(source="category.color", read_only=True)

    class Meta:
        model = QuickLink
        fields = ["id", "label", "url", "icon", "order",
                  "category", "category_name", "category_color",
                  "archived_at", "created_at", "updated_at"]
        read_only_fields = ["id", "category_name", "category_color",
                            "archived_at", "created_at", "updated_at"]


# ============================================================================
# Phase 7: Leadership 360 + Team Development
# ============================================================================

class Evaluation360TemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluation360Template
        fields = ["id", "name", "description", "sections_count", "is_active",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class EvaluationEvaluatorSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initials = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationEvaluator
        fields = ["id", "evaluation", "user", "user_name", "user_initials",
                  "evaluator_type", "invited_at", "completed_at", "responses"]
        read_only_fields = ["id", "user_name", "user_initials", "invited_at"]

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_user_initials(self, obj):
        return obj.user.initials


class Evaluation360Serializer(serializers.ModelSerializer):
    evaluatee_name = serializers.SerializerMethodField()
    evaluatee_role = serializers.CharField(source="evaluatee.role", read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    evaluators = EvaluationEvaluatorSerializer(many=True, read_only=True)
    total_evaluators = serializers.SerializerMethodField()
    completed_evaluators = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation360
        fields = ["id", "evaluatee", "evaluatee_name", "evaluatee_role", "template", "template_name",
                  "status", "due_date", "progress_percent",
                  "evaluators", "total_evaluators", "completed_evaluators", "is_overdue",
                  "created_at", "completed_at"]
        read_only_fields = ["id", "evaluatee_name", "evaluatee_role", "template_name",
                            "evaluators", "total_evaluators", "completed_evaluators",
                            "is_overdue", "created_at"]

    def get_evaluatee_name(self, obj):
        u = obj.evaluatee
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_total_evaluators(self, obj):
        return obj.evaluators.count()

    def get_completed_evaluators(self, obj):
        return obj.evaluators.filter(completed_at__isnull=False).count()

    def get_is_overdue(self, obj):
        return bool(obj.due_date and obj.status != "completed" and obj.due_date < timezone.localdate())


class PositionTrackSerializer(serializers.ModelSerializer):
    slug = serializers.SerializerMethodField()

    class Meta:
        model = PositionTrack
        fields = ["id", "name", "slug", "description", "order",
                  "archived_at", "created_at", "updated_at"]
        read_only_fields = ["id", "slug", "archived_at", "created_at", "updated_at"]

    def get_slug(self, obj):
        return slugify(obj.name or "")


class TrackProgressSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_initials = serializers.CharField(source="user.initials", read_only=True)
    track_name = serializers.CharField(source="track.name", read_only=True)
    track_slug = serializers.SerializerMethodField()

    class Meta:
        model = TrackProgress
        fields = ["id", "user", "user_name", "user_initials", "track", "track_name", "track_slug",
                  "status", "completed_steps", "current_step", "updated_at"]
        read_only_fields = ["id", "user_name", "user_initials", "track_name", "track_slug", "updated_at"]

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.email

    def get_track_slug(self, obj):
        return slugify(obj.track.name or "")


class LeadershipAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadershipArea
        fields = ["id", "user", "area_key", "created_at"]
        read_only_fields = ["id", "created_at"]


class LeadershipNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadershipNote
        fields = ["id", "user", "text", "created_at"]
        read_only_fields = ["id", "created_at"]


# ============================================================================
# Phase 8: Calendar
# ============================================================================

class CalendarEventSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CalendarEvent
        fields = ["id", "title", "category", "starts_at", "ends_at", "all_day",
                  "notes", "created_by", "created_by_name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_by_name", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        u = obj.created_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None


# ============================================================================
# Phase 8: Guest Recovery
# ============================================================================

class GuestComplaintSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GuestComplaint
        fields = ["id", "guest_name", "guest_phone", "category", "description",
                  "status", "resolution", "assigned_to", "assigned_to_name",
                  "occurred_at", "resolved_at", "created_by", "created_by_name",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "assigned_to_name", "created_by_name",
                            "created_at", "updated_at"]

    def get_assigned_to_name(self, obj):
        u = obj.assigned_to
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None

    def get_created_by_name(self, obj):
        u = obj.created_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None


# ============================================================================
# Phase 8: Vendors
# ============================================================================

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "category", "contact_name", "phone", "email",
                  "website", "account_number", "notes", "tags",
                  "archived_at", "created_at", "updated_at"]
        read_only_fields = ["id", "archived_at", "created_at", "updated_at"]


# ============================================================================
# Phase 8: Team Chat
# ============================================================================

class ChatChannelSerializer(serializers.ModelSerializer):
    unread_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    last_message_at = serializers.SerializerMethodField()

    class Meta:
        model = ChatChannel
        fields = ["id", "name", "slug", "is_default", "unread_count", "member_count",
                  "last_message_preview", "last_message_at",
                  "created_at"]
        read_only_fields = ["id", "unread_count", "member_count",
                            "last_message_preview", "last_message_at", "created_at"]

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return 0
        membership = obj.memberships.filter(user=user).first()
        if not membership:
            return 0
        qs = obj.messages.exclude(author=user)
        if membership.last_read_at:
            qs = qs.filter(created_at__gt=membership.last_read_at)
        return qs.count()

    def get_member_count(self, obj):
        return obj.memberships.count()

    def _last_message(self, obj):
        cached = getattr(obj, "_last_message_cache", None)
        if cached is not None:
            return cached
        obj._last_message_cache = obj.messages.order_by("-created_at").first()
        return obj._last_message_cache

    def get_last_message_preview(self, obj):
        last = self._last_message(obj)
        if not last or not last.body:
            return ""
        body = " ".join(last.body.split())
        return f"{body[:77]}..." if len(body) > 80 else body

    def get_last_message_at(self, obj):
        last = self._last_message(obj)
        return last.created_at if last else None


class ChatMembershipSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ChatMembership
        fields = ["id", "channel", "user", "user_name", "joined_at", "last_read_at"]
        read_only_fields = ["id", "user_name", "joined_at"]

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


class ChatMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_initials = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = ["id", "channel", "author", "author_name", "author_initials",
                  "body", "created_at", "edited_at"]
        read_only_fields = ["id", "author", "author_name", "author_initials",
                            "created_at"]

    def get_author_name(self, obj):
        u = obj.author
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else "Unknown"

    def get_author_initials(self, obj):
        return obj.author.initials if obj.author else "?"


# ============================================================================
# Phase 8: Surveys
# ============================================================================

class SurveyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyQuestion
        fields = ["id", "survey", "text", "kind", "options", "order", "required"]
        read_only_fields = ["id"]


class SurveyAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source="question.text", read_only=True)

    class Meta:
        model = SurveyAnswer
        fields = ["id", "response", "question", "question_text", "value"]
        read_only_fields = ["id", "question_text"]


class SurveyResponseSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    answers = SurveyAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = SurveyResponse
        fields = ["id", "survey", "user", "user_name", "answers", "submitted_at"]
        read_only_fields = ["id", "user_name", "submitted_at"]

    def get_user_name(self, obj):
        u = obj.user
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else "Anonymous"


class SurveySerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()
    questions = SurveyQuestionSerializer(many=True, read_only=True)
    response_count = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = ["id", "title", "status", "opens_at", "closes_at", "is_anonymous",
                  "created_by", "created_by_name", "questions", "response_count",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_by", "created_by_name", "questions",
                            "response_count", "created_at", "updated_at"]

    def get_created_by_name(self, obj):
        u = obj.created_by
        return (f"{u.first_name} {u.last_name}".strip() or u.email) if u else None

    def get_response_count(self, obj):
        return obj.responses.count()


# ============================================================================
# Phase 9: Notifications
# ============================================================================

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "user", "notification_type", "title", "message",
                  "is_read", "action_url", "created_at"]
        read_only_fields = ["id", "user", "created_at"]
