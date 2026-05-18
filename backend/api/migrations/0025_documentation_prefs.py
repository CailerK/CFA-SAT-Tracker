"""Add documentation_prefs JSONField to StoreSettings.

Backs the LD Growth "Documentation Preferences" slide-out drawer
(default date filter, view mode, sort, card-highlight thresholds,
disciplinary templates list).
"""
from django.db import migrations, models

from api.models import _default_documentation_prefs


def _seed_existing_settings(apps, schema_editor):
    SS = apps.get_model('api', 'StoreSettings')
    default = _default_documentation_prefs()
    for s in SS.objects.all():
        if not s.documentation_prefs:
            s.documentation_prefs = default
            s.save(update_fields=['documentation_prefs'])


def _noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0024_employee_record_acknowledge'),
    ]

    operations = [
        migrations.AddField(
            model_name='storesettings',
            name='documentation_prefs',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.RunPython(_seed_existing_settings, _noop_reverse),
    ]
