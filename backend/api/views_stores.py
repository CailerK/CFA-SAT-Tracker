"""
Endpoints for the current user's Store and personal Preferences.

Routes:
  GET    /api/stores/me/             current store + nested settings
  PATCH  /api/stores/me/             update store info  (manager+)
  GET    /api/stores/me/settings/    just the settings sub-object
  PATCH  /api/stores/me/settings/    update settings    (manager+)
  GET    /api/users/me/preferences/  per-user UI preferences
  PATCH  /api/users/me/preferences/  update preferences (the user themselves)
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import StoreSettings, UserPreferences
from .permissions import is_manager_or_above
from .serializers import (
    StoreSerializer,
    StoreSettingsSerializer,
    UserPreferencesSerializer,
)


def _current_store_or_404(request):
    """Return the user's store, or a 404 Response if they don't have one."""
    store = getattr(request.user, "store", None)
    if store is None:
        return None, Response(
            {"error": "You are not assigned to a store."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return store, None


# ---------- Store ----------


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def store_me(request):
    """GET: anyone in the store can read. PATCH: managers only."""
    store, err = _current_store_or_404(request)
    if err:
        return err

    if request.method == "GET":
        return Response(StoreSerializer(store).data)

    # PATCH
    if not is_manager_or_above(request.user):
        return Response(
            {"error": "Only managers can update store info."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = StoreSerializer(store, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------- Store Settings ----------


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def store_settings_me(request):
    """GET: anyone in the store can read settings. PATCH: managers only."""
    store, err = _current_store_or_404(request)
    if err:
        return err

    # Lazily create settings if missing (defensive — the data migration
    # should have created them already).
    settings_obj, _ = StoreSettings.objects.get_or_create(store=store)

    if request.method == "GET":
        return Response(StoreSettingsSerializer(settings_obj).data)

    if not is_manager_or_above(request.user):
        return Response(
            {"error": "Only managers can update store settings."},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = StoreSettingsSerializer(
        settings_obj, data=request.data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


# ---------- User Preferences ----------


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def user_preferences_me(request):
    """A user's own UI preferences. Auto-created on first read."""
    prefs, _ = UserPreferences.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response(UserPreferencesSerializer(prefs).data)

    serializer = UserPreferencesSerializer(
        prefs, data=request.data, partial=True
    )
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
