from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views, views_stores
from .views_cleaning import CleaningTaskViewSet
from .views_user_management import UserManagementViewSet
from .views_equipment import (
    EquipmentCategoryViewSet,
    EquipmentViewSet,
    FoodSafetyTaskViewSet,
    MaintenanceScheduleViewSet,
    TemperatureReadingViewSet,
    TemperatureTargetViewSet,
)
from .views_foh import FOHTaskTemplateViewSet
from .views_kitchen import (
    KitchenChecklistViewSet,
    MenuItemViewSet,
    WasteEntryViewSet,
    WasteReasonViewSet,
    kitchen_summary,
    meal_periods_list,
    waste_goals,
    waste_kpis,
    waste_top_items,
    waste_trend,
)
from .views_leadership import (
    Evaluation360TemplateViewSet,
    Evaluation360ViewSet,
    LeadershipAreaViewSet,
    LeadershipNoteViewSet,
    PositionTrackViewSet,
    TrackProgressViewSet,
)
from .views_phase8 import (
    CalendarEventViewSet,
    ChatChannelViewSet,
    ChatMessageViewSet,
    GuestComplaintViewSet,
    SurveyViewSet,
    VendorViewSet,
)
from .views_phase9 import (
    NotificationViewSet,
    dashboard_insights_catalog,
    dashboard_insights_values,
    weekly_digest,
)
from .views_setup_sheets import SetupSheetTemplateViewSet, SetupSheetViewSet
from .views_shift_summary import ShiftSummaryViewSet, ShiftTagViewSet
from .views_team import (
    EmployeeRecordViewSet,
    QuickLinkCategoryViewSet,
    QuickLinkViewSet,
    TeamMemberViewSet,
    TraineeAssignmentViewSet,
    TrainingPlanViewSet,
    documentation_employees,
    documentation_stats,
    employee_records,
    team_stats,
    training_progress_by_department,
    training_stats,
)


# DRF router gives us list / detail / retrieve / @action routes for free.
router = DefaultRouter()
router.register(r"foh/tasks", FOHTaskTemplateViewSet, basename="foh-task")
router.register(r"cleaning/tasks", CleaningTaskViewSet, basename="cleaning-task")
router.register(
    r"kitchen/checklists", KitchenChecklistViewSet, basename="kitchen-checklist"
)
router.register(
    r"kitchen/waste/menu-items", MenuItemViewSet, basename="waste-menu-item"
)
router.register(
    r"kitchen/waste/reasons", WasteReasonViewSet, basename="waste-reason"
)
router.register(
    r"kitchen/waste/entries", WasteEntryViewSet, basename="waste-entry"
)
# Phase 5: Equipment + Food Safety
router.register(
    r"kitchen/equipment/categories",
    EquipmentCategoryViewSet, basename="equipment-category",
)
router.register(
    r"kitchen/equipment", EquipmentViewSet, basename="equipment"
)
router.register(
    r"kitchen/food-safety/tasks",
    FoodSafetyTaskViewSet, basename="food-safety-task",
)
router.register(
    r"kitchen/food-safety/temperature-targets",
    TemperatureTargetViewSet, basename="temp-target",
)
router.register(
    r"kitchen/food-safety/temperature-readings",
    TemperatureReadingViewSet, basename="temp-reading",
)
# Phase 6: Team domain
router.register(r"team/members", TeamMemberViewSet, basename="team-member")
router.register(
    r"team/documentation/records",
    EmployeeRecordViewSet, basename="employee-record",
)
router.register(
    r"team/quick-links/categories",
    QuickLinkCategoryViewSet, basename="quick-link-category",
)
router.register(r"team/quick-links", QuickLinkViewSet, basename="quick-link")
router.register(r"training/plans", TrainingPlanViewSet, basename="training-plan")
router.register(
    r"training/trainees", TraineeAssignmentViewSet, basename="trainee",
)
router.register(
    r"shift-summaries/tags", ShiftTagViewSet, basename="shift-tag"
)
router.register(
    r"shift-summaries", ShiftSummaryViewSet, basename="shift-summary"
)
# Setup Sheets — templates first so /setup-sheets/templates/ doesn't collide
# with /setup-sheets/:pk/.
router.register(
    r"setup-sheets/templates",
    SetupSheetTemplateViewSet,
    basename="setup-sheet-template",
)
router.register(
    r"setup-sheets", SetupSheetViewSet, basename="setup-sheet"
)
# Phase 7: Leadership 360 + Team Development
router.register(
    r"leadership/360/templates",
    Evaluation360TemplateViewSet,
    basename="evaluation-360-template",
)
router.register(
    r"leadership/360",
    Evaluation360ViewSet,
    basename="evaluation-360",
)
router.register(
    r"team-development/tracks",
    PositionTrackViewSet,
    basename="position-track",
)
router.register(
    r"team-development/progress",
    TrackProgressViewSet,
    basename="track-progress",
)
router.register(
    r"leadership/areas",
    LeadershipAreaViewSet,
    basename="leadership-area",
)
router.register(
    r"leadership/notes",
    LeadershipNoteViewSet,
    basename="leadership-note",
)
# Phase 8: Calendar, Guest Recovery, Vendors, Team Chat, Surveys
router.register(
    r"calendar",
    CalendarEventViewSet,
    basename="calendar-event",
)
router.register(
    r"guest-complaints",
    GuestComplaintViewSet,
    basename="guest-complaint",
)
router.register(
    r"vendors",
    VendorViewSet,
    basename="vendor",
)
router.register(
    r"chat/channels",
    ChatChannelViewSet,
    basename="chat-channel",
)
router.register(
    r"chat/messages",
    ChatMessageViewSet,
    basename="chat-message",
)
router.register(
    r"surveys",
    SurveyViewSet,
    basename="survey",
)
# Phase 9: Notifications
router.register(
    r"notifications",
    NotificationViewSet,
    basename="notification",
)
# User Management (Admin/Superadmin only)
router.register(
    r"users",
    UserManagementViewSet,
    basename="user-management",
)


urlpatterns = [
    # Health / status (public)
    path("hello/", views.hello_world, name="hello_world"),
    path("status/", views.api_status, name="api_status"),

    # Auth
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.current_user, name="current_user"),
    path("auth/forgot-password/", views.forgot_password, name="forgot_password"),
    path("auth/reset-password/", views.reset_password, name="reset_password"),

    # Foundation: store + per-user preferences (Phase 0)
    path("stores/me/", views_stores.store_me, name="store_me"),
    path(
        "stores/me/settings/",
        views_stores.store_settings_me,
        name="store_settings_me",
    ),
    path(
        "users/me/preferences/",
        views_stores.user_preferences_me,
        name="user_preferences_me",
    ),

    # Phase 5: Maintenance schedule completion (standalone action)
    path(
        "kitchen/equipment/schedules/<int:pk>/complete/",
        MaintenanceScheduleViewSet.as_view({"post": "complete"}),
        name="schedule_complete",
    ),

    # Phase 6: Team stats + per-employee documentation
    path("team/stats/", team_stats, name="team_stats"),
    path(
        "team/documentation/stats/",
        documentation_stats, name="documentation_stats",
    ),
    path(
        "team/documentation/employees/",
        documentation_employees, name="documentation_employees",
    ),
    path(
        "team/documentation/employees/<int:user_id>/records/",
        employee_records, name="employee_records",
    ),
    # Phase 6: Training rollups
    path("training/stats/", training_stats, name="training_stats"),
    path(
        "training/progress-by-department/",
        training_progress_by_department,
        name="training_progress_by_department",
    ),

    # Phase 4: Kitchen dashboard + waste KPIs/trend/top-items/goals (function views)
    path("kitchen/summary/", kitchen_summary, name="kitchen_summary"),
    path("kitchen/meal-periods/", meal_periods_list, name="meal_periods_list"),
    path("kitchen/waste/kpis/", waste_kpis, name="waste_kpis"),
    path("kitchen/waste/trend/", waste_trend, name="waste_trend"),
    path("kitchen/waste/top-items/", waste_top_items, name="waste_top_items"),
    path("kitchen/waste/goals/", waste_goals, name="waste_goals"),

    # Phase 9: Dashboard insights + weekly digest
    path("dashboard/insights/catalog/", dashboard_insights_catalog, name="dashboard_insights_catalog"),
    path("dashboard/insights/values/", dashboard_insights_values, name="dashboard_insights_values"),
    path("weekly-digest/", weekly_digest, name="weekly_digest"),

    # Router-managed (Phase 1-8 viewsets)
    path("", include(router.urls)),
]
