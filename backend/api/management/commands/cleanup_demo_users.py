"""
Management command to remove auto-generated demo users.

Usage:
    python manage.py cleanup_demo_users
    python manage.py cleanup_demo_users --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import User


class Command(BaseCommand):
    help = 'Remove auto-generated demo users from seed_data.py'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Users to keep (the real demo accounts)
        KEEP_USERS = ['demouser@gmail.com', 'admin@gmail.com', 'store@cfasattracker.com']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Find auto-generated demo users (from seed_data.py)
        # These all have @demo.cfasattracker.com emails
        demo_users = User.objects.filter(
            email__endswith='@demo.cfasattracker.com'
        ).exclude(email__in=KEEP_USERS)
        
        demo_count = demo_users.count()
        
        # Show kept users
        kept_users = User.objects.filter(email__in=KEEP_USERS)
        if kept_users.exists():
            self.stdout.write(self.style.SUCCESS('\nKeeping these demo users:'))
            for user in kept_users:
                store_name = user.store.name if user.store else 'No Store'
                self.stdout.write(f'  ✓ {user.email} ({user.first_name} {user.last_name}) - {store_name}')
        
        if demo_count == 0:
            self.stdout.write(self.style.SUCCESS('\n✓ No auto-generated demo users found to remove'))
            return
        
        self.stdout.write(f'\nFound {demo_count} auto-generated demo user(s) to remove:')
        for user in demo_users:
            store_name = user.store.name if user.store else 'No Store'
            self.stdout.write(f'  • {user.email} ({user.first_name} {user.last_name}) - {store_name}')
        
        if not dry_run:
            with transaction.atomic():
                # Delete auto-generated demo users
                deleted_count, _ = demo_users.delete()
                self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {deleted_count} auto-generated demo user(s)'))
                self.stdout.write(self.style.SUCCESS('\n✓ These users will NOT be recreated on future deploys'))
        else:
            self.stdout.write(self.style.WARNING(f'\n→ Would delete {demo_count} users (run without --dry-run to delete)'))
