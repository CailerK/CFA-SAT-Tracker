"""
Backfill data migration.

For every existing User row that has a non-empty company_id but no store,
ensure a Store with that store_number exists (creating it if needed with
a sensible default name) and link the user to it. Also ensure each Store
has a StoreSettings row.

Idempotent: re-running has no effect.
"""

from django.db import migrations


def backfill_stores(apps, schema_editor):
    User = apps.get_model("api", "User")
    Store = apps.get_model("api", "Store")
    StoreSettings = apps.get_model("api", "StoreSettings")

    # Group users by their legacy company_id.
    seen_numbers = set()
    for user in User.objects.filter(store__isnull=True).iterator():
        number = (user.company_id or "").strip() or "00727"
        seen_numbers.add(number)

        store, created = Store.objects.get_or_create(
            store_number=number,
            defaults={
                "name": f"CFA Store #{number}",
                "timezone_name": "America/Chicago",
            },
        )
        # Make sure every store has a settings row.
        StoreSettings.objects.get_or_create(store=store)
        user.store = store
        user.save(update_fields=["store"])

    # Ensure any Stores that were created earlier (perhaps directly in admin)
    # also have a settings row.
    for store in Store.objects.all():
        StoreSettings.objects.get_or_create(store=store)


def reverse_backfill(apps, schema_editor):
    # No-op: we don't want to delete real stores on rollback.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0002_store_user_phone_userpreferences_storesettings_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_stores, reverse_backfill),
    ]
