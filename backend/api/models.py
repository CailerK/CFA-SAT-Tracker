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
    
    name = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50)  # Emoji or icon class
    created_at = models.DateTimeField(auto_now_add=True)

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
    template = models.ForeignKey(
        SetupSheetTemplate, on_delete=models.CASCADE,
        related_name='time_blocks', null=True, blank=True,
    )
    sheet = models.ForeignKey(
        SetupSheet, on_delete=models.CASCADE,
        related_name='time_blocks', null=True, blank=True,
    )
    label = models.CharField(max_length=100, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    position = models.CharField(max_length=100, blank=True)
    positions_needed = models.JSONField(
        default=list, blank=True,
        help_text="List of {role, count} pairs.",
    )
    notes = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']

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
