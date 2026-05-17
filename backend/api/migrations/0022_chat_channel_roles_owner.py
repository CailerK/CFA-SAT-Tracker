"""Add allowed_roles + created_by to ChatChannel."""
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0021_chat_channel_description'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='chatchannel',
            name='allowed_roles',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='chatchannel',
            name='created_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='created_chat_channels',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
