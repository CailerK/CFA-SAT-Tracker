# Generated migration to change shift_preference from CharField to JSONField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='shift_preference',
            field=models.JSONField(blank=True, default=dict, help_text='Weekly availability schedule with days and hours'),
        ),
    ]
