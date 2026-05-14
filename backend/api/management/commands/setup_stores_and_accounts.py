"""
Management command to set up stores and user accounts for CFA SAT Tracker.

Creates:
- Two stores: Demo Store (02203) and Test Store (00727)
- Five user accounts with proper store assignments
- Demo team members and sample data only in Demo Store

Usage:
    python manage.py setup_stores_and_accounts
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from api.models import (
    Store, StoreSettings, User, UserPreferences,
    FOHTaskTemplate, KitchenChecklistTask, CleaningTask,
    ShiftTag, Department
)


class Command(BaseCommand):
    help = 'Set up stores and user accounts for demo and testing'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting store and account setup...'))
        
        with transaction.atomic():
            # Create stores
            demo_store, test_store = self._create_stores()
            
            # Create user accounts
            self._create_accounts(demo_store, test_store)
            
            # Seed demo data only in Demo Store
            self._seed_demo_data(demo_store)
        
        self.stdout.write(self.style.SUCCESS('\n✓ Setup completed successfully!\n'))
        self._print_login_info()

    def _create_stores(self):
        """Create Demo Store and Test Store with settings."""
        self.stdout.write('Creating stores...')
        
        # Demo Store
        demo_store, created = Store.objects.get_or_create(
            store_number='02203',
            defaults={
                'name': 'CFA Demo Store',
                'address': '123 Demo Street, Demo City, TX 78201',
                'phone': '(210) 555-0100',
                'email': 'demo@cfasattracker.com',
                'vision': 'To be the most caring and excellent quick-service restaurant.',
                'mission': 'To glorify God by being a faithful steward.',
                'timezone_name': 'America/Chicago',
            }
        )
        if created:
            StoreSettings.objects.create(store=demo_store)
            self.stdout.write(f'  ✓ Created Demo Store #{demo_store.store_number}')
        else:
            self.stdout.write(f'  → Demo Store already exists')
        
        # Test Store
        test_store, created = Store.objects.get_or_create(
            store_number='00727',
            defaults={
                'name': 'CFA Test Store',
                'address': '456 Test Avenue, San Antonio, TX 78209',
                'phone': '(210) 555-0200',
                'email': 'test@cfasattracker.com',
                'vision': 'Testing environment for development.',
                'mission': 'Clean testing space for real workflows.',
                'timezone_name': 'America/Chicago',
            }
        )
        if created:
            StoreSettings.objects.create(store=test_store)
            self.stdout.write(f'  ✓ Created Test Store #{test_store.store_number}')
        else:
            self.stdout.write(f'  → Test Store already exists')
        
        return demo_store, test_store

    def _create_accounts(self, demo_store, test_store):
        """Create the 5 user accounts with proper store assignments."""
        self.stdout.write('\nCreating user accounts...')
        
        accounts = [
            {
                'email': 'kellenbergercailer@gmail.com',
                'username': 'cailer',
                'password': 'admin123',
                'first_name': 'Cailer',
                'last_name': 'Kellenberger',
                'role': 'manager',
                'store': test_store,
                'is_superuser': True,
                'is_staff': True,
                'is_admin': True,
                'is_demo_user': False,
                'company_id': '00727',
            },
            {
                'email': 'demouser@gmail.com',
                'username': 'demouser',
                'password': 'demouser',
                'first_name': 'Demo',
                'last_name': 'User',
                'role': 'team_member',
                'store': demo_store,
                'is_superuser': False,
                'is_staff': False,
                'is_admin': False,
                'is_demo_user': True,
                'company_id': '02203',
            },
            {
                'email': 'admin@gmail.com',
                'username': 'admin',
                'password': 'admin',
                'first_name': 'Store',
                'last_name': 'Manager',
                'role': 'manager',
                'store': demo_store,
                'is_superuser': False,
                'is_staff': False,
                'is_admin': True,
                'is_demo_user': True,
                'company_id': '02203',
            },
            {
                'email': 'testadmin@cfasattracker.com',
                'username': 'testadmin',
                'password': 'testadmin123',
                'first_name': 'Test',
                'last_name': 'Admin',
                'role': 'manager',
                'store': test_store,
                'is_superuser': False,
                'is_staff': False,
                'is_admin': True,
                'is_demo_user': False,
                'company_id': '00727',
            },
            {
                'email': 'testmember@cfasattracker.com',
                'username': 'testmember',
                'password': 'testmember123',
                'first_name': 'Test',
                'last_name': 'Member',
                'role': 'team_member',
                'store': test_store,
                'is_superuser': False,
                'is_staff': False,
                'is_admin': False,
                'is_demo_user': False,
                'company_id': '00727',
            },
        ]
        
        for account_data in accounts:
            email = account_data['email']
            if User.objects.filter(email=email).exists():
                user = User.objects.get(email=email)
                # Update existing user's store assignment
                user.store = account_data['store']
                user.company_id = account_data['company_id']
                user.role = account_data['role']
                user.is_demo_user = account_data['is_demo_user']
                user.is_admin = account_data['is_admin']
                user.save()
                self.stdout.write(f'  → Updated {email} (assigned to {user.store.name})')
            else:
                user = User.objects.create_user(
                    username=account_data['username'],
                    email=email,
                    password=account_data['password'],
                    first_name=account_data['first_name'],
                    last_name=account_data['last_name'],
                    role=account_data['role'],
                    store=account_data['store'],
                    company_id=account_data['company_id'],
                    is_superuser=account_data['is_superuser'],
                    is_staff=account_data['is_staff'],
                    is_admin=account_data['is_admin'],
                    is_demo_user=account_data['is_demo_user'],
                )
                self.stdout.write(f'  ✓ Created {email} ({user.role} at {user.store.name})')
            
            # Ensure user has preferences
            UserPreferences.objects.get_or_create(user=user)

    def _seed_demo_data(self, demo_store):
        """Seed demo data (team members, tasks, tags) only in Demo Store."""
        self.stdout.write('\nSeeding demo data in Demo Store...')
        
        # Create 10 demo team members
        self._create_demo_team_members(demo_store)
        
        # Create departments
        self._create_departments(demo_store)
        
        # Create FOH task templates
        self._create_foh_tasks(demo_store)
        
        # Create kitchen checklist tasks
        self._create_kitchen_tasks(demo_store)
        
        # Create cleaning tasks
        self._create_cleaning_tasks(demo_store)
        
        # Create shift tags
        self._create_shift_tags(demo_store)

    def _create_demo_team_members(self, store):
        """Create 10 placeholder team members for the demo store."""
        demo_members = [
            {'first': 'Sarah', 'last': 'Johnson', 'role': 'team_member', 'shift': 'day'},
            {'first': 'Michael', 'last': 'Chen', 'role': 'team_member', 'shift': 'night'},
            {'first': 'Emily', 'last': 'Rodriguez', 'role': 'shift_lead', 'shift': 'day'},
            {'first': 'James', 'last': 'Williams', 'role': 'team_member', 'shift': 'flex'},
            {'first': 'Ashley', 'last': 'Davis', 'role': 'team_member', 'shift': 'day'},
            {'first': 'David', 'last': 'Martinez', 'role': 'shift_lead', 'shift': 'night'},
            {'first': 'Jessica', 'last': 'Brown', 'role': 'team_member', 'shift': 'flex'},
            {'first': 'Daniel', 'last': 'Garcia', 'role': 'team_member', 'shift': 'day'},
            {'first': 'Amanda', 'last': 'Wilson', 'role': 'team_member', 'shift': 'night'},
            {'first': 'Christopher', 'last': 'Taylor', 'role': 'team_member', 'shift': 'flex'},
        ]
        
        created_count = 0
        for idx, member in enumerate(demo_members, start=1):
            email = f"demo.{member['first'].lower()}.{member['last'].lower()}@cfademo.local"
            if not User.objects.filter(email=email).exists():
                User.objects.create_user(
                    username=f"demo{idx}",
                    email=email,
                    password='demo123',
                    first_name=member['first'],
                    last_name=member['last'],
                    role=member['role'],
                    shift_preference=member['shift'],
                    store=store,
                    company_id=store.store_number,
                    is_demo_user=True,
                )
                created_count += 1
        
        self.stdout.write(f'  ✓ Created {created_count} demo team members')

    def _create_departments(self, store):
        """Create departments for the store."""
        departments = [
            {'name': 'foh', 'display_name': 'Front of House', 'icon': '🏪'},
            {'name': 'kitchen', 'display_name': 'Kitchen', 'icon': '👨‍🍳'},
            {'name': 'management', 'display_name': 'Management', 'icon': '👔'},
        ]
        
        created_count = 0
        for dept_data in departments:
            _, created = Department.objects.get_or_create(
                store=store,
                name=dept_data['name'],
                defaults={
                    'display_name': dept_data['display_name'],
                    'icon': dept_data['icon'],
                }
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(f'  ✓ Created {created_count} departments')

    def _create_foh_tasks(self, store):
        """Create sample FOH task templates."""
        tasks = [
            {'shift': 'opening', 'text': 'Unlock doors and turn on lights', 'order': 1},
            {'shift': 'opening', 'text': 'Check restrooms and restock supplies', 'order': 2},
            {'shift': 'opening', 'text': 'Brew fresh tea and lemonade', 'order': 3},
            {'shift': 'transition', 'text': 'Wipe down all tables and chairs', 'order': 1},
            {'shift': 'transition', 'text': 'Refill condiment station', 'order': 2},
            {'shift': 'closing', 'text': 'Empty all trash cans', 'order': 1},
            {'shift': 'closing', 'text': 'Sweep and mop dining room', 'order': 2},
            {'shift': 'closing', 'text': 'Lock doors and set alarm', 'order': 3},
        ]
        
        created_count = 0
        for task_data in tasks:
            _, created = FOHTaskTemplate.objects.get_or_create(
                store=store,
                shift=task_data['shift'],
                text=task_data['text'],
                defaults={'order': task_data['order']}
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(f'  ✓ Created {created_count} FOH task templates')

    def _create_kitchen_tasks(self, store):
        """Create sample kitchen checklist tasks."""
        tasks = [
            {'shift': 'opening', 'text': 'Check fryer oil temperature', 'order': 1},
            {'shift': 'opening', 'text': 'Verify food temps in walk-in', 'order': 2},
            {'shift': 'opening', 'text': 'Prep chicken for the day', 'order': 3},
            {'shift': 'closing', 'text': 'Clean all prep surfaces', 'order': 1},
            {'shift': 'closing', 'text': 'Filter and clean fryers', 'order': 2},
            {'shift': 'closing', 'text': 'Complete waste log', 'order': 3},
        ]
        
        created_count = 0
        for task_data in tasks:
            _, created = KitchenChecklistTask.objects.get_or_create(
                store=store,
                shift=task_data['shift'],
                text=task_data['text'],
                defaults={'order': task_data['order']}
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(f'  ✓ Created {created_count} kitchen checklist tasks')

    def _create_cleaning_tasks(self, store):
        """Create sample cleaning tasks."""
        tasks = [
            {
                'scope': 'foh',
                'name': 'Clean beverage station',
                'frequency': 'daily',
                'order': 1,
            },
            {
                'scope': 'foh',
                'name': 'Sanitize high-touch surfaces',
                'frequency': 'daily',
                'order': 2,
            },
            {
                'scope': 'kitchen',
                'name': 'Deep clean grill',
                'frequency': 'weekly',
                'days': ['mon'],
                'order': 1,
            },
            {
                'scope': 'kitchen',
                'name': 'Clean hood vents',
                'frequency': 'weekly',
                'days': ['fri'],
                'order': 2,
            },
        ]
        
        created_count = 0
        for task_data in tasks:
            _, created = CleaningTask.objects.get_or_create(
                store=store,
                scope=task_data['scope'],
                name=task_data['name'],
                defaults={
                    'frequency': task_data['frequency'],
                    'days': task_data.get('days', []),
                    'order': task_data['order'],
                }
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(f'  ✓ Created {created_count} cleaning tasks')

    def _create_shift_tags(self, store):
        """Create shift summary tags (wins and challenges)."""
        tags = [
            {'kind': 'win', 'label': 'Great Teamwork', 'order': 1},
            {'kind': 'win', 'label': 'Fast Service', 'order': 2},
            {'kind': 'win', 'label': 'Guest Compliments', 'order': 3},
            {'kind': 'challenge', 'label': 'Equipment Issue', 'order': 1},
            {'kind': 'challenge', 'label': 'Short Staffed', 'order': 2},
            {'kind': 'challenge', 'label': 'Rush Period', 'order': 3},
        ]
        
        created_count = 0
        for tag_data in tags:
            _, created = ShiftTag.objects.get_or_create(
                store=store,
                kind=tag_data['kind'],
                label=tag_data['label'],
                defaults={'order': tag_data['order']}
            )
            if created:
                created_count += 1
        
        if created_count > 0:
            self.stdout.write(f'  ✓ Created {created_count} shift tags')

    def _print_login_info(self):
        """Print login credentials for all accounts."""
        self.stdout.write(self.style.SUCCESS('Login Credentials:'))
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Test Store (Clean Testing Data):'))
        self.stdout.write('  Superuser:    kellenbergercailer@gmail.com / admin123')
        self.stdout.write('  Test Admin:   testadmin@cfasattracker.com / testadmin123')
        self.stdout.write('  Test Member:  testmember@cfasattracker.com / testmember123')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('Demo Store (Full Demo Data):'))
        self.stdout.write('  Demo User:    demouser@gmail.com / demouser')
        self.stdout.write('  Demo Admin:   admin@gmail.com / admin')
        self.stdout.write('')
