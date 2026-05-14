"""
DRF serializers — the wire format for every API endpoint.

Convention: snake_case keys in JSON (Django default). Frontend normalizes
to camelCase at the App.js boundary (see frontend/src/App.js).
"""

from rest_framework import serializers

from .models import (
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
    KitchenChecklistCompletion,
    KitchenChecklistTask,
    LeadershipArea,
    LeadershipNote,
    MaintenanceLog,
    MaintenanceSchedule,
    MealPeriod,
    MenuItem,
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
    TemperatureReading,
    TemperatureTarget,
    TimeBlock,
    TrackProgress,
    TraineeAssignment,
    TrainingActivity,
    TrainingPlan,
    User,
    UserPreferences,
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
            "id", "label", "start_time", "end_time",
            "position", "positions_needed", "notes", "order",
        ]
        read_only_fields = ["id"]


class SetupSheetTemplateSerializer(serializers.ModelSerializer):
    """A reusable template. `time_blocks_count` is derived for the card UI."""
    time_blocks_count = serializers.IntegerField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SetupSheetTemplate
        fields = [
            "id", "name", "description",
            "time_blocks_count",
            "created_by", "created_by_name",
            "archived_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "time_blocks_count", "created_by_name",
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
        prefetched = getattr(obj, "today_completion_list", None)
        if prefetched is not None:
            comp = prefetched[0] if prefetched else None
        else:
            from django.utils import timezone
            comp = obj.completions.filter(date=timezone.localdate()).first()
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
    template_name = serializers.CharField(source="template.name", read_only=True)
    evaluators = EvaluationEvaluatorSerializer(many=True, read_only=True)

    class Meta:
        model = Evaluation360
        fields = ["id", "evaluatee", "evaluatee_name", "template", "template_name",
                  "status", "due_date", "progress_percent",
                  "evaluators", "created_at", "completed_at"]
        read_only_fields = ["id", "evaluatee_name", "template_name",
                            "evaluators", "created_at"]

    def get_evaluatee_name(self, obj):
        u = obj.evaluatee
        return f"{u.first_name} {u.last_name}".strip() or u.email


class PositionTrackSerializer(serializers.ModelSerializer):
    class Meta:
        model = PositionTrack
        fields = ["id", "name", "description", "order",
                  "archived_at", "created_at", "updated_at"]
        read_only_fields = ["id", "archived_at", "created_at", "updated_at"]


class TrackProgressSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    track_name = serializers.CharField(source="track.name", read_only=True)

    class Meta:
        model = TrackProgress
        fields = ["id", "user", "user_name", "track", "track_name",
                  "status", "completed_steps", "current_step", "updated_at"]
        read_only_fields = ["id", "user_name", "track_name", "updated_at"]

    def get_user_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.email


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
