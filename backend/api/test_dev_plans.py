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

from .models import LessonCompletion, Store, User, UserDevelopmentPlan


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


class TeamProgressTest(_DevPlanTestMixin, TestCase):
    """Manager/admin "Team Progress" endpoint visibility rules.

    The endpoint must:
    - Return 403 for team members (no subordinates).
    - Show only users strictly BELOW the requester in role rank.
    - Always be store-scoped (no cross-store leaks).
    - Never include the requester's own enrollment.
    - Never include superusers (even if a role matches).
    """
    URL = '/api/leadership/development-plans/team_progress/'

    def setUp(self):
        super().setUp()
        # Add a director and an admin in the same store, plus a manager peer
        # (same rank as self.manager — must NOT be visible to self.manager).
        self.director = User.objects.create_user(
            username='dir@test.com', email='dir@test.com',
            password='pw', role='director', store=self.store,
        )
        self.admin = User.objects.create_user(
            username='admin@test.com', email='admin@test.com',
            password='pw', role='admin', store=self.store,
        )
        self.peer_manager = User.objects.create_user(
            username='peer@test.com', email='peer@test.com',
            password='pw', role='manager', store=self.store,
        )
        # Outsider (different store) — also has an enrollment to verify the
        # store guard.
        UserDevelopmentPlan.objects.create(
            user=self.outsider, plan_key='heart-of-leadership',
            total_steps=19, status='active',
        )
        # Subordinate enrollments for the manager/director/admin to see.
        UserDevelopmentPlan.objects.create(
            user=self.member_a, plan_key='heart-of-leadership',
            total_steps=19, status='active',
        )
        UserDevelopmentPlan.objects.create(
            user=self.member_b, plan_key='heart-of-leadership',
            total_steps=19, status='paused',
        )

    def _list(self, user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c.get(self.URL)

    def test_team_member_gets_403(self):
        """A team member has no subordinates → 403."""
        res = self._list(self.member_a)
        self.assertEqual(res.status_code, 403)

    def test_manager_sees_team_members_only(self):
        """A manager sees the two team_member enrollments but NOT their
        peer manager (same rank), the director (above), the admin (above),
        or the outsider (different store)."""
        res = self._list(self.manager)
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()['results']
        user_ids = sorted(r['user'] for r in rows)
        self.assertEqual(user_ids, sorted([self.member_a.id, self.member_b.id]))

    def test_director_sees_managers_and_below(self):
        """Director sees the manager + peer_manager + both team_members,
        but NOT admin (above) and NOT the outsider."""
        res = self._list(self.director)
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()['results']
        # The manager + peer_manager have NO enrollments yet, so they don't
        # show up. Only the two team-member enrollments do.
        user_ids = sorted(r['user'] for r in rows)
        self.assertEqual(user_ids, sorted([self.member_a.id, self.member_b.id]))
        # And confirm cross-store outsider was excluded.
        self.assertNotIn(self.outsider.id, user_ids)

    def test_admin_does_not_see_other_admins_or_outsider(self):
        """Admin sees director + below, never another admin, never cross-store."""
        # Give the director an enrollment so we can assert it appears.
        UserDevelopmentPlan.objects.create(
            user=self.director, plan_key='heart-of-leadership',
            total_steps=19, status='active',
        )
        res = self._list(self.admin)
        self.assertEqual(res.status_code, 200, res.content)
        rows = res.json()['results']
        user_ids = sorted(r['user'] for r in rows)
        self.assertIn(self.director.id, user_ids)
        self.assertIn(self.member_a.id, user_ids)
        self.assertIn(self.member_b.id, user_ids)
        self.assertNotIn(self.admin.id, user_ids)
        self.assertNotIn(self.outsider.id, user_ids)

    def test_payload_includes_user_name_and_progress(self):
        """The serializer fields must round-trip so the UI can render
        '<name> · <plan> · <pct>%' without a second request."""
        res = self._list(self.manager)
        rows = res.json()['results']
        self.assertGreaterEqual(len(rows), 1)
        first = rows[0]
        for key in ('user', 'user_name', 'plan_key', 'status',
                    'progress_percent', 'completed_lesson_keys'):
            self.assertIn(key, first, f'missing field: {key}')


class LessonCompletionIsolationTest(_DevPlanTestMixin, TestCase):
    """Lesson keys ('01', '02', ...) are deliberately NOT plan-namespaced
    in the frontend catalog. The backend MUST therefore honor the
    `?enrollment=` query param so the detail page never sees completions
    that belong to another enrollment owned by the same user.

    Reproduces the bug: pause Plan A (with lessons 01/02/03 completed),
    open Plan B → top three lessons appeared completed in Plan B's UI
    because the lesson_key map collided.
    """
    URL = '/api/leadership/lesson-completions/'

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(user=self.member_a)
        # Plan A — paused, with completions on lessons 01/02/03.
        self.plan_a = UserDevelopmentPlan.objects.create(
            user=self.member_a, plan_key='heart-of-leadership',
            total_steps=19, status='paused', current_step=3,
        )
        for lesson_key in ('01', '02', '03'):
            LessonCompletion.objects.create(
                enrollment=self.plan_a, lesson_key=lesson_key,
            )
        # Plan B — active, brand-new, NO completions of its own.
        self.plan_b = UserDevelopmentPlan.objects.create(
            user=self.member_a, plan_key='restaurant-culture-builder',
            total_steps=19, status='active', current_step=0,
        )

    def _completions_for(self, enrollment_id):
        res = self.client.get(self.URL, {'enrollment': enrollment_id})
        self.assertEqual(res.status_code, 200, res.content)
        body = res.json()
        return body.get('results') if isinstance(body, dict) else body

    def test_enrollment_filter_scopes_completions(self):
        """Plan B has zero completions of its own. Querying with
        ?enrollment=<plan_b.id> must return [] — NOT plan A's three rows."""
        rows = self._completions_for(self.plan_b.id)
        self.assertEqual(rows, [], 'plan B leaked plan A completions')

        # And Plan A still returns its own three rows.
        rows_a = self._completions_for(self.plan_a.id)
        self.assertEqual(len(rows_a), 3)
        self.assertEqual(
            sorted(r['lesson_key'] for r in rows_a),
            ['01', '02', '03'],
        )

    def test_no_enrollment_filter_returns_all_for_user(self):
        """Without the query param the endpoint still returns every
        completion owned by the requester — that's the manager-style
        per-user view used elsewhere."""
        res = self.client.get(self.URL)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        rows = body.get('results') if isinstance(body, dict) else body
        self.assertEqual(len(rows), 3)

    def test_completions_for_another_users_enrollment_are_invisible(self):
        """Hardening: even if member_a forges plan_b.id of another user,
        the per-user filter still hides it."""
        plan_other = UserDevelopmentPlan.objects.create(
            user=self.member_b, plan_key='heart-of-leadership',
            total_steps=19, status='active',
        )
        LessonCompletion.objects.create(
            enrollment=plan_other, lesson_key='01',
        )
        rows = self._completions_for(plan_other.id)
        self.assertEqual(rows, [])
