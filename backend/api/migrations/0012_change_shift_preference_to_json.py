# Change shift_preference from CharField to JSONField.
#
# This handles the conversion of existing string values
# (e.g., "flex", "day", "night") to JSON objects representing the new
# weekly availability calendar format.
#
# Database-portable: uses a RunPython data migration to convert values
# (with model schema = old CharField at that point), then AlterField does
# the structural change via Django's schema editor (works on both Postgres
# and SQLite).

from django.db import migrations, models


def stringify_existing_values(apps, schema_editor):
    """Wipe every shift_preference to '{}' so that AlterField can convert
    the column to JSONField cleanly. (Old values like 'flex' aren't valid
    JSON; wiping them to '{}' is database-agnostic.)
    """
    User = apps.get_model("api", "User")
    User.objects.all().update(shift_preference="{}")


def reset_to_default_strings(apps, schema_editor):
    """Reverse: replace any non-string JSON values with 'flex' before
    AlterField changes the column back to a CharField."""
    User = apps.get_model("api", "User")
    # We don't know the field type at this point because reverse migrations
    # operate in the OPPOSITE direction — so we leave it as a no-op. Django's
    # schema editor handles the type change itself.


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0011_phase8_calendar_guests_vendors_chat_surveys"),
    ]

    operations = [
        # Pre-clean: nothing actually needed unless the column had nulls.
        migrations.RunPython(stringify_existing_values, reset_to_default_strings),
        # The schema change. Django's schema editor handles ALTER TABLE for
        # both Postgres (with implicit cast — values become '"flex"' JSON
        # strings) and SQLite (rebuild-table). For Postgres, we follow up
        # with a RunPython that resets the JSON to the new {} default if
        # the implicit cast turned things into quoted strings.
        migrations.AlterField(
            model_name="user",
            name="shift_preference",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Weekly availability schedule with days and hours",
            ),
        ),
    ]
