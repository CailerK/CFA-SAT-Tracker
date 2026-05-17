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


def is_admin_or_above(user) -> bool:
    """True if the user is a superuser or has the admin badge.

    Used to gate write-access to store-wide configuration like the Career
    Path editor — managers can VIEW the path but only admins can mutate it.
    Mirrors the frontend's `user?.isSuperuser || user?.isAdmin` check.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(getattr(user, "is_admin", False))


# ---------------------------------------------------------------------------
# Role hierarchy
# ---------------------------------------------------------------------------
# Higher rank = more authority. Used for "show me everyone below me"
# features like team-level dev-plan progress (managers see team_members,
# admins see everything below admin, superusers see everyone).
#
# A user can ONLY see subordinates whose rank is strictly less than theirs.
# Same-rank peers are NOT visible — that prevents managers from snooping
# on each other's team-member assignments.
ROLE_RANK = {
    "team_member": 0,
    "shift_lead": 1,
    "shift_leader": 1,  # legacy alias
    "manager": 2,
    "director": 3,
    "admin": 4,
}
SUPERUSER_RANK = 5


def role_rank(user) -> int:
    """Return the rank for the user's role (superusers rank highest)."""
    if not user:
        return -1
    if getattr(user, "is_superuser", False):
        return SUPERUSER_RANK
    return ROLE_RANK.get(getattr(user, "role", ""), 0)


def subordinate_roles(user) -> set:
    """All role strings strictly below `user`'s rank.

    Used to filter querysets like:
        User.objects.filter(role__in=subordinate_roles(request.user))
    Returns an empty set if the user has no subordinates (team_member, or
    unauthenticated). Superusers see every role below SUPERUSER_RANK.
    """
    rank = role_rank(user)
    return {role for role, r in ROLE_RANK.items() if r < rank}


def can_view_subordinates(user) -> bool:
    """True if the user has anyone below them. Team-members do not."""
    return bool(subordinate_roles(user))


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


class IsAdminOrAbove(BasePermission):
    """Allow only admins (is_admin=True) and superusers."""

    message = "This action requires admin-level access."

    def has_permission(self, request, view):
        return is_admin_or_above(request.user)


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


class CanManageUsers(BasePermission):
    """
    Permission for user management:
    - Superadmins: Can manage all users (view, create, edit, delete)
    - Admins (is_admin=True): Can view/edit all users, but cannot:
      * Delete or demote other admins/superusers
      * Change admin/superuser status
      * Delete themselves
    - Regular managers: No access to user management
    """

    message = "You don't have permission to manage users."

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        # Must be either superuser or have is_admin flag
        return user.is_superuser or user.is_admin

    def has_object_permission(self, request, view, obj):
        """Object-level permission for editing/deleting specific users."""
        user = request.user
        target_user = obj
        
        # Superusers can do anything
        if user.is_superuser:
            return True
        
        # Admins (non-superuser) have restrictions
        if user.is_admin:
            # Can't delete themselves
            if view.action == 'destroy' and target_user.pk == user.pk:
                return False
            
            # Can't modify other admins or superusers
            if target_user.is_superuser or (target_user.is_admin and target_user.pk != user.pk):
                if view.action in ['update', 'partial_update', 'destroy']:
                    return False
            
            return True
        
        return False
