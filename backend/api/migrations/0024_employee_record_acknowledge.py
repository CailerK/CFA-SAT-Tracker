"""Add acknowledge fields to EmployeeRecord.

`requires_acknowledgement` is set True on warnings / PIPs at creation so
the employee sees a banner; `acknowledged_at` + `acknowledged_by` capture
their sign-off via POST /team/documentation/records/:id/acknowledge/.
"""
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0023_development_track_plan'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='employeerecord',
            name='requires_acknowledgement',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='employeerecord',
            name='acknowledged_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='employeerecord',
            name='acknowledged_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='records_acknowledged',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
