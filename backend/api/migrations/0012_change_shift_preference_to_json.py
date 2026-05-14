# Generated migration to change shift_preference from CharField to JSONField
#
# This migration handles the conversion of existing string values
# (e.g., "flex", "day", "night") to JSON objects representing the new
# weekly availability calendar format.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0011_phase8_calendar_guests_vendors_chat_surveys'),
    ]

    operations = [
        # Step 1: Use raw SQL with USING clause to convert existing string
        # values to empty JSON objects. PostgreSQL requires explicit casting
        # when changing a column type from text to jsonb.
        migrations.RunSQL(
            sql=[
                "ALTER TABLE api_user ALTER COLUMN shift_preference DROP DEFAULT;",
                "ALTER TABLE api_user ALTER COLUMN shift_preference TYPE jsonb USING '{}'::jsonb;",
                "ALTER TABLE api_user ALTER COLUMN shift_preference SET DEFAULT '{}'::jsonb;",
            ],
            reverse_sql=[
                "ALTER TABLE api_user ALTER COLUMN shift_preference DROP DEFAULT;",
                "ALTER TABLE api_user ALTER COLUMN shift_preference TYPE varchar(10) USING 'flex';",
                "ALTER TABLE api_user ALTER COLUMN shift_preference SET DEFAULT 'flex';",
            ],
            state_operations=[
                migrations.AlterField(
                    model_name='user',
                    name='shift_preference',
                    field=models.JSONField(blank=True, default=dict, help_text='Weekly availability schedule with days and hours'),
                ),
            ],
        ),
    ]
