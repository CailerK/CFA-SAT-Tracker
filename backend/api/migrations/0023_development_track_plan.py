"""Add DevelopmentTrackPlan — the LD Growth "Manage Development Tracks" model."""
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0022_chat_channel_roles_owner'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DevelopmentTrackPlan',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('from_position', models.CharField(max_length=60)),
                ('target_role', models.CharField(max_length=60)),
                ('name', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True)),
                ('is_default', models.BooleanField(default=False)),
                ('steps', models.JSONField(blank=True, default=list)),
                ('order', models.PositiveIntegerField(default=0)),
                ('archived_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('store', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='development_track_plans',
                    to='api.store',
                )),
                ('created_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=models.deletion.SET_NULL,
                    related_name='created_dev_track_plans',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['from_position', 'order', 'id'],
                'indexes': [models.Index(fields=['store', 'from_position'], name='api_devplan_store_idx')],
            },
        ),
    ]
