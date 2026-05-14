# Add `area`, `description`, and `assignee` to CleaningTask so the FOH
# Create Cleaning Task modal can persist all of its fields.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0013_timeblock_day_of_week"),
    ]

    operations = [
        migrations.AddField(
            model_name="cleaningtask",
            name="area",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="cleaningtask",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="cleaningtask",
            name="assignee",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="assigned_cleaning_tasks",
                to="api.user",
            ),
        ),
    ]
