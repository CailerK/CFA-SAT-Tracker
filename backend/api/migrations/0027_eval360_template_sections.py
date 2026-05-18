"""Add structured `sections` JSON to Evaluation360Template.

Until now the template only had `sections_count` (a number). Adding
`sections` as a JSON list lets the Take Evaluation UI actually render
section headings + question rating widgets driven by template content.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_chat_message_reactions'),
    ]

    operations = [
        migrations.AddField(
            model_name='evaluation360template',
            name='sections',
            field=models.JSONField(blank=True, default=list),
        ),
    ]
