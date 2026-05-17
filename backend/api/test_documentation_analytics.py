"""
Regression tests for the Documentation Analytics endpoint.

Covers the three invariants the analytics view promises:
1. Store scoping — a manager's totals only count users in their own store.
2. Risk classification — the 7-bucket classifier correctly buckets users
   based on their record kinds and titles.
3. KPI math — total_employees / with_incidents / total_incidents /
   need_attention are computed off the active roster, not the global table.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from .models import EmployeeRecord, Store, User


URL = "/api/team/documentation/analytics/"


class DocumentationAnalyticsTest(TestCase):
    """One store, several users in different risk states + one outsider."""

    def setUp(self):
        self.store = Store.objects.create(
            name="Test Store", store_number="00091",
        )
        self.other_store = Store.objects.create(
            name="Other Store", store_number="00092",
        )
        self.manager = User.objects.create_user(
            username="mgr@test.com", email="mgr@test.com",
            password="pw", role="manager", store=self.store,
        )

        # Five team members in this store, each in a different risk bucket.
        # We classify based on their records below.
        self.clean = User.objects.create_user(  # none
            username="clean@test.com", email="clean@test.com",
            password="pw", role="team_member", store=self.store,
        )
        self.low = User.objects.create_user(   # low — admin only
            username="low@test.com", email="low@test.com",
            password="pw", role="team_member", store=self.store,
        )
        self.medium = User.objects.create_user(  # medium — 2 warnings
            username="med@test.com", email="med@test.com",
            password="pw", role="team_member", store=self.store,
        )
        self.critical = User.objects.create_user(  # critical — has PIP
            username="crit@test.com", email="crit@test.com",
            password="pw", role="team_member", store=self.store,
        )
        self.final = User.objects.create_user(  # final_warning — title match
            username="final@test.com", email="final@test.com",
            password="pw", role="team_member", store=self.store,
        )

        # Outsider in a different store — must NEVER show up in the manager's
        # analytics rollup.
        self.outsider = User.objects.create_user(
            username="out@test.com", email="out@test.com",
            password="pw", role="team_member", store=self.other_store,
        )

        # Inactive user — counted neither in totals nor in distribution.
        self.inactive = User.objects.create_user(
            username="inactive@test.com", email="inactive@test.com",
            password="pw", role="team_member", store=self.store,
            is_active=False,
        )

        # ---- Records ---------------------------------------------------
        # Low: one admin note.
        EmployeeRecord.objects.create(
            store=self.store, user=self.low, recorded_by=self.manager,
            kind="admin", title="Late arrival",
        )
        # Medium: two warnings.
        EmployeeRecord.objects.create(
            store=self.store, user=self.medium, recorded_by=self.manager,
            kind="warning", title="Tardiness",
        )
        EmployeeRecord.objects.create(
            store=self.store, user=self.medium, recorded_by=self.manager,
            kind="warning", title="Tardiness #2",
        )
        # Critical: PIP.
        EmployeeRecord.objects.create(
            store=self.store, user=self.critical, recorded_by=self.manager,
            kind="pip", title="Performance Improvement Plan",
        )
        # Final warning: title-based match.
        EmployeeRecord.objects.create(
            store=self.store, user=self.final, recorded_by=self.manager,
            kind="warning", title="Final Warning — last chance",
        )
        # Outsider gets a PIP that should be invisible to the manager.
        EmployeeRecord.objects.create(
            store=self.other_store, user=self.outsider, recorded_by=None,
            kind="pip", title="Performance Improvement Plan",
        )

    # ------------------------------------------------------------------

    def _fetch(self, as_user):
        client = APIClient()
        client.force_authenticate(user=as_user)
        res = client.get(URL)
        self.assertEqual(res.status_code, 200, res.content)
        return res.json()

    def test_totals_are_store_scoped(self):
        """Totals only count active users in the manager's store."""
        body = self._fetch(self.manager)
        t = body["totals"]
        # 1 manager + 5 active team members (excludes the inactive user
        # AND the outsider).
        self.assertEqual(t["total_employees"], 6)
        # Only members with disciplinary records (warnings/PIPs):
        # medium (2), critical (1), final (1) = 3 employees, 4 incidents.
        # Low has admin only — doesn't count as an incident.
        self.assertEqual(t["employees_with_incidents"], 3)
        self.assertEqual(t["total_incidents"], 4)
        # Need attention = medium/high/critical/excessive/final_warning.
        self.assertEqual(t["need_attention"], 3)

    def test_outsider_is_invisible(self):
        """The outsider's PIP must never appear in the manager's distribution."""
        body = self._fetch(self.manager)
        # 6 buckets sum to total_employees. Outsider would push to 7.
        total = sum(b["count"] for b in body["risk_distribution"])
        self.assertEqual(total, 6)
        names = [e["name"] for e in body["employees"]]
        self.assertNotIn(self.outsider.first_name + " " + self.outsider.last_name, names)

    def test_risk_distribution_buckets(self):
        """Each risk bucket reports the right count + percentage."""
        body = self._fetch(self.manager)
        dist = {b["key"]: b for b in body["risk_distribution"]}
        # Keys present and in the documented order.
        self.assertEqual(
            [b["key"] for b in body["risk_distribution"]],
            ["final_warning", "excessive", "critical", "high",
             "medium", "low", "none"],
        )
        self.assertEqual(dist["final_warning"]["count"], 1)
        self.assertEqual(dist["critical"]["count"], 1)
        self.assertEqual(dist["medium"]["count"], 1)
        self.assertEqual(dist["low"]["count"], 1)
        # `clean` user + `manager` (manager has no records) = 2 in "none".
        self.assertEqual(dist["none"]["count"], 2)
        # Percentage math: 2/6 = 33.3% for "none".
        self.assertAlmostEqual(dist["none"]["percentage"], 33.3, places=1)

    def test_employees_sorted_most_severe_first(self):
        """The employees list is ordered by risk severity, most-severe first."""
        body = self._fetch(self.manager)
        risks = [e["risk_level"] for e in body["employees"]]
        # Final → critical → medium → low → none (×2).
        self.assertEqual(
            risks,
            ["final_warning", "critical", "medium", "low", "none", "none"],
        )

    def test_inactive_user_excluded(self):
        """Inactive users do not appear and do not bloat totals."""
        body = self._fetch(self.manager)
        names = [e["name"] for e in body["employees"]]
        # Inactive user has no first/last name in fixture → would render as
        # their email. Either way, the count math is the real assertion.
        self.assertEqual(body["totals"]["total_employees"], 6)
        # Just double-check no entry has the inactive user's email.
        self.assertNotIn("inactive@test.com", names)

    def test_unauthenticated_blocked(self):
        client = APIClient()
        res = client.get(URL)
        self.assertIn(res.status_code, (401, 403))
