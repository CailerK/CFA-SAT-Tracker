"""
User Management ViewSet for in-app user administration.

Superadmins can:
- View all users (across all stores if needed, but typically scoped to their store)
- Create new users
- Edit any user
- Delete any user
- Change admin/superuser status

Admins (is_admin=True) can:
- View all users in their store
- Create new users in their store
- Edit regular users (not other admins/superusers)
- Delete regular users (not admins/superusers)
- Cannot change admin/superuser status
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q

from .models import User, Store
from .serializers import (
    UserManagementListSerializer,
    UserManagementDetailSerializer,
)
from .permissions import CanManageUsers


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users in the application.
    
    Permissions:
    - Superusers: Full access to all users
    - Admins: Can manage users in their store (with restrictions)
    - Regular users: No access
    """
    permission_classes = [IsAuthenticated, CanManageUsers]
    
    def get_queryset(self):
        """
        Return users based on the requesting user's permissions.
        
        Superusers: See all users (including other superusers)
        Admins: See all users in their store EXCEPT superusers
        """
        user = self.request.user
        
        # Base queryset - all users
        qs = User.objects.select_related('store').order_by('-created_at')
        
        # Superusers can see everyone, but we still scope to their store
        if user.is_superuser:
            # For now, scope to their store
            if user.store_id:
                return qs.filter(store_id=user.store_id)
            return qs
        
        # Admins see only users in their store, but NOT superusers
        if user.is_admin and user.store_id:
            return qs.filter(store_id=user.store_id).exclude(is_superuser=True)
        
        # Shouldn't reach here due to permission class, but just in case
        return qs.none()
    
    def get_serializer_class(self):
        """Use different serializers for list vs detail operations."""
        if self.action == 'list':
            return UserManagementListSerializer
        return UserManagementDetailSerializer
    
    def perform_create(self, serializer):
        """
        Create a new user, automatically assigning them to the creator's store.
        """
        user = self.request.user
        
        # Assign to the same store as the creator
        if user.store:
            serializer.save(store=user.store)
        else:
            serializer.save()
    
    def perform_destroy(self, instance):
        """
        Delete a user with additional validation.
        """
        user = self.request.user
        
        # Prevent self-deletion
        if instance.pk == user.pk:
            raise PermissionDenied("You cannot delete your own account.")
        
        # Non-superusers cannot delete admins or superusers
        if not user.is_superuser:
            if instance.is_superuser or instance.is_admin:
                raise PermissionDenied(
                    "You don't have permission to delete admin users."
                )
        
        instance.delete()
    
    @action(detail=False, methods=['get'])
    def stores(self, request):
        """
        Return available stores for user assignment.
        Superusers see all stores, admins see only their store.
        """
        user = request.user
        
        if user.is_superuser:
            stores = Store.objects.all().order_by('name')
        elif user.store:
            stores = Store.objects.filter(pk=user.store.pk)
        else:
            stores = Store.objects.none()
        
        data = [
            {
                'id': store.id,
                'name': store.name,
                'store_number': store.store_number,
            }
            for store in stores
        ]
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    def roles(self, request):
        """
        Return available roles for user assignment.
        """
        roles = [
            {'value': 'team_member', 'label': 'Team Member'},
            {'value': 'shift_lead', 'label': 'Shift Lead'},
            {'value': 'shift_leader', 'label': 'Shift Leader'},
            {'value': 'manager', 'label': 'Manager'},
            {'value': 'director', 'label': 'Director'},
        ]
        
        return Response(roles)
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """
        Reset a user's password to a temporary password.
        Only superusers and admins can do this.
        """
        user = self.get_object()
        
        # Generate a temporary password
        temp_password = User.objects.make_random_password(length=12)
        user.set_password(temp_password)
        user.save()
        
        return Response({
            'message': 'Password reset successfully',
            'temporary_password': temp_password,
            'note': 'Please share this password securely with the user.'
        })
