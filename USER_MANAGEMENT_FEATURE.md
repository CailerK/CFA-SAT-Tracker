# User Management Feature

## Overview

Added in-app user management interface for superadmins and admins to create, edit, and manage users directly within the application settings.

## Access Levels

### Superusers (is_superuser=True)
- ✅ View all users in their store
- ✅ Create new users
- ✅ Edit any user (including other admins)
- ✅ Delete any user (except themselves)
- ✅ Change admin/superuser status
- ✅ Reset passwords
- ✅ Assign users to stores (if multiple stores exist)

### Admins (is_admin=True, is_superuser=False)
- ✅ View all users in their store
- ✅ Create new users in their store
- ✅ Edit regular users (team members, shift leads, managers)
- ✅ Delete regular users (not admins or superusers)
- ❌ Cannot edit other admins or superusers
- ❌ Cannot delete admins or superusers
- ❌ Cannot change admin/superuser status
- ❌ Cannot delete themselves
- ✅ Reset passwords for users they can edit

### Regular Users
- ❌ No access to user management

## Backend Implementation

### API Endpoints

**Base URL:** `/api/users/`

- `GET /api/users/` - List all users (scoped to store)
- `POST /api/users/` - Create a new user
- `GET /api/users/{id}/` - Get user details
- `PUT /api/users/{id}/` - Update user
- `PATCH /api/users/{id}/` - Partial update user
- `DELETE /api/users/{id}/` - Delete user
- `GET /api/users/stores/` - Get available stores
- `GET /api/users/roles/` - Get available roles
- `POST /api/users/{id}/reset_password/` - Reset user password

### Files Modified/Created

**Backend:**
- `backend/api/permissions.py` - Added `CanManageUsers` permission class
- `backend/api/serializers.py` - Added `UserManagementListSerializer` and `UserManagementDetailSerializer`
- `backend/api/views_user_management.py` - Created `UserManagementViewSet`
- `backend/api/urls.py` - Registered user management routes

**Frontend:**
- `frontend/src/components/UserManagement.js` - Main user management component
- `frontend/src/components/UserManagement.css` - Styling for user management
- `frontend/src/components/Settings.js` - Added "User Management" tab
- `frontend/src/components/Dashboard.js` - Pass currentUser to Settings

### Permission Logic

The `CanManageUsers` permission class enforces:

1. **View Access:** Only superusers and admins can access the user management interface
2. **Edit Restrictions:** Admins cannot edit other admins or superusers
3. **Delete Restrictions:** 
   - Users cannot delete themselves
   - Admins cannot delete other admins or superusers
4. **Field Protection:** Admins cannot modify `is_superuser`, `is_staff`, or promote users to admin

### Serializer Validation

`UserManagementDetailSerializer` includes validation to:
- Prevent non-superusers from modifying protected fields
- Ensure proper password hashing on create/update
- Generate random password if none provided on creation

## Frontend Implementation

### User Management Interface

Located in **Settings → User Management** tab (only visible to admins/superusers)

**Features:**
- 📊 Table view of all users with key information
- 🔍 Search by name or email
- 🎯 Filter by role
- ➕ Create new users
- ✏️ Edit existing users
- 🔒 Reset passwords
- 🗑️ Delete users (with restrictions)

### User Table Columns

- **Name** - Avatar with initials + full name
- **Email** - User's email address
- **Role** - Role badge + admin/superuser badges
- **Store** - Assigned store name
- **Status** - Active or Demo user indicator
- **Actions** - Edit, Reset Password, Delete buttons (based on permissions)

### Create/Edit User Modal

**Fields:**
- First Name *
- Last Name *
- Email *
- Username *
- Password (required for new users, optional for edits)
- Phone
- Role (dropdown)
- Shift Preference (Day/Night/Flexible)
- Store (superusers only, when multiple stores exist)
- Admin checkbox (superusers only)
- Superuser checkbox (superusers only)
- Demo User checkbox (superusers only)

### Password Reset Flow

1. Admin/superuser clicks reset password button
2. System generates 12-character random password
3. Modal displays the temporary password
4. Copy-to-clipboard button for easy sharing
5. Admin shares password securely with user

## Security Features

### Backend Security
- Store scoping enforced - users only see users in their store
- Permission checks on every endpoint
- Object-level permissions for edit/delete operations
- Password hashing using Django's built-in methods
- Protected fields cannot be modified by non-superusers

### Frontend Security
- User Management tab only visible to admins/superusers
- Action buttons conditionally rendered based on permissions
- Client-side validation before API calls
- Confirmation dialogs for destructive actions

## Usage Examples

### Creating a New User (Admin)

1. Navigate to **Settings → User Management**
2. Click **Add User** button
3. Fill in required fields:
   - First Name: "John"
   - Last Name: "Doe"
   - Email: "john.doe@example.com"
   - Username: "johndoe"
   - Password: "SecurePass123!"
   - Role: "Team Member"
4. Click **Create User**
5. User is created and assigned to your store automatically

### Resetting a Password (Admin)

1. Find the user in the table
2. Click the lock icon (Reset Password)
3. Confirm the action
4. Copy the generated temporary password
5. Share it securely with the user
6. User can change it after logging in

### Editing a User (Superuser)

1. Find the user in the table
2. Click the edit icon
3. Modify desired fields (e.g., change role from "Team Member" to "Shift Lead")
4. Optionally check "Admin" to give them user management access
5. Click **Save Changes**

## Permission Matrix

| Action | Superuser | Admin | Regular User |
|--------|-----------|-------|--------------|
| View user list | ✅ | ✅ | ❌ |
| Create user | ✅ | ✅ | ❌ |
| Edit regular user | ✅ | ✅ | ❌ |
| Edit admin | ✅ | ❌ | ❌ |
| Edit superuser | ✅ | ❌ | ❌ |
| Delete regular user | ✅ | ✅ | ❌ |
| Delete admin | ✅ | ❌ | ❌ |
| Delete self | ❌ | ❌ | ❌ |
| Change admin status | ✅ | ❌ | ❌ |
| Change superuser status | ✅ | ❌ | ❌ |
| Reset password | ✅ | ✅ (for users they can edit) | ❌ |
| Assign to different store | ✅ | ❌ | ❌ |

## Testing Checklist

### Superuser Tests
- [ ] Can view all users in their store
- [ ] Can create new users
- [ ] Can edit any user including admins
- [ ] Can delete any user except themselves
- [ ] Can promote users to admin
- [ ] Can promote users to superuser
- [ ] Can reset any user's password
- [ ] Can assign users to different stores (if multiple exist)

### Admin Tests
- [ ] Can view all users in their store
- [ ] Can create new users in their store
- [ ] Can edit regular users (team members, shift leads, managers)
- [ ] Cannot edit other admins
- [ ] Cannot edit superusers
- [ ] Can delete regular users
- [ ] Cannot delete admins
- [ ] Cannot delete superusers
- [ ] Cannot delete themselves
- [ ] Cannot change admin/superuser status
- [ ] Can reset passwords for users they can edit

### Regular User Tests
- [ ] Cannot see User Management tab in Settings
- [ ] Cannot access `/api/users/` endpoint (403 Forbidden)

### UI/UX Tests
- [ ] Search filters users by name and email
- [ ] Role filter works correctly
- [ ] Create modal validates required fields
- [ ] Edit modal pre-fills existing data
- [ ] Password field is optional when editing
- [ ] Delete confirmation dialog appears
- [ ] Success/error messages display appropriately
- [ ] Table updates after create/edit/delete
- [ ] Password reset modal shows generated password
- [ ] Copy-to-clipboard works for temporary password

## Error Handling

### Backend Errors
- `403 Forbidden` - User doesn't have permission
- `400 Bad Request` - Validation error (e.g., missing required field)
- `404 Not Found` - User doesn't exist
- `500 Internal Server Error` - Server error

### Frontend Error Handling
- API errors are caught and displayed as alerts
- Validation errors prevent form submission
- Network errors show user-friendly messages
- Loading states prevent duplicate submissions

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Actions** - Select multiple users for bulk operations
2. **User Import** - CSV import for adding multiple users
3. **Activity Log** - Track who created/modified/deleted users
4. **Email Notifications** - Auto-send credentials to new users
5. **Advanced Filters** - Filter by store, status, creation date
6. **User Groups** - Organize users into groups with shared permissions
7. **Password Policy** - Enforce password complexity requirements
8. **Two-Factor Authentication** - Add 2FA for admin accounts
9. **User Deactivation** - Soft delete instead of hard delete
10. **Audit Trail** - Complete history of user changes

## Notes

- All users are automatically assigned to the creator's store
- Superusers can see all stores but are still scoped to their assigned store in the API
- Django admin panel (`/admin/`) still provides cross-store access for superusers
- Demo users are marked with `is_demo_user=True` flag
- User management respects the existing store scoping architecture

## Support

For issues or questions about user management:
1. Check permission matrix to verify expected behavior
2. Review backend logs for permission errors
3. Verify user has correct `is_admin` or `is_superuser` flags
4. Ensure store assignments are correct
