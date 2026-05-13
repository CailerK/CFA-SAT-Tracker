"""
Custom DRF permission classes.

DRF's default permission for our app is IsAuthenticated. These classes layer
on top of that to gate write operations to managers/admins.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


# Roles that are considered "manager or above" for write access. Keep this
# list aligned with the role values your seed/admin uses.
MANAGER_ROLES = {"manager", "shift_lead", "shift_leader", "director", "admin"}


def is_manager_or_above(user) -> bool:
    """True if the user has a management-tier role or is a superuser."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return getattr(user, "role", "") in MANAGER_ROLES


class IsManagerOrAbove(BasePermission):
    """Allow only authenticated managers/directors/admins (or superusers)."""

    message = "This action requires manager-level access."

    def has_permission(self, request, view):
        return is_manager_or_above(request.user)


class ReadAllWriteManager(BasePermission):
    """Any authenticated user can read; only manager+ can write.

    The most common pattern: every store member can SEE the team roster,
    cleaning schedule, equipment list, etc., but only managers can change them.
    """

    message = "Only managers can modify this resource."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return is_manager_or_above(request.user)


class IsAdmin(BasePermission):
    """Superusers only. Use for destructive admin-panel-only operations."""

    message = "Admin privileges required."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)


class IsSelfOrManager(BasePermission):
    """Object-level: a user can edit themselves, manager+ can edit anyone."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_manager_or_above(request.user):
            return True
        # The object is the user themselves, or has a `user` attribute that is.
        target = getattr(obj, "user", obj)
        return getattr(target, "pk", None) == request.user.pk
