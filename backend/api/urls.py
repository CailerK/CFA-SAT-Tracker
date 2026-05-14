from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views, views_stores
from .views_foh import FOHTaskTemplateViewSet
from .views_shift_summary import ShiftSummaryViewSet, ShiftTagViewSet


# DRF router gives us list / detail / retrieve / @action routes for free.
router = DefaultRouter()
router.register(r"foh/tasks", FOHTaskTemplateViewSet, basename="foh-task")
router.register(
    r"shift-summaries/tags", ShiftTagViewSet, basename="shift-tag"
)
router.register(
    r"shift-summaries", ShiftSummaryViewSet, basename="shift-summary"
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

    # Phase 1: FOH tasks + shift summary (router-managed)
    path("", include(router.urls)),
]
