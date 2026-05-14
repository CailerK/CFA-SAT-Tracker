# Account Setup Guide

This guide explains how to set up stores and user accounts for the CFA SAT Tracker application.

## Overview

The application uses a **multi-store architecture** where:
- Each user is assigned to exactly one store
- Users can only see data from their assigned store
- Even superusers are scoped to their store (Django admin panel still allows cross-store access)

## Store Structure

Two stores are created:

### 1. Demo Store (Store #02203)
- **Purpose**: Demonstration and exploration
- **Contains**: Full demo data including 10 placeholder team members, tasks, shift summaries, etc.
- **Users**: `demouser@gmail.com` and `admin@gmail.com`

### 2. Test Store (Store #00727)
- **Purpose**: Clean testing environment for real workflows
- **Contains**: No demo data - clean slate for testing
- **Users**: Your superuser account, `testadmin@cfasattracker.com`, and `testmember@cfasattracker.com`

## User Accounts

Five accounts are created with different roles and store assignments:

| Account | Email | Password | Store | Role | Purpose |
|---------|-------|----------|-------|------|---------|
| **Your Superuser** | kellenbergercailer@gmail.com | admin123 | Test Store | superuser | Your main account with clean test data |
| **Demo User** | demouser@gmail.com | demouser | Demo Store | team_member | Shows what a team member sees with full demo data |
| **Demo Admin** | admin@gmail.com | admin | Demo Store | manager | Can make changes in demo environment |
| **Test Admin** | testadmin@cfasattracker.com | testadmin123 | Test Store | manager | Test admin workflows - testmember sees their changes |
| **Test Member** | testmember@cfasattracker.com | testmember123 | Test Store | team_member | Test team member workflows - sees testadmin's changes |

## Setup Instructions

### 1. Run the Setup Command

From the backend directory:

```bash
cd backend
python manage.py setup_stores_and_accounts
```

This command will:
- ✓ Create Demo Store and Test Store with settings
- ✓ Create all 5 user accounts with proper store assignments
- ✓ Create 10 demo team members in Demo Store
- ✓ Seed sample FOH tasks, kitchen tasks, cleaning tasks, and shift tags in Demo Store
- ✓ Leave Test Store completely clean for your testing

### 2. Verify the Setup

After running the command, you should see output like:

```
Starting store and account setup...
Creating stores...
  ✓ Created Demo Store #02203
  ✓ Created Test Store #00727

Creating user accounts...
  ✓ Created kellenbergercailer@gmail.com (manager at CFA Test Store)
  ✓ Created demouser@gmail.com (team_member at CFA Demo Store)
  ✓ Created admin@gmail.com (manager at CFA Demo Store)
  ✓ Created testadmin@cfasattracker.com (manager at CFA Test Store)
  ✓ Created testmember@cfasattracker.com (team_member at CFA Test Store)

Seeding demo data in Demo Store...
  ✓ Created 10 demo team members
  ✓ Created 3 departments
  ✓ Created 8 FOH task templates
  ✓ Created 6 kitchen checklist tasks
  ✓ Created 4 cleaning tasks
  ✓ Created 6 shift tags

✓ Setup completed successfully!
```

### 3. Test the Accounts

Login with each account to verify store scoping:

**Test Store Accounts** (clean data):
- Login as `kellenbergercailer@gmail.com` - should see empty Test Store
- Login as `testadmin@cfasattracker.com` - should see empty Test Store
- Login as `testmember@cfasattracker.com` - should see empty Test Store

**Demo Store Accounts** (full demo data):
- Login as `demouser@gmail.com` - should see 10 team members and all demo tasks
- Login as `admin@gmail.com` - should see 10 team members and all demo tasks

## Key Changes Made

### 1. Store Scoping Fix
**File**: `backend/api/viewsets.py`

Removed the superuser bypass that allowed superusers to see all stores. Now all users (including superusers) are scoped to their assigned store:

```python
# Before: Superusers saw everything across all stores
if user.is_superuser:
    return qs

# After: All users see only their store's data
store_id = getattr(user, "store_id", None)
return qs.filter(**{self.store_field_name: store_id})
```

### 2. Management Command
**File**: `backend/api/management/commands/setup_stores_and_accounts.py`

Created a comprehensive Django management command that:
- Creates both stores with proper settings
- Creates all 5 user accounts with correct store assignments
- Seeds demo data only in Demo Store
- Leaves Test Store clean

### 3. Deprecated Old Script
**File**: `backend/create_demo_users.py`

Replaced the old script with a deprecation notice pointing to the new management command.

## Testing Workflows

### Admin → Team Member Flow (Test Store)
1. Login as `testadmin@cfasattracker.com`
2. Create a new FOH task or shift summary
3. Logout and login as `testmember@cfasattracker.com`
4. Verify the team member can see the admin's changes

### Demo Environment (Demo Store)
1. Login as `demouser@gmail.com`
2. Explore the full demo data (10 team members, tasks, etc.)
3. Login as `admin@gmail.com`
4. Make changes and see how they appear to the demo user

## Troubleshooting

### Users See Wrong Store Data
Run the setup command again - it will update existing users' store assignments:
```bash
python manage.py setup_stores_and_accounts
```

### Need to Reset Everything
Delete the database and run migrations + setup:
```bash
rm db.sqlite3
python manage.py migrate
python manage.py setup_stores_and_accounts
```

### Django Admin Panel Access
The Django admin panel (`/admin/`) still allows cross-store access for superusers. This is intentional for administrative tasks. The API endpoints respect store scoping.

## Notes

- **Store Scoping**: All API endpoints automatically filter by the user's store
- **Demo Data**: Only exists in Demo Store (store #02203)
- **Clean Testing**: Test Store (store #00727) has no demo data
- **Superuser Scoping**: Even superusers are scoped to their store in the API
- **Password Security**: Change default passwords in production!

## Support

If you encounter issues, check:
1. User's `store` field is set correctly in the database
2. Store exists with the correct `store_number`
3. StoreSettings exists for each store
4. Run the setup command to fix any misconfigurations
