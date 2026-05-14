from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views, views_stores
from .views_cleaning import CleaningTaskViewSet
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
from .views_setup_sheets import SetupSheetTemplateViewSet, SetupSheetViewSet
from .views_shift_summary import ShiftSummaryViewSet, ShiftTagViewSet


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

    # Phase 4: Kitchen dashboard + waste KPIs/trend/top-items/goals (function views)
    path("kitchen/summary/", kitchen_summary, name="kitchen_summary"),
    path("kitchen/meal-periods/", meal_periods_list, name="meal_periods_list"),
    path("kitchen/waste/kpis/", waste_kpis, name="waste_kpis"),
    path("kitchen/waste/trend/", waste_trend, name="waste_trend"),
    path("kitchen/waste/top-items/", waste_top_items, name="waste_top_items"),
    path("kitchen/waste/goals/", waste_goals, name="waste_goals"),

    # Router-managed (Phase 1-4 viewsets)
    path("", include(router.urls)),
]
