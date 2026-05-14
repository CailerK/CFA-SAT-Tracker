from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


# =============================================================================
# Foundation: Store + StoreSettings
# =============================================================================
# Every operational record (task, sheet, vendor, chat message) belongs to one
# Store. Users belong to a Store. ViewSets filter by request.user.store so a
# user from store A can never see store B's data.

class Store(models.Model):
    """A single physical location (e.g., 'CFA I-410 & Rigsby #00727')."""
    name = models.CharField(max_length=200)
    store_number = models.CharField(max_length=10, unique=True)
    address = models.CharField(max_length=300, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    vision = models.TextField(blank=True)
    mission = models.TextField(blank=True)
    timezone_name = models.CharField(
        max_length=64,
        default="America/Chicago",
        help_text="IANA timezone identifier; used to render local dates.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} #{self.store_number}"


def _default_feature_flags():
    """Default feature toggles for a brand-new store."""
    return {
        "foh_tasks": True,
        "kitchen": True,
        "setups": True,
        "documentation": True,
        "evaluations": True,
        "leadership": True,
        "rewards": True,
        "safe_counting": True,
        "calendar": True,
        "team_chat": True,
        "guest_recovery": True,
        "vendors": True,
    }


def _default_access_toggles():
    return {
        "setup_view_leaders_only": False,
        "require_leader_review": False,
        "require_director_approval": False,
        "department_restriction": False,
        "team_member_completion": True,
    }


def _default_cleaning_settings():
    return {
        "enable_daily_tasks": True,
        "team_member_completion": True,
    }


class StoreSettings(models.Model):
    """Per-store toggles and configuration. 1:1 with Store."""
    store = models.OneToOneField(
        Store, on_delete=models.CASCADE, related_name="settings"
    )
    features = models.JSONField(default=_default_feature_flags)
    access = models.JSONField(default=_default_access_toggles)
    cleaning_settings = models.JSONField(default=_default_cleaning_settings)
    foh_require_initials = models.BooleanField(
        default=False,
        help_text="If true, FOH task completions require initials.",
    )
    waste_goal_daily = models.DecimalField(
        max_digits=10, decimal_places=2, default=100,
    )
    waste_goal_weekly = models.DecimalField(
        max_digits=10, decimal_places=2, default=600,
    )
    waste_goal_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, default=2500,
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Settings for {self.store.name}"


# =============================================================================
# Users
# =============================================================================
# User System - Based on captured LD Growth data
class User(AbstractUser):
    """Custom user model matching LD Growth structure"""
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # company_id is the legacy store identifier; we keep it for back-compat
    # but new code should read user.store.store_number instead.
    company_id = models.CharField(max_length=10, default='00727')
    # Phase 0: nullable so existing rows don't break; the data migration
    # backfills it, and new users get assigned a Store on creation.
    store = models.ForeignKey(
        Store,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="users",
    )
    phone = models.CharField(max_length=30, blank=True)
    role = models.CharField(max_length=50, default='team_member')
    # Phase 6: roster fields surfaced on the Team Members page.
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="direct_reports",
    )
    shift_preference = models.JSONField(
        default=dict,
        blank=True,
        help_text="Weekly availability schedule with days and hours",
    )
    is_admin = models.BooleanField(
        default=False,
        help_text="Shows the Admin badge on the roster. Separate from is_superuser.",
    )
    is_demo_user = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    @property
    def initials(self):
        """Two-character initials used in avatars across the UI."""
        f = (self.first_name or "").strip()
        l = (self.last_name or "").strip()
        if f and l:
            return (f[0] + l[0]).upper()
        if f:
            return f[:2].upper()
        return (self.email or "?")[:2].upper()

    @property
    def is_manager_or_above(self):
        """Used by IsManagerOrAbove permission class."""
        return (
            self.is_superuser
            or self.role in {"manager", "shift_lead", "shift_leader",
                             "director", "admin"}
        )


class UserProfile(models.Model):
    """Extended user profile data — kept for back-compat. New code should
    write to UserPreferences below instead of dashboard_customization."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    preferences = models.JSONField(default=dict)
    notification_settings = models.JSONField(default=dict)
    dashboard_customization = models.JSONField(default=dict)


def _default_notification_prefs():
    return {
        "eval_due": True,
        "task_reminder": True,
        "chat": True,
        "complaint": True,
        "email_digest": False,
    }


def _default_quick_action_ids():
    # Mirrors DEFAULT_ACTION_IDS in frontend/src/components/QuickActions.js
    return [
        "my-evaluations", "my-profile", "goals", "playbooks",
        "cfadollars", "safe-counting", "team-chat", "settings",
    ]


def _default_insight_ids():
    # Mirrors the four cards shown on the Dashboard's first render.
    return [
        "foh-tasks", "kitchen-checklist", "equipment-issues", "documentation",
    ]


class UserPreferences(models.Model):
    """Per-user UI preferences. 1:1 with User. Created on demand."""
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="preferences"
    )
    language = models.CharField(max_length=10, default="english")
    theme_color = models.CharField(max_length=7, default="#E51636")
    dark_mode = models.BooleanField(default=False)
    compact_mode = models.BooleanField(default=False)
    notifications = models.JSONField(default=_default_notification_prefs)
    quick_action_ids = models.JSONField(default=_default_quick_action_ids)
    insight_ids = models.JSONField(default=_default_insight_ids)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Preferences for {self.user.email}"

# Team System - Restaurant/Hospitality Structure
class Department(models.Model):
    """Restaurant departments (FOH, Kitchen, etc.)"""
    DEPARTMENT_CHOICES = [
        ('foh', 'Front of House'),
        ('kitchen', 'Kitchen'),
        ('management', 'Management'),
        ('facilities', 'Facilities'),
        ('catering', 'Catering'),
    ]

    # Phase 6: scope departments per-store. Nullable for back-compat.
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, null=True, blank=True,
        related_name="departments",
    )
    name = models.CharField(max_length=50)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Emoji or icon class
    members = models.ManyToManyField(
        User, blank=True, related_name="departments",
        help_text="Users assigned to this department.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.display_name or self.name

class Team(models.Model):
    """Team/Restaurant location"""
    name = models.CharField(max_length=100)
    company_id = models.CharField(max_length=10)  # e.g., "00727"
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class TeamMember(models.Model):
    """Team membership with roles"""
    ROLE_CHOICES = [
        ('team_member', 'Team Member'),
        ('shift_leader', 'Shift Leader'),
        ('manager', 'Manager'),
        ('director', 'Director'),
    ]
    
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    joined_at = models.DateTimeField(auto_now_add=True)

# Leadership Development System - Heart of Leadership
class LeadershipModule(models.Model):
    """Leadership development modules"""
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class LeadershipActivity(models.Model):
    """Individual activities within modules"""
    module = models.ForeignKey(LeadershipModule, on_delete=models.CASCADE, related_name='activities')
    title = models.CharField(max_length=200)
    activity_number = models.IntegerField()
    content = models.TextField()
    instructions = models.TextField()
    estimated_duration = models.IntegerField(help_text="Duration in minutes")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

class UserLeadershipProgress(models.Model):
    """Track user progress through leadership development"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    module = models.ForeignKey(LeadershipModule, on_delete=models.CASCADE)
    activity = models.ForeignKey(LeadershipActivity, on_delete=models.CASCADE, null=True, blank=True)
    progress_percentage = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

# Performance & Analytics System
class Evaluation(models.Model):
    """Performance evaluations"""
    EVALUATION_TYPES = [
        ('360', '360 Evaluation'),
        ('performance', 'Performance Review'),
        ('skill_assessment', 'Skill Assessment'),
    ]
    
    evaluatee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations_received')
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations_given')
    evaluation_type = models.CharField(max_length=50, choices=EVALUATION_TYPES)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    period_start = models.DateField()
    period_end = models.DateField()

class PerformanceMetric(models.Model):
    """Performance metrics for analytics"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=10, decimal_places=2)
    date_recorded = models.DateField()
    shift_type = models.CharField(max_length=20, choices=[('day', 'Day'), ('night', 'Night')])

# Task & Operations System
class TaskCategory(models.Model):
    """Task categories (FOH Tasks, Kitchen, Cleaning, etc.)"""
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    icon = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#E51636')  # LD Growth primary color

class Task(models.Model):
    """Daily tasks and checklists"""
    TASK_STATUS = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(TaskCategory, on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')])
    due_date = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Document Management System
class Document(models.Model):
    """Document library"""
    DOCUMENT_TYPES = [
        ('policy', 'Policy'),
        ('procedure', 'Procedure'),
        ('training', 'Training Material'),
        ('form', 'Form'),
        ('report', 'Report'),
    ]
    
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='documents/')
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Setup Sheets & Scheduling
class SetupSheet(models.Model):
    """A saved weekly setup sheet (one week's roster + time blocks).

    Phase 2 added: store, week_start/week_end, owner, is_shared,
    employees_count/areas_count/hours summary fields, source_template,
    status. Old fields (department, schedule_date, shift_type, is_template)
    are kept nullable for back-compat with any legacy rows.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=100)
    # Multi-tenant scoping (Phase 0 pattern). Nullable for old rows.
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE,
        related_name='setup_sheets',
        null=True, blank=True,
    )
    # Owner — separate from created_by because a sheet can be transferred.
    owner = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='owned_setup_sheets',
    )
    week_start = models.DateField(null=True, blank=True)
    week_end = models.DateField(null=True, blank=True)
    is_shared = models.BooleanField(default=False)
    employees_count = models.PositiveIntegerField(default=0)
    areas_count = models.PositiveIntegerField(default=0)
    hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    source_template = models.ForeignKey(
        'SetupSheetTemplate', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='derived_sheets',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='draft'
    )

    # Legacy fields — nullable so they don't block creation of new rows.
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
    )
    schedule_date = models.DateField(null=True, blank=True)
    shift_type = models.CharField(
        max_length=20,
        choices=[('opening', 'Opening'), ('closing', 'Closing'), ('mid', 'Mid')],
        blank=True,
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_setup_sheets',
    )
    is_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']
        indexes = [
            models.Index(fields=['store', 'status']),
            models.Index(fields=['store', 'week_start']),
        ]

    def __str__(self):
        return self.name


class SetupSheetTemplate(models.Model):
    """A reusable template that new SetupSheets can be cloned from."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE,
        related_name='setup_sheet_templates',
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_setup_templates',
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at', '-id']
        indexes = [models.Index(fields=['store'])]

    def __str__(self):
        return self.name

    @property
    def time_blocks_count(self):
        # Cheap denorm — count time blocks attached to this template.
        return self.time_blocks.count()


class TimeBlock(models.Model):
    """A row in a setup sheet or template — represents a position/area
    staffed during a specific time window.

    Belongs to EITHER a template OR a sheet (XOR — enforced in clean()).
    """
    DAY_CHOICES = [
        ('monday', 'Monday'),
        ('tuesday', 'Tuesday'),
        ('wednesday', 'Wednesday'),
        ('thursday', 'Thursday'),
        ('friday', 'Friday'),
        ('saturday', 'Saturday'),
        ('sunday', 'Sunday'),
    ]

    template = models.ForeignKey(
        SetupSheetTemplate, on_delete=models.CASCADE,
        related_name='time_blocks', null=True, blank=True,
    )
    sheet = models.ForeignKey(
        SetupSheet, on_delete=models.CASCADE,
        related_name='time_blocks', null=True, blank=True,
    )
    # Day-of-week for template blocks (sheets are per-week so usually blank).
    day_of_week = models.CharField(
        max_length=10, choices=DAY_CHOICES, blank=True,
    )
    label = models.CharField(max_length=100, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    position = models.CharField(max_length=100, blank=True)
    # Structured positions per department:
    #   {"front_counter": ["Spa", "Opening 1"],
    #    "drive_thru":   [...],
    #    "kitchen":      [...]}
    # The legacy [{role, count}] shape is still tolerated for back-compat.
    positions_needed = models.JSONField(
        default=dict, blank=True,
        help_text="Per-department position list (FC/DT/Kitchen).",
    )
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['day_of_week', 'order', 'id']

    def clean(self):
        from django.core.exceptions import ValidationError
        if bool(self.template_id) == bool(self.sheet_id):
            raise ValidationError(
                "A TimeBlock must belong to exactly one of template or sheet."
            )


class SetupSheetShare(models.Model):
    """Per-user sharing of a setup sheet."""
    PERMISSION_CHOICES = [
        ('view', 'View'),
        ('edit', 'Edit'),
    ]

    sheet = models.ForeignKey(
        SetupSheet, on_delete=models.CASCADE, related_name='shares'
    )
    shared_with = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='shared_setup_sheets'
    )
    permission = models.CharField(
        max_length=10, choices=PERMISSION_CHOICES, default='view'
    )
    shared_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='setup_sheets_shared_by_me',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['sheet', 'shared_with'],
                name='unique_share_per_user',
            ),
        ]


class SetupTask(models.Model):
    """Individual tasks within setup sheets (legacy model kept for back-compat)."""
    setup_sheet = models.ForeignKey(SetupSheet, on_delete=models.CASCADE, related_name='tasks')
    task_name = models.CharField(max_length=200)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    estimated_time = models.IntegerField(help_text="Time in minutes")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

# Notifications System
class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = [
        ('task_assigned', 'Task Assigned'),
        ('evaluation_due', 'Evaluation Due'),
        ('training_reminder', 'Training Reminder'),
        ('system_update', 'System Update'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    action_url = models.URLField(blank=True)


# =============================================================================
# Phase 1: FOH Daily Tasks
# =============================================================================
# Pattern: split into a TEMPLATE (the recurring definition; lives forever
# until archived) and a per-day COMPLETION (one row per template per date).
# This way we get a free history without ever mutating the template, and
# yesterday's completions don't carry over to today.

class FOHTaskTemplate(models.Model):
    """A recurring FOH task definition for a given shift."""
    SHIFT_CHOICES = [
        ('opening', 'Opening'),
        ('transition', 'Transition'),
        ('closing', 'Closing'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='foh_task_templates'
    )
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    text = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['shift', 'order', 'id']
        indexes = [
            models.Index(fields=['store', 'shift']),
        ]

    def __str__(self):
        return f"[{self.shift}] {self.text}"


class FOHTaskCompletion(models.Model):
    """One per (template, date). Records who finished the task and when."""
    template = models.ForeignKey(
        FOHTaskTemplate, on_delete=models.CASCADE, related_name='completions'
    )
    date = models.DateField(
        help_text="The shift date this completion applies to (local TZ)."
    )
    completed_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='foh_completions',
    )
    initials = models.CharField(max_length=4, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['template', 'date'],
                name='unique_foh_completion_per_day',
            ),
        ]
        indexes = [
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.template} on {self.date}"


# =============================================================================
# Phase 1: Shift Summary
# =============================================================================

class ShiftTag(models.Model):
    """Admin-configurable tags for the wins/challenges chips on a shift summary."""
    KIND_CHOICES = [
        ('win', 'Win'),
        ('challenge', 'Challenge'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='shift_tags'
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    label = models.CharField(max_length=100)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'kind', 'label'],
                name='unique_shift_tag_per_store',
            ),
        ]

    def __str__(self):
        return f"[{self.kind}] {self.label}"


class ShiftSummary(models.Model):
    """End-of-shift summary submitted by the shift lead."""
    SHIFT_TYPE_CHOICES = [
        ('opening', 'Opening'),
        ('mid', 'Mid'),
        ('closing', 'Closing'),
    ]
    SHIFT_STATUS_CHOICES = [
        ('normal', 'Normal'),
        ('busy', 'Busy'),
        ('slow', 'Slow'),
        ('incident', 'Incident'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='shift_summaries'
    )
    shift_lead = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='shift_summaries_led',
    )
    shift_date = models.DateField()
    shift_type = models.CharField(max_length=20, choices=SHIFT_TYPE_CHOICES)
    shift_status = models.CharField(
        max_length=20, choices=SHIFT_STATUS_CHOICES, default='normal'
    )
    rating = models.PositiveSmallIntegerField(
        default=3,
        help_text="1-5 star rating of the shift.",
    )

    recap = models.TextField(blank=True)
    sales_note = models.CharField(max_length=200, blank=True)
    labor_percent = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    sos_note = models.CharField(max_length=200, blank=True)
    handoff_note = models.TextField(blank=True)
    needs_follow_up = models.BooleanField(default=False)

    is_draft = models.BooleanField(default=True)
    tags = models.ManyToManyField(ShiftTag, blank=True, related_name='summaries')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-shift_date', '-id']
        indexes = [
            models.Index(fields=['store', 'shift_date']),
            models.Index(fields=['store', 'is_draft']),
        ]

    def __str__(self):
        return f"{self.shift_type} on {self.shift_date} by {self.shift_lead_id}"


# =============================================================================
# Phase 3: Cleaning & Maintenance
# =============================================================================
# One model covers FOH cleaning, kitchen cleaning, and maintenance tasks —
# disambiguated by `scope`. Completion is the same per-day pattern as FOH:
# the template lives forever (until archived), and each day gets its own
# CleaningCompletion row.

class CleaningTask(models.Model):
    SCOPE_CHOICES = [
        ('foh', 'Front of House'),
        ('kitchen', 'Kitchen'),
    ]
    FREQUENCY_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='cleaning_tasks'
    )
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='foh')
    name = models.CharField(max_length=200)
    frequency = models.CharField(
        max_length=20, choices=FREQUENCY_CHOICES, default='daily'
    )
    # For weekly frequency: list of weekday slugs ['mon','tue',...].
    days = models.JSONField(default=list, blank=True)
    supplies = models.JSONField(
        default=list, blank=True,
        help_text="List of supply names, e.g. ['Sanitizer', 'Microfiber'].",
    )
    links = models.JSONField(
        default=list, blank=True,
        help_text="List of {label, url} objects.",
    )
    estimated_minutes = models.PositiveIntegerField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scope', 'frequency', 'order', 'id']
        indexes = [
            models.Index(fields=['store', 'scope', 'frequency']),
        ]

    def __str__(self):
        return f"[{self.scope}/{self.frequency}] {self.name}"


class CleaningCompletion(models.Model):
    task = models.ForeignKey(
        CleaningTask, on_delete=models.CASCADE, related_name='completions'
    )
    date = models.DateField()
    completed_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cleaning_completions',
    )
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['task', 'date'],
                name='unique_cleaning_completion_per_day',
            ),
        ]
        indexes = [models.Index(fields=['date'])]

    def __str__(self):
        return f"{self.task} on {self.date}"


# =============================================================================
# Phase 4: Kitchen Checklists (mirror of FOH Tasks but kitchen-scoped)
# =============================================================================

class KitchenChecklistTask(models.Model):
    """A recurring kitchen checklist task for a given shift."""
    SHIFT_CHOICES = [
        ('opening', 'Opening'),
        ('transition', 'Transition'),
        ('closing', 'Closing'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='kitchen_checklist_tasks'
    )
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES)
    text = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['shift', 'order', 'id']
        indexes = [models.Index(fields=['store', 'shift'])]

    def __str__(self):
        return f"[kitchen/{self.shift}] {self.text}"


class KitchenChecklistCompletion(models.Model):
    template = models.ForeignKey(
        KitchenChecklistTask, on_delete=models.CASCADE,
        related_name='completions',
    )
    date = models.DateField()
    completed_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='kitchen_checklist_completions',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['template', 'date'],
                name='unique_kitchen_completion_per_day',
            ),
        ]
        indexes = [models.Index(fields=['date'])]


# =============================================================================
# Phase 4: Waste Tracker
# =============================================================================

class MealPeriod(models.Model):
    """Global catalog of meal periods — same for every store."""
    slug = models.CharField(max_length=20, unique=True)  # 'breakfast'|'lunch'|'dinner'
    label = models.CharField(max_length=40)
    emoji = models.CharField(max_length=10, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.label


class MenuItem(models.Model):
    """A menu item per store with a unit price for waste tracking."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='menu_items'
    )
    meal_period = models.ForeignKey(
        MealPeriod, on_delete=models.CASCADE, related_name='items'
    )
    name = models.CharField(max_length=100)
    emoji = models.CharField(max_length=10, blank=True)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['meal_period', 'order', 'name']
        indexes = [models.Index(fields=['store', 'meal_period'])]
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'meal_period', 'name'],
                name='unique_menu_item_per_meal',
            ),
        ]

    def __str__(self):
        return f"{self.name} (${self.unit_price})"


class WasteReason(models.Model):
    """Per-store catalog of waste reasons."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='waste_reasons'
    )
    slug = models.CharField(max_length=30)  # 'overproduction', 'quality', etc.
    label = models.CharField(max_length=60)
    emoji = models.CharField(max_length=10, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'slug'],
                name='unique_waste_reason_per_store',
            ),
        ]

    def __str__(self):
        return self.label


class WasteEntry(models.Model):
    """A single waste log entry."""
    UNIT_CHOICES = [
        ('pieces', 'Pieces'),
        ('portions', 'Portions'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='waste_entries'
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.PROTECT, related_name='waste_entries'
    )
    qty = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='pieces')
    # Snapshot the price at log time so historical totals don't drift if menu
    # prices later change.
    unit_price_at_time = models.DecimalField(
        max_digits=8, decimal_places=2, default=0
    )
    reason = models.ForeignKey(
        WasteReason, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='entries',
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='waste_entries_logged',
    )
    notes = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-recorded_at', '-id']
        indexes = [
            models.Index(fields=['store', 'recorded_at']),
            models.Index(fields=['store', 'menu_item']),
        ]

    @property
    def total_cost(self):
        return float(self.unit_price_at_time) * float(self.qty)

    def __str__(self):
        return f"{self.qty}x {self.menu_item.name} ({self.unit})"


# =============================================================================
# Phase 5: Kitchen Equipment
# =============================================================================

class EquipmentCategory(models.Model):
    """A category of kitchen equipment, e.g. 'cooking', 'refrigeration'."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='equipment_categories'
    )
    slug = models.CharField(max_length=30)  # 'hvac', 'cooking', etc.
    label = models.CharField(max_length=60)
    emoji = models.CharField(max_length=10, blank=True)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'slug'],
                name='unique_equipment_category_per_store',
            ),
        ]

    def __str__(self):
        return self.label


class Equipment(models.Model):
    """A single piece of kitchen equipment."""
    STATUS_CHOICES = [
        ('ok', 'OK'),
        ('needs_attention', 'Needs Attention'),
        ('down', 'Down'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='equipment'
    )
    category = models.ForeignKey(
        EquipmentCategory, on_delete=models.CASCADE,
        related_name='equipment_items',
    )
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=30, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ok')
    notes = models.TextField(blank=True)
    installed_at = models.DateField(null=True, blank=True)
    warranty_expires = models.DateField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']
        indexes = [models.Index(fields=['store', 'category'])]

    def __str__(self):
        return self.name


class MaintenanceSchedule(models.Model):
    """A recurring maintenance task for a piece of equipment."""
    CADENCE_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    ]

    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='schedules'
    )
    task_name = models.CharField(max_length=200)
    cadence = models.CharField(max_length=20, choices=CADENCE_CHOICES, default='weekly')
    next_due = models.DateField(null=True, blank=True)
    last_completed = models.DateField(null=True, blank=True)
    urgency_threshold_days = models.PositiveIntegerField(
        default=3,
        help_text="Days before next_due to flag as 'Soon'. Past due → 'Overdue'.",
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['next_due', 'id']

    @property
    def urgency(self):
        """Derived: 'Overdue' | 'Soon' | 'OK' | ''."""
        from datetime import date
        if not self.next_due:
            return ""
        today = date.today()
        if self.next_due < today:
            return "Overdue"
        if (self.next_due - today).days <= self.urgency_threshold_days:
            return "Soon"
        return "OK"

    def __str__(self):
        return f"{self.task_name} on {self.equipment.name}"


class MaintenanceLog(models.Model):
    """An event log entry for a piece of equipment: history / maint / clean / issue."""
    KIND_CHOICES = [
        ('history', 'History'),
        ('maintenance', 'Maintenance'),
        ('cleaning', 'Cleaning'),
        ('issue', 'Issue'),
    ]

    equipment = models.ForeignKey(
        Equipment, on_delete=models.CASCADE, related_name='logs'
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='equipment_logs',
    )
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-performed_at', '-id']


# =============================================================================
# Phase 5: Food Safety
# =============================================================================

class FoodSafetyTask(models.Model):
    """A recurring food-safety task, grouped by daypart."""
    DAYPART_CHOICES = [
        ('morning', 'Morning'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='food_safety_tasks'
    )
    daypart = models.CharField(max_length=20, choices=DAYPART_CHOICES)
    text = models.CharField(max_length=300)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['daypart', 'order', 'id']
        indexes = [models.Index(fields=['store', 'daypart'])]


class FoodSafetyCompletion(models.Model):
    template = models.ForeignKey(
        FoodSafetyTask, on_delete=models.CASCADE, related_name='completions'
    )
    date = models.DateField()
    completed_at = models.DateTimeField(auto_now_add=True)
    completed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='food_safety_completions',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['template', 'date'],
                name='unique_food_safety_completion_per_day',
            ),
        ]


class TemperatureTarget(models.Model):
    """A named slot you regularly take temperatures for, like 'Walk In Cooler'."""
    KIND_CHOICES = [
        ('equipment', 'Equipment'),
        ('product', 'Product'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='temperature_targets'
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    name = models.CharField(max_length=100)
    expected_min = models.DecimalField(
        max_digits=6, decimal_places=2,
        help_text="Acceptable lower bound in °F.",
    )
    expected_max = models.DecimalField(
        max_digits=6, decimal_places=2,
        help_text="Acceptable upper bound in °F.",
    )
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['kind', 'order', 'id']
        indexes = [models.Index(fields=['store', 'kind'])]

    def __str__(self):
        return f"{self.name} ({self.expected_min}°F - {self.expected_max}°F)"


class TemperatureReading(models.Model):
    """A single temperature reading against a target."""
    STATUS_CHOICES = [
        ('good', 'Good'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]

    target = models.ForeignKey(
        TemperatureTarget, on_delete=models.CASCADE, related_name='readings'
    )
    value = models.DecimalField(max_digits=6, decimal_places=2)
    unit = models.CharField(max_length=2, default='F')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='good')
    recorded_at = models.DateTimeField(auto_now_add=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='temperature_readings',
    )

    class Meta:
        ordering = ['-recorded_at', '-id']
        indexes = [models.Index(fields=['target', 'recorded_at'])]

    def save(self, *args, **kwargs):
        # Auto-classify status from expected range on save.
        try:
            v = float(self.value)
            lo = float(self.target.expected_min)
            hi = float(self.target.expected_max)
            if v < lo - 5 or v > hi + 5:
                self.status = 'critical'
            elif v < lo or v > hi:
                self.status = 'warning'
            else:
                self.status = 'good'
        except (TypeError, ValueError):
            pass
        super().save(*args, **kwargs)


# =============================================================================
# Phase 6: Team Documentation
# =============================================================================

class EmployeeRecord(models.Model):
    """A documentation record on an employee — discipline / PIP / admin notes."""
    KIND_CHOICES = [
        ('admin', 'Admin Note'),
        ('warning', 'Warning'),
        ('pip', 'PIP'),
        ('recognition', 'Recognition'),
    ]
    STATUS_CHOICES = [
        ('documented', 'Documented'),
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='employee_records'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='records'
    )
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='records_created',
    )
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='documented'
    )
    recorded_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-recorded_at', '-id']
        indexes = [
            models.Index(fields=['store', 'user']),
            models.Index(fields=['store', 'kind']),
        ]


# =============================================================================
# Phase 6: Training
# =============================================================================

class TrainingPlan(models.Model):
    """A reusable training program (e.g., 'Foundations FOH')."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='training_plans'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='training_plans',
    )
    total_steps = models.PositiveIntegerField(default=10)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class TraineeAssignment(models.Model):
    """A user actively going through a training plan."""
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='training_assignments'
    )
    plan = models.ForeignKey(
        TrainingPlan, on_delete=models.CASCADE, related_name='trainees'
    )
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='trainees_assigned',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='in_progress'
    )
    completed_steps = models.PositiveIntegerField(default=0)
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-assigned_at', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'plan'],
                name='unique_trainee_per_plan',
            ),
        ]

    @property
    def progress_percent(self):
        if not self.plan_id or not self.plan.total_steps:
            return 0
        return min(100, round((self.completed_steps / self.plan.total_steps) * 100))


class TrainingActivity(models.Model):
    """Event log entries per assignment (training milestone, note, etc.)."""
    assignment = models.ForeignKey(
        TraineeAssignment, on_delete=models.CASCADE, related_name='activities'
    )
    kind = models.CharField(max_length=30, default='note')
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='training_activities_logged',
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-recorded_at', '-id']


# =============================================================================
# Phase 6: Quick Links
# =============================================================================

class QuickLinkCategory(models.Model):
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='quick_link_categories'
    )
    name = models.CharField(max_length=80)
    color = models.CharField(max_length=7, default='#E51636')
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.name


class QuickLink(models.Model):
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='quick_links'
    )
    category = models.ForeignKey(
        QuickLinkCategory, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='links',
    )
    label = models.CharField(max_length=100)
    url = models.URLField()
    icon = models.CharField(max_length=30, blank=True)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.label


# =============================================================================
# Phase 7: Leadership 360 + Team Development
# =============================================================================

class Evaluation360Template(models.Model):
    """A reusable template for 360 evaluations with sections/questions."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='evaluation_360_templates'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    sections_count = models.PositiveIntegerField(
        default=0,
        help_text="Number of sections/question groups in this template.",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Evaluation360(models.Model):
    """A single 360 evaluation instance for an evaluatee."""
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='evaluations_360'
    )
    evaluatee = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='evaluations_360_received'
    )
    template = models.ForeignKey(
        Evaluation360Template, on_delete=models.PROTECT,
        related_name='evaluations',
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='in_progress'
    )
    due_date = models.DateField(null=True, blank=True)
    progress_percent = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['store', 'evaluatee']),
            models.Index(fields=['store', 'status']),
        ]

    def __str__(self):
        return f"360 for {self.evaluatee.get_full_name()} ({self.status})"


class EvaluationEvaluator(models.Model):
    """An evaluator assigned to a 360 evaluation (peer, manager, direct report)."""
    TYPE_CHOICES = [
        ('peer', 'Peer'),
        ('manager', 'Manager'),
        ('direct_report', 'Direct Report'),
    ]

    evaluation = models.ForeignKey(
        Evaluation360, on_delete=models.CASCADE, related_name='evaluators'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='evaluations_360_given'
    )
    evaluator_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    invited_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    responses = models.JSONField(
        default=dict, blank=True,
        help_text="Answers to the template's questions.",
    )

    class Meta:
        ordering = ['invited_at']
        constraints = [
            models.UniqueConstraint(
                fields=['evaluation', 'user'],
                name='unique_evaluator_per_evaluation',
            ),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.evaluator_type})"


class PositionTrack(models.Model):
    """Career progression track (team-member → trainer → zone-leader → shift-lead)."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='position_tracks'
    )
    name = models.CharField(
        max_length=60,
        help_text="e.g., 'team-member', 'trainer', 'zone-leader', 'shift-lead'",
    )
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']
        indexes = [models.Index(fields=['store'])]

    def __str__(self):
        return self.name


class TrackProgress(models.Model):
    """A user's progress through a position track."""
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='track_progress'
    )
    track = models.ForeignKey(
        PositionTrack, on_delete=models.CASCADE, related_name='user_progress'
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='not_started'
    )
    completed_steps = models.PositiveIntegerField(default=0)
    current_step = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['track__order', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'track'],
                name='unique_track_progress_per_user',
            ),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.track.name}"


class LeadershipArea(models.Model):
    """A user's selected leadership focus area (e.g., 'kitchen', 'drive-thru')."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='leadership_areas'
    )
    area_key = models.CharField(
        max_length=60,
        help_text="Slug identifier like 'kitchen', 'drive-thru', 'food-safety'.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'area_key'],
                name='unique_leadership_area_per_user',
            ),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.area_key}"


class LeadershipNote(models.Model):
    """Personal leadership development notes."""
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='leadership_notes'
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"Note by {self.user.get_full_name()}: {preview}"


# =============================================================================
# Phase 8: Calendar
# =============================================================================

class CalendarEvent(models.Model):
    """Store calendar events (tasks, announcements, deadlines, etc.)."""
    CATEGORY_CHOICES = [
        ('weekly_task', 'Weekly Task'),
        ('out_of_school', 'Out of School'),
        ('store_event', 'Store Event'),
        ('local_event', 'Local Event'),
        ('announcement', 'Announcement'),
        ('deadline', 'Deadline'),
        ('other', 'Other'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='calendar_events'
    )
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    all_day = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='calendar_events_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['starts_at', '-id']
        indexes = [
            models.Index(fields=['store', 'starts_at']),
            models.Index(fields=['store', 'category']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


# =============================================================================
# Phase 8: Guest Recovery
# =============================================================================

class GuestComplaint(models.Model):
    """Guest complaint tracking for recovery and follow-up."""
    CATEGORY_CHOICES = [
        ('order_error', 'Order Error'),
        ('service', 'Service'),
        ('food_quality', 'Food Quality'),
        ('wait_time', 'Wait Time'),
        ('cleanliness', 'Cleanliness'),
        ('staff_behavior', 'Staff Behavior'),
        ('app_rewards', 'App/Rewards'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='guest_complaints'
    )
    guest_name = models.CharField(max_length=100)
    guest_phone = models.CharField(max_length=20, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolution = models.TextField(blank=True)
    assigned_to = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_complaints',
    )
    occurred_at = models.DateTimeField()
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='complaints_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-occurred_at', '-id']
        indexes = [
            models.Index(fields=['store', 'status']),
            models.Index(fields=['store', 'occurred_at']),
        ]

    def __str__(self):
        return f"{self.guest_name} - {self.get_category_display()} ({self.status})"


# =============================================================================
# Phase 8: Vendors
# =============================================================================

class Vendor(models.Model):
    """Vendor directory with contact info and categorization."""
    CATEGORY_CHOICES = [
        ('food_beverage', 'Food & Beverage'),
        ('supplies', 'Supplies'),
        ('equipment', 'Equipment'),
        ('cleaning', 'Cleaning'),
        ('uniforms', 'Uniforms'),
        ('marketing', 'Marketing'),
        ('other', 'Other'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='vendors'
    )
    name = models.CharField(max_length=150)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    contact_name = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    account_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(
        default=list, blank=True,
        help_text="List of tags like ['Primary', 'Weekly Delivery', 'Auto-Ship']",
    )
    archived_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['store', 'category']),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


# =============================================================================
# Phase 8: Team Chat
# =============================================================================

class ChatChannel(models.Model):
    """Team chat channels (general, operations, kitchen, foh)."""
    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='chat_channels'
    )
    name = models.CharField(max_length=80)
    slug = models.CharField(
        max_length=30,
        help_text="URL-friendly identifier like 'general', 'operations', 'kitchen', 'foh'",
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['store', 'slug'],
                name='unique_channel_slug_per_store',
            ),
        ]

    def __str__(self):
        return f"#{self.name}"


class ChatMembership(models.Model):
    """User membership in a chat channel."""
    channel = models.ForeignKey(
        ChatChannel, on_delete=models.CASCADE, related_name='memberships'
    )
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='chat_memberships'
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['joined_at']
        constraints = [
            models.UniqueConstraint(
                fields=['channel', 'user'],
                name='unique_membership_per_channel',
            ),
        ]

    def __str__(self):
        return f"{self.user.get_full_name()} in #{self.channel.name}"


class ChatMessage(models.Model):
    """A single message in a chat channel."""
    channel = models.ForeignKey(
        ChatChannel, on_delete=models.CASCADE, related_name='messages'
    )
    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='chat_messages',
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at', 'id']
        indexes = [
            models.Index(fields=['channel', 'created_at']),
        ]

    def __str__(self):
        author_name = self.author.get_full_name() if self.author else "Unknown"
        preview = self.body[:50] + "..." if len(self.body) > 50 else self.body
        return f"{author_name}: {preview}"


# =============================================================================
# Phase 8: Surveys
# =============================================================================

class Survey(models.Model):
    """Anonymous or identified surveys for team feedback."""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('closed', 'Closed'),
        ('archived', 'Archived'),
    ]

    store = models.ForeignKey(
        Store, on_delete=models.CASCADE, related_name='surveys'
    )
    title = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    opens_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    is_anonymous = models.BooleanField(
        default=True,
        help_text="If True, responses are not linked to users.",
    )
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='surveys_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [
            models.Index(fields=['store', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"


class SurveyQuestion(models.Model):
    """A question within a survey."""
    KIND_CHOICES = [
        ('text', 'Text'),
        ('rating', 'Rating'),
        ('multiple_choice', 'Multiple Choice'),
        ('yes_no', 'Yes/No'),
    ]

    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name='questions'
    )
    text = models.TextField()
    kind = models.CharField(max_length=20, choices=KIND_CHOICES)
    options = models.JSONField(
        default=list, blank=True,
        help_text="For multiple_choice: list of option strings.",
    )
    order = models.PositiveIntegerField(default=0)
    required = models.BooleanField(default=False)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"Q{self.order}: {self.text[:50]}"


class SurveyResponse(models.Model):
    """A single user's response to a survey."""
    survey = models.ForeignKey(
        Survey, on_delete=models.CASCADE, related_name='responses'
    )
    user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='survey_responses',
        help_text="Null if survey is anonymous.",
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at', '-id']

    def __str__(self):
        user_str = self.user.get_full_name() if self.user else "Anonymous"
        return f"{user_str} - {self.survey.title}"


class SurveyAnswer(models.Model):
    """A single answer to a survey question."""
    response = models.ForeignKey(
        SurveyResponse, on_delete=models.CASCADE, related_name='answers'
    )
    question = models.ForeignKey(
        SurveyQuestion, on_delete=models.CASCADE, related_name='answers'
    )
    value = models.JSONField(
        help_text="Answer value: string for text, int for rating, string for choice, bool for yes/no.",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['response', 'question'],
                name='unique_answer_per_question',
            ),
        ]

    def __str__(self):
        return f"Answer to {self.question.text[:30]}"
