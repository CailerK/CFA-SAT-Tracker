"""Add ChatChannel.description for sidebar subtitles."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0020_notification_targeting'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatchannel',
            name='description',
            field=models.CharField(
                blank=True, max_length=200,
                help_text='One-liner shown beneath the channel name in the sidebar.',
            ),
        ),
    ]
