# Quick Start: Account Setup

## Run This Command

```bash
cd backend
python manage.py setup_stores_and_accounts
```

## Login Credentials

### Test Store (Clean Testing Data)
```
Superuser:    kellenbergercailer@gmail.com / admin123
Test Admin:   testadmin@cfasattracker.com / testadmin123
Test Member:  testmember@cfasattracker.com / testmember123
```

### Demo Store (Full Demo Data)
```
Demo User:    demouser@gmail.com / demouser
Demo Admin:   admin@gmail.com / admin
```

## What Gets Created

- ✓ **Demo Store #02203** - Full demo data with 10 team members
- ✓ **Test Store #00727** - Clean slate for testing
- ✓ **5 User Accounts** - Properly assigned to stores
- ✓ **Sample Tasks** - FOH, Kitchen, Cleaning (Demo Store only)
- ✓ **Departments & Tags** - Pre-configured (Demo Store only)

## Key Points

1. **Your superuser** sees only Test Store data (clean)
2. **Demo accounts** see only Demo Store data (full demo)
3. **testadmin** and **testmember** can test admin→member workflows
4. All store scoping is enforced - no cross-store data leakage

## Need More Info?

See `SETUP_ACCOUNTS.md` for detailed documentation.
