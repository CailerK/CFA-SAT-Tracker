"""
DRF serializers — the wire format for every API endpoint.

Convention: snake_case keys in JSON (Django default). Frontend normalizes
to camelCase at the App.js boundary (see frontend/src/App.js).
"""

from rest_framework import serializers

from .models import Store, StoreSettings, User, UserPreferences


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
