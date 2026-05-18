"""Add ChatMessageReaction + pinned_at/pinned_by on ChatMessage.

Backs the LD Growth per-message hover toolbar (heart/thumbs/pin/etc.) and
the inline reaction-bubble row that appears under reacted messages.
"""
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0025_documentation_prefs'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='chatmessage',
            name='pinned_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='chatmessage',
            name='pinned_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=models.deletion.SET_NULL,
                related_name='pinned_chat_messages',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name='ChatMessageReaction',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('emoji', models.CharField(
                    choices=[
                        ('heart',     '❤️'),
                        ('thumbs_up', '👍'),
                        ('thumbs_dn', '👎'),
                        ('party',     '🎉'),
                        ('eyes',      '👀'),
                        ('check',     '✅'),
                    ],
                    max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='reactions',
                    to='api.chatmessage',
                )),
                ('user', models.ForeignKey(
                    on_delete=models.deletion.CASCADE,
                    related_name='chat_reactions',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'ordering': ['created_at', 'id'],
                'indexes': [models.Index(fields=['message'], name='api_chatmsg_react_msg_idx')],
                'constraints': [
                    models.UniqueConstraint(
                        fields=['message', 'user', 'emoji'],
                        name='unique_reaction_per_user_message_emoji',
                    ),
                ],
            },
        ),
    ]
