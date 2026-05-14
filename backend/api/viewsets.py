"""
Reusable ViewSet base classes.

The core abstraction is StoreScopedViewSet — every per-store resource
(tasks, sheets, equipment, vendors, etc.) inherits from this so we get
multi-tenancy correctly in one place.
"""

from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied


class StoreScopedViewSet(viewsets.ModelViewSet):
    """ModelViewSet that filters queryset by the requesting user's store
    and auto-sets the store on create.

    Subclass requirements:
      - queryset / get_queryset() returns rows for ALL stores by default.
      - The model has a `store` ForeignKey field (or a property of that name).
      - Optionally override `store_field_name` if your model uses a different
        attribute (e.g., 'location' instead of 'store').
    """

    store_field_name = "store"

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not user or not user.is_authenticated:
            return qs.none()
        # All users (including superusers) are scoped to their assigned store.
        # Django admin panel still works for cross-store access.
        store_id = getattr(user, "store_id", None)
        if store_id is None:
            # User isn't linked to a store yet — they see nothing in the API,
            # not even their own creations. Backend should backfill this in
            # the deploy seeder.
            return qs.none()
        return qs.filter(**{self.store_field_name: store_id})

    def perform_create(self, serializer):
        """Stamp the new row with the requesting user's store automatically.

        Frontend doesn't need to (and shouldn't) include `store` in the
        payload — we always trust the session over client-sent values.
        """
        user = self.request.user
        store = getattr(user, "store", None)
        if store is None:
            raise PermissionDenied(
                "You must be assigned to a store before creating records."
            )
        serializer.save(**{self.store_field_name: store})
