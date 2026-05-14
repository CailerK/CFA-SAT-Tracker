"""
Management command to remove demo users and optionally the demo store.

Usage:
    python manage.py remove_demo_users
    python manage.py remove_demo_users --keep-store  # Keep demo store but remove users
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import User, Store


class Command(BaseCommand):
    help = 'Remove demo users and optionally the demo store'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keep-store',
            action='store_true',
            help='Keep the demo store but remove demo users',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        keep_store = options['keep_store']
        
        # Users to keep (the 2 demo users we want to preserve)
        KEEP_USERS = ['demouser@gmail.com', 'admin@gmail.com']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n🔍 DRY RUN MODE - No changes will be made\n'))
        
        # Find demo users excluding the ones we want to keep
        demo_users = User.objects.filter(is_demo_user=True).exclude(email__in=KEEP_USERS)
        demo_count = demo_users.count()
        
        # Show kept users
        kept_users = User.objects.filter(email__in=KEEP_USERS)
        if kept_users.exists():
            self.stdout.write(self.style.SUCCESS('\nKeeping these demo users:'))
            for user in kept_users:
                store_name = user.store.name if user.store else 'No Store'
                self.stdout.write(f'  ✓ {user.email} ({user.first_name} {user.last_name}) - {store_name}')
        
        if demo_count == 0:
            self.stdout.write(self.style.SUCCESS('\n✓ No other demo users found to remove'))
            return
        
        self.stdout.write(f'\nFound {demo_count} other demo user(s) to remove:')
        for user in demo_users:
            store_name = user.store.name if user.store else 'No Store'
            self.stdout.write(f'  • {user.email} ({user.first_name} {user.last_name}) - {store_name}')
        
        # Find demo store
        demo_store = Store.objects.filter(store_number='02203').first()
        
        if not dry_run:
            with transaction.atomic():
                # Delete demo users (excluding kept ones)
                deleted_count, _ = demo_users.delete()
                self.stdout.write(self.style.SUCCESS(f'\n✓ Deleted {deleted_count} demo user(s)'))
                
                # Delete demo store if requested
                if demo_store and not keep_store:
                    store_name = demo_store.name
                    demo_store.delete()
                    self.stdout.write(self.style.SUCCESS(f'✓ Deleted demo store: {store_name}'))
                elif demo_store and keep_store:
                    self.stdout.write(self.style.WARNING(f'→ Kept demo store: {demo_store.name}'))
        else:
            self.stdout.write(self.style.WARNING(f'\n→ Would delete {demo_count} demo user(s)'))
            if demo_store and not keep_store:
                self.stdout.write(self.style.WARNING(f'→ Would delete demo store: {demo_store.name}'))
        
        self.stdout.write(self.style.SUCCESS('\n✓ Done!\n'))
