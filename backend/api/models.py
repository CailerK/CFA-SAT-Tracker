from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone

# User System - Based on captured LD Growth data
class User(AbstractUser):
    """Custom user model matching LD Growth structure"""
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    company_id = models.CharField(max_length=10, default='00727')  # LD Growth #00727
    role = models.CharField(max_length=50, default='team_member')
    is_demo_user = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

class UserProfile(models.Model):
    """Extended user profile data"""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    bio = models.TextField(blank=True)
    preferences = models.JSONField(default=dict)
    notification_settings = models.JSONField(default=dict)
    dashboard_customization = models.JSONField(default=dict)

# Team System - Restaurant/Hospitality Structure
class Department(models.Model):
    """Restaurant departments (FOH, Kitchen, etc.)"""
    DEPARTMENT_CHOICES = [
        ('foh', 'Front of House'),
        ('kitchen', 'Kitchen'),
        ('management', 'Management'),
        ('facilities', 'Facilities'),
        ('catering', 'Catering'),
    ]
    
    name = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50)  # Emoji or icon class
    created_at = models.DateTimeField(auto_now_add=True)

class Team(models.Model):
    """Team/Restaurant location"""
    name = models.CharField(max_length=100)
    company_id = models.CharField(max_length=10)  # e.g., "00727"
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class TeamMember(models.Model):
    """Team membership with roles"""
    ROLE_CHOICES = [
        ('team_member', 'Team Member'),
        ('shift_leader', 'Shift Leader'),
        ('manager', 'Manager'),
        ('director', 'Director'),
    ]
    
    team = models.ForeignKey(Team, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    joined_at = models.DateTimeField(auto_now_add=True)

# Leadership Development System - Heart of Leadership
class LeadershipModule(models.Model):
    """Leadership development modules"""
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class LeadershipActivity(models.Model):
    """Individual activities within modules"""
    module = models.ForeignKey(LeadershipModule, on_delete=models.CASCADE, related_name='activities')
    title = models.CharField(max_length=200)
    activity_number = models.IntegerField()
    content = models.TextField()
    instructions = models.TextField()
    estimated_duration = models.IntegerField(help_text="Duration in minutes")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

class UserLeadershipProgress(models.Model):
    """Track user progress through leadership development"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    module = models.ForeignKey(LeadershipModule, on_delete=models.CASCADE)
    activity = models.ForeignKey(LeadershipActivity, on_delete=models.CASCADE, null=True, blank=True)
    progress_percentage = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

# Performance & Analytics System
class Evaluation(models.Model):
    """Performance evaluations"""
    EVALUATION_TYPES = [
        ('360', '360 Evaluation'),
        ('performance', 'Performance Review'),
        ('skill_assessment', 'Skill Assessment'),
    ]
    
    evaluatee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations_received')
    evaluator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='evaluations_given')
    evaluation_type = models.CharField(max_length=50, choices=EVALUATION_TYPES)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    period_start = models.DateField()
    period_end = models.DateField()

class PerformanceMetric(models.Model):
    """Performance metrics for analytics"""
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    metric_name = models.CharField(max_length=100)
    metric_value = models.DecimalField(max_digits=10, decimal_places=2)
    date_recorded = models.DateField()
    shift_type = models.CharField(max_length=20, choices=[('day', 'Day'), ('night', 'Night')])

# Task & Operations System
class TaskCategory(models.Model):
    """Task categories (FOH Tasks, Kitchen, Cleaning, etc.)"""
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    icon = models.CharField(max_length=50)
    color = models.CharField(max_length=7, default='#E51636')  # LD Growth primary color

class Task(models.Model):
    """Daily tasks and checklists"""
    TASK_STATUS = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(TaskCategory, on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='pending')
    priority = models.CharField(max_length=20, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')])
    due_date = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

# Document Management System
class Document(models.Model):
    """Document library"""
    DOCUMENT_TYPES = [
        ('policy', 'Policy'),
        ('procedure', 'Procedure'),
        ('training', 'Training Material'),
        ('form', 'Form'),
        ('report', 'Report'),
    ]
    
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file = models.FileField(upload_to='documents/')
    description = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True)
    uploaded_by = models.ForeignKey(User, on_delete=models.CASCADE)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

# Setup Sheets & Scheduling
class SetupSheet(models.Model):
    """Setup sheets for restaurant operations"""
    name = models.CharField(max_length=100)
    department = models.ForeignKey(Department, on_delete=models.CASCADE)
    schedule_date = models.DateField()
    shift_type = models.CharField(max_length=20, choices=[('opening', 'Opening'), ('closing', 'Closing'), ('mid', 'Mid')])
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    is_template = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

class SetupTask(models.Model):
    """Individual tasks within setup sheets"""
    setup_sheet = models.ForeignKey(SetupSheet, on_delete=models.CASCADE, related_name='tasks')
    task_name = models.CharField(max_length=200)
    assigned_to = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    estimated_time = models.IntegerField(help_text="Time in minutes")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

# Notifications System
class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = [
        ('task_assigned', 'Task Assigned'),
        ('evaluation_due', 'Evaluation Due'),
        ('training_reminder', 'Training Reminder'),
        ('system_update', 'System Update'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    action_url = models.URLField(blank=True)
