# Add `day_of_week` to TimeBlock so SetupSheetTemplates can hold per-day
# blocks (the LD-Growth-style "Configure Your Template" page). Also relax
# `positions_needed`'s default to dict so a TimeBlock can hold structured
# {front_counter: [], drive_thru: [], kitchen: []} payloads. Existing list
# values are preserved as-is on disk; the application layer tolerates both.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0012_change_shift_preference_to_json"),
    ]

    operations = [
        migrations.AddField(
            model_name="timeblock",
            name="day_of_week",
            field=models.CharField(
                blank=True,
                choices=[
                    ("monday", "Monday"),
                    ("tuesday", "Tuesday"),
                    ("wednesday", "Wednesday"),
                    ("thursday", "Thursday"),
                    ("friday", "Friday"),
                    ("saturday", "Saturday"),
                    ("sunday", "Sunday"),
                ],
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="timeblock",
            name="positions_needed",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Per-department position list (FC/DT/Kitchen).",
            ),
        ),
        migrations.AlterModelOptions(
            name="timeblock",
            options={"ordering": ["day_of_week", "order", "id"]},
        ),
    ]
