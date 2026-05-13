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

from api.models import User  # noqa: E402


def upsert_user(*, email, username, password, first_name, last_name, role,
                company_id="02203", is_demo_user=False, is_superuser=False,
                is_staff=False):
    """Create the user if missing; otherwise leave them alone (don't clobber
    passwords or roles someone may have changed in admin)."""
    existing = User.objects.filter(email=email).first()
    if existing:
        print(f"  - {email} already exists, skipping.")
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
    )
    if is_superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save()
    elif is_staff:
        user.is_staff = True
        user.save()
    print(f"  + Created {email} ({first_name} {last_name}, role={role}, "
          f"superuser={is_superuser})")
    return user


def main():
    print("Initializing users on Railway database...")

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
            is_superuser=True,
            is_staff=True,
        )
    else:
        print("Superuser: skipping — DJANGO_SUPERUSER_* env vars not all set.")

    # ----- 2. Demo users (mirrors backend/create_demo_users.py) -----
    print("Demo users:")
    demo_users = [
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
            "first_name": "Store",
            "last_name": "Manager",
            "role": "manager",
            "is_demo_user": True,
        },
        {
            "email": "store@cfasattracker.com",
            "username": "storemanager",
            "password": "password123",
            "first_name": "Store",
            "last_name": "Manager",
            "role": "manager",
            "is_demo_user": False,
        },
    ]
    for u in demo_users:
        upsert_user(**u, company_id="02203")

    print("User initialization complete.")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Don't crash the whole deploy if this script fails — log it loudly
        # but let the container keep starting. Worst case is no users get
        # auto-created and the user can run the script manually.
        print(f"WARNING: user init failed: {e}", file=sys.stderr)
        sys.exit(0)
