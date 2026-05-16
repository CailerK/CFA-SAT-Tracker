"""
Regression tests for the Leadership Development Plans endpoints.

Confirms the two invariants the user has flagged:
1. Per-user isolation — User A's enrollments must NEVER appear in User B's
   `/api/leadership/development-plans/` list, even if they share a store.
2. Manager assignment — a manager can create an enrollment for another user
   in the same store; non-managers cannot. Same-store guard holds.
"""

from datetime import date, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Store, User, UserDevelopmentPlan


class _DevPlanTestMixin:
    """Shared setUp: one store, three users (manager, member A, member B)."""

    def setUp(self):
        self.store = Store.objects.create(
            name='Test Store', store_number='00099',
        )
        self.other_store = Store.objects.create(
            name='Other Store', store_number='00100',
        )
        self.manager = User.objects.create_user(
            username='mgr@test.com', email='mgr@test.com',
            password='pw', role='manager', store=self.store,
        )
        self.member_a = User.objects.create_user(
            username='alice@test.com', email='alice@test.com',
            password='pw', role='team_member', store=self.store,
        )
        self.member_b = User.objects.create_user(
            username='bob@test.com', email='bob@test.com',
            password='pw', role='team_member', store=self.store,
        )
        self.outsider = User.objects.create_user(
            username='outsider@test.com', email='outsider@test.com',
            password='pw', role='team_member', store=self.other_store,
        )


class DevelopmentPlanIsolationTest(_DevPlanTestMixin, TestCase):
    def test_list_is_filtered_to_requesting_user(self):
        """A user's GET /api/leadership/development-plans/ must never include
        enrollments belonging to a different user."""
        UserDevelopmentPlan.objects.create(
            user=self.member_a, plan_key='heart-of-leadership',
            total_steps=19, status='active',
        )
        client = APIClient()
        client.force_authenticate(user=self.member_b)
        res = client.get('/api/leadership/development-plans/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        rows = data['results'] if isinstance(data, dict) and 'results' in data else data
        self.assertEqual(
            len(rows), 0,
            f"User B should see 0 plans but got: {rows}",
        )

    def test_list_includes_own_assigned_plan(self):
        """When a manager assigns a plan to member A, member A sees it on
        their list — member B still does not."""
        UserDevelopmentPlan.objects.create(
            user=self.member_a, plan_key='heart-of-leadership',
            total_steps=19, status='active', assigned_by=self.manager,
        )
        client = APIClient()
        client.force_authenticate(user=self.member_a)
        res = client.get('/api/leadership/development-plans/')
        body = res.json()
        rows = body['results'] if isinstance(body, dict) and 'results' in body else body
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['plan_key'], 'heart-of-leadership')
        self.assertEqual(rows[0]['assigned_by_name'].lower()[:3], 'mgr')

        client.force_authenticate(user=self.member_b)
        res = client.get('/api/leadership/development-plans/')
        body = res.json()
        rows = body['results'] if isinstance(body, dict) and 'results' in body else body
        self.assertEqual(len(rows), 0)


class DevelopmentPlanAssignmentTest(_DevPlanTestMixin, TestCase):
    URL = '/api/leadership/development-plans/'

    def test_non_manager_cannot_assign_to_another_user(self):
        """A team member POSTing with user=<someone else> is rejected."""
        client = APIClient()
        client.force_authenticate(user=self.member_a)
        res = client.post(self.URL, {
            'user': self.member_b.id,
            'plan_key': 'heart-of-leadership',
            'total_steps': 19,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        # Make sure no row was created for either user
        self.assertEqual(UserDevelopmentPlan.objects.count(), 0)

    def test_manager_can_assign_to_member_in_same_store(self):
        client = APIClient()
        client.force_authenticate(user=self.manager)
        res = client.post(self.URL, {
            'user': self.member_a.id,
            'plan_key': 'heart-of-leadership',
            'total_steps': 19,
            'deadline': (date.today() + timedelta(days=30)).isoformat(),
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        row = UserDevelopmentPlan.objects.get(user=self.member_a)
        self.assertEqual(row.assigned_by_id, self.manager.id)
        self.assertIsNotNone(row.deadline)
        # Manager's own list must still be empty — assignment goes TO the
        # member, not to the manager.
        res = client.get(self.URL)
        body = res.json()
        rows = body['results'] if isinstance(body, dict) and 'results' in body else body
        self.assertEqual(len(rows), 0)

    def test_manager_cannot_assign_to_member_in_other_store(self):
        client = APIClient()
        client.force_authenticate(user=self.manager)
        res = client.post(self.URL, {
            'user': self.outsider.id,
            'plan_key': 'heart-of-leadership',
            'total_steps': 19,
        }, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(UserDevelopmentPlan.objects.count(), 0)

    def test_self_start_with_no_user_field_targets_requester(self):
        """When no `user` is supplied, the enrollment is created for the
        requester — the default self-start flow."""
        client = APIClient()
        client.force_authenticate(user=self.member_a)
        res = client.post(self.URL, {
            'plan_key': 'heart-of-leadership',
            'total_steps': 19,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.content)
        row = UserDevelopmentPlan.objects.get()
        self.assertEqual(row.user_id, self.member_a.id)
        self.assertIsNone(row.assigned_by_id)
