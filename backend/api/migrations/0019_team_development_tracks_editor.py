"""
Phase: Team Development → Edit Tracks page.

Adds the visual fields the Career Path editor needs (`display_name`,
`step_label`, `icon_key`, `color_key`) plus the store-level visibility
toggle that controls whether team members can see the path at all.

All fields default-friendly so existing rows stay valid.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_dev_plan_assignment"),
    ]

    operations = [
        migrations.AddField(
            model_name="storesettings",
            name="dev_tracks_visible_to_team",
            field=models.BooleanField(
                default=True,
                help_text="When off, team-members can no longer see the Career Path on Team Development.",
            ),
        ),
        migrations.AddField(
            model_name="positiontrack",
            name="display_name",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="positiontrack",
            name="step_label",
            field=models.CharField(blank=True, default="", max_length=40),
        ),
        migrations.AddField(
            model_name="positiontrack",
            name="icon_key",
            field=models.CharField(
                choices=[
                    ("map-pin", "Map Pin"),
                    ("graduation-cap", "Graduation Cap"),
                    ("target", "Target"),
                    ("award", "Award"),
                    ("briefcase", "Briefcase"),
                    ("users", "Users"),
                    ("crown", "Crown"),
                    ("star", "Star"),
                ],
                default="map-pin",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="positiontrack",
            name="color_key",
            field=models.CharField(
                choices=[
                    ("red", "Red"),
                    ("slate", "Slate"),
                    ("blue", "Blue"),
                    ("emerald", "Emerald"),
                    ("amber", "Amber"),
                    ("violet", "Violet"),
                ],
                default="red",
                max_length=16,
            ),
        ),
    ]
