"""
Idempotent user setup script for Railway deploys.

Runs on every deploy. Safe to re-run — checks existence before creating.

Creates:
  1. A superuser/admin from DJANGO_SUPERUSER_* env vars (if those vars are set).
  2. A handful of demo users for testing different roles.

Usage:
  python manage.py shell < init_railway_users.py
  -- or --
  python init_railway_users.py
"""

import os
import sys

# Set up Django if invoked directly.
if "DJANGO_SETTINGS_MODULE" not in os.environ:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
    import django
    django.setup()

from api.models import (  # noqa: E402
    Store,
    StoreSettings,
    User,
    UserPreferences,
)
from api.seed_data import seed_all_for_store  # noqa: E402


DEFAULT_STORE_NUMBER = os.environ.get("DEFAULT_STORE_NUMBER", "02203")
DEFAULT_STORE_NAME = os.environ.get(
    "DEFAULT_STORE_NAME", "CFA I-410 & Rigsby"
)

# A second "sandbox" store used ONLY for the public-facing test/demo users
# (demouser, admin@gmail.com). Splitting these out of the real store proves
# multi-tenant isolation in production: writes from demouser must NEVER show
# up to the real I-410 team and vice versa.
TEST_STORE_NUMBER = os.environ.get("TEST_STORE_NUMBER", "00000")
TEST_STORE_NAME = os.environ.get("TEST_STORE_NAME", "Sandbox / Demo Store")


def _upsert_store(number, name, address="", timezone_name="America/Chicago"):
    store, created = Store.objects.get_or_create(
        store_number=number,
        defaults={
            "name": name,
            "timezone_name": timezone_name,
            "address": address,
        },
    )
    StoreSettings.objects.get_or_create(store=store)
    if created:
        print(f"  + Created Store {store}")
    else:
        print(f"  - Store {store} already exists, skipping.")
    return store


def upsert_default_store():
    """Create the seed Store + StoreSettings if they don't already exist."""
    return _upsert_store(
        DEFAULT_STORE_NUMBER, DEFAULT_STORE_NAME,
        address="2203 SE Loop 410, San Antonio, TX",
    )


def upsert_test_store():
    """Create the sandbox/demo Store separate from the real one."""
    return _upsert_store(
        TEST_STORE_NUMBER, TEST_STORE_NAME,
        address="Sandbox — public demo accounts only",
    )


def upsert_user(*, email, username, password, first_name, last_name, role,
                store=None, company_id="02203", is_demo_user=False,
                is_superuser=False, is_staff=False, is_admin=False):
    """Create the user if missing; otherwise just make sure they're linked
    to the default store + have a preferences row. We never clobber existing
    passwords or roles."""
    existing = User.objects.filter(email=email).first()
    if existing:
        # Make sure existing users get backfilled to the new store FK if
        # they were created before Phase 0.
        changed = False
        if store and existing.store_id is None:
            existing.store = store
            changed = True
        # Update is_admin flag if specified
        if is_admin and not existing.is_admin:
            existing.is_admin = True
            changed = True
        if changed:
            existing.save(update_fields=["store", "is_admin"])
        UserPreferences.objects.get_or_create(user=existing)
        print(f"  - {email} already exists, ensured store link + prefs.")
        return existing
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name,
        role=role,
        company_id=company_id,
        is_demo_user=is_demo_user,
        is_admin=is_admin,
        store=store,
    )
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save()
    elif is_staff:
        user.is_staff = True
        user.save()
    UserPreferences.objects.get_or_create(user=user)
    print(f"  + Created {email} ({first_name} {last_name}, role={role}, "
          f"admin={is_admin}, superuser={is_superuser})")
    return user


def _ensure_user_in_store(user, target_store):
    """Move an existing user to `target_store` if they're not there yet.

    Used to migrate demouser/admin@gmail.com out of the real store on the
    first deploy where this split takes effect. After that it's a no-op.
    """
    if user and target_store and user.store_id != target_store.id:
        old_store = user.store
        user.store = target_store
        user.save(update_fields=["store"])
        print(f"  ! Moved {user.email}: {old_store} → {target_store}")


def main():
    print("Initializing users on Railway database...")

    # ----- 0. Stores + Settings -----
    print("Default store:")
    store = upsert_default_store()
    print("Sandbox store:")
    test_store = upsert_test_store()

    # ----- 1. Superuser from environment -----
    admin_email = os.environ.get("DJANGO_SUPERUSER_EMAIL")
    admin_username = os.environ.get("DJANGO_SUPERUSER_USERNAME")
    admin_password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
    admin_first = os.environ.get("DJANGO_SUPERUSER_FIRST_NAME", "Site")
    admin_last = os.environ.get("DJANGO_SUPERUSER_LAST_NAME", "Admin")

    if admin_email and admin_username and admin_password:
        print("Superuser:")
        upsert_user(
            email=admin_email,
            username=admin_username,
            password=admin_password,
            first_name=admin_first,
            last_name=admin_last,
            role="admin",
            store=store,
            is_superuser=True,
            is_staff=True,
        )
    else:
        print("Superuser: skipping — DJANGO_SUPERUSER_* env vars not all set.")

    # ----- 2. Public demo / sandbox users (LIVE in the test store) -----
    # These accounts are advertised publicly (demouser, admin@gmail.com) and
    # MUST live in their own store so any writes they do don't bleed into
    # the real CFA I-410 data, and vice versa.
    print("Public demo users (sandbox store):")
    sandbox_users = [
        {
            "email": "demouser@gmail.com",
            "username": "demouser",
            "password": "demouser",
            "first_name": "Demo",
            "last_name": "User",
            "role": "team_member",
            "is_demo_user": True,
        },
        {
            "email": "admin@gmail.com",
            "username": "demo_admin",
            "password": "admin",
            "first_name": "Sandbox",
            "last_name": "Manager",
            "role": "manager",
            "is_demo_user": True,
            "is_admin": True,
        },
    ]
    for u in sandbox_users:
        created_user = upsert_user(
            **u, store=test_store, company_id=TEST_STORE_NUMBER,
        )
        # First-time migration: move them off the real store if they were
        # created before the split.
        _ensure_user_in_store(created_user, test_store)

    # ----- 3. Real store-manager seed (lives in DEFAULT store) -----
    print("Real-store users:")
    upsert_user(
        email="store@cfasattracker.com",
        username="storemanager",
        password="password123",
        first_name="Store",
        last_name="Manager",
        role="manager",
        is_demo_user=False,
        store=store,
        company_id=DEFAULT_STORE_NUMBER,
    )

    # ----- 4. Per-store operational data for BOTH stores -----
    print("Per-store seed data (real store):")
    seed_all_for_store(store)
    print("Per-store seed data (sandbox store):")
    seed_all_for_store(test_store)

    print("Initialization complete.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Don't crash the whole deploy if this script fails — log it loudly
        # but let the container keep starting. Worst case is no users get
        # auto-created and the user can run the script manually.
        print(f"WARNING: user init failed: {e}", file=sys.stderr)
        sys.exit(0)
