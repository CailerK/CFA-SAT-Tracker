"""Add structured targeting + manager-only visibility to Notification.

Splits the model's `action_url` into a structured `(target_kind, target_id)`
pair so the frontend can route to the exact item being notified about, and
introduces `requires_manager` so sensitive notifications (guest concerns,
disciplinary docs, 360 results) only surface to manager-tier users.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0019_team_development_tracks_editor'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='target_kind',
            field=models.CharField(
                blank=True,
                choices=[
                    ('guest_concern', 'Guest Concern'),
                    ('documentation', 'Documentation Record'),
                    ('evaluation_360', '360 Evaluation'),
                    ('survey', 'Survey'),
                    ('shift_summary', 'Shift Summary'),
                    ('calendar_event', 'Calendar Event'),
                    ('chat_channel', 'Chat Channel'),
                    ('foh_task', 'FOH Task'),
                    ('kitchen_task', 'Kitchen Task'),
                    ('cleaning_task', 'Cleaning Task'),
                    ('dev_plan', 'Development Plan'),
                    ('training', 'Training Assignment'),
                ],
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='notification',
            name='target_id',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='notification',
            name='requires_manager',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'When True, only manager-tier users (manager, shift_lead, '
                    'director, admin, superuser) will see this notification.'
                ),
            ),
        ),
        # Expand notification_type choices to cover the new types. CharField
        # choices are a frontend/admin concern only — no DB migration needed
        # beyond updating the field metadata.
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('task_assigned', 'Task Assigned'),
                    ('evaluation_due', 'Evaluation Due'),
                    ('training_reminder', 'Training Reminder'),
                    ('system_update', 'System Update'),
                    ('guest_concern', 'Guest Concern'),
                    ('documentation', 'Team Documentation'),
                    ('evaluation_360', '360 Evaluation'),
                    ('survey', 'Team Survey'),
                    ('shift_summary', 'Shift Summary'),
                    ('calendar_deadline', 'Calendar Deadline'),
                    ('chat_mention', 'Chat Mention'),
                ],
                max_length=50,
            ),
        ),
    ]
