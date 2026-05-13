#!/usr/bin/env python
"""
Script to create demo users for CFA SAT Tracker
Run this with: python manage.py shell < create_demo_users.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
django.setup()

from api.models import User

# Create demo users
demo_users = [
    {
        'username': 'demouser',
        'email': 'demouser@gmail.com',
        'password': 'demouser',
        'first_name': 'Demo',
        'last_name': 'User',
        'role': 'team_member',
        'company_id': '02203',
        'is_demo_user': True
    },
    {
        'username': 'admin',
        'email': 'admin@gmail.com',
        'password': 'admin',
        'first_name': 'Store',
        'last_name': 'Manager',
        'role': 'manager',
        'company_id': '02203',
        'is_demo_user': True
    },
    {
        'username': 'storemanager',
        'email': 'store@cfasattracker.com',
        'password': 'password123',
        'first_name': 'Store',
        'last_name': 'Manager',
        'role': 'manager',
        'company_id': '02203',
        'is_demo_user': False
    }
]

print("Creating demo users...")

for user_data in demo_users:
    # Check if user already exists
    if User.objects.filter(email=user_data['email']).exists():
        print(f"User {user_data['email']} already exists, skipping...")
        continue
    
    # Create user
    user = User.objects.create_user(
        username=user_data['username'],
        email=user_data['email'],
        password=user_data['password'],
        first_name=user_data['first_name'],
        last_name=user_data['last_name'],
        role=user_data['role'],
        company_id=user_data['company_id'],
        is_demo_user=user_data['is_demo_user']
    )
    
    print(f"Created user: {user.email} ({user.first_name} {user.last_name})")

print("Demo users creation completed!")
print("\nLogin credentials:")
print("Team Member: demouser@gmail.com / demouser")
print("Store Manager: admin@gmail.com / admin")
print("Manager: store@cfasattracker.com / password123")
