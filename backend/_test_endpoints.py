"""
End-to-end backend smoke test — hits every major endpoint as three users
(superuser, manager, team_member) and reports pass/fail.

Run with:
    DATABASE_URL=sqlite:////tmp/cfa_test.sqlite3 DJANGO_DEBUG=true \
        python _test_endpoints.py
"""

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "myproject.settings")
import django
django.setup()

from django.test import Client
from api.models import User, FOHTaskTemplate, MenuItem

PASS = 0
FAIL = 0
WARN = 0
FAILS = []


def expect(label, ok, *, fail_msg=""):
    """Assert + report. Returns ok."""
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  ✓ {label}")
    else:
        FAIL += 1
        FAILS.append((label, fail_msg))
        print(f"  ✗ {label}  ←  {fail_msg}")
    return ok


def warn(label, msg):
    global WARN
    WARN += 1
    print(f"  ⚠ {label}  ←  {msg}")


def login(email, password):
    c = Client()
    r = c.post("/api/auth/login/", {"email": email, "password": password},
               content_type="application/json")
    if r.status_code != 200:
        print(f"  LOGIN FAILED for {email}: {r.status_code} {r.content[:200]}")
        return None
    return c


def hdr(s):
    print(f"\n{'=' * 70}\n{s}\n{'=' * 70}")


# ---------------------------------------------------------------------------
hdr("Login + /api/auth/me/")
# ---------------------------------------------------------------------------
super_c = login("cailer@test.local", "cailerpw")
expect("Superuser can log in", super_c is not None)
mgr_c = login("admin@gmail.com", "admin")
expect("Demo manager can log in", mgr_c is not None)
tm_c = login("demouser@gmail.com", "demouser")
expect("Demo team_member can log in", tm_c is not None)

bad = login("demouser@gmail.com", "wrong-password")
expect("Wrong password is rejected", bad is None)

if mgr_c:
    me = mgr_c.get("/api/auth/me/").json().get("user", {})
    expect("auth/me returns role", me.get("role") == "manager",
           fail_msg=f"got role={me.get('role')}")
    expect("auth/me returns store nested", me.get("store") is not None,
           fail_msg="store key missing")
    expect("auth/me returns initials", bool(me.get("initials")),
           fail_msg=f"initials={me.get('initials')!r}")


# ---------------------------------------------------------------------------
hdr("Phase 0 — Store + Preferences endpoints")
# ---------------------------------------------------------------------------
if mgr_c:
    r = mgr_c.get("/api/stores/me/")
    expect("GET /api/stores/me/ as manager (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")
    store = r.json()
    expect("Store has name + number",
           bool(store.get("name")) and bool(store.get("store_number")))
    expect("Store has nested settings", "settings" in store)

    # Manager can PATCH store
    r = mgr_c.patch("/api/stores/me/", {"name": "Test Store Renamed"},
                    content_type="application/json")
    expect("Manager can PATCH store name (200)", r.status_code == 200,
           fail_msg=f"{r.status_code} {r.content[:200]}")

if tm_c:
    r = tm_c.patch("/api/stores/me/", {"name": "Hacked"},
                   content_type="application/json")
    expect("Team member is blocked from PATCH store (403)", r.status_code == 403,
           fail_msg=f"{r.status_code}")

    r = tm_c.get("/api/users/me/preferences/")
    expect("Team member can GET own preferences (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")

    r = tm_c.patch("/api/users/me/preferences/",
                   {"dark_mode": True, "language": "spanish"},
                   content_type="application/json")
    expect("Team member can PATCH own preferences (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")
    # Verify it persisted
    r = tm_c.get("/api/users/me/preferences/")
    expect("Preferences PATCH persists",
           r.json().get("language") == "spanish",
           fail_msg=f"got {r.json()}")


# ---------------------------------------------------------------------------
hdr("Phase 1 — FOH Tasks")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/foh/tasks/?shift=opening")
    expect("FOH tasks list as team_member (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("FOH opening tasks seeded (>= 10)", len(rows) >= 10,
           fail_msg=f"got {len(rows)}")
    if rows:
        # Complete one
        task_id = rows[0]["id"]
        r = tm_c.post(f"/api/foh/tasks/{task_id}/complete/", {}, content_type="application/json")
        expect("Team member can COMPLETE FOH task (201)",
               r.status_code in (200, 201),
               fail_msg=f"{r.status_code} {r.content[:200]}")
        # Re-fetch and verify today_completion is set
        r2 = tm_c.get(f"/api/foh/tasks/?shift=opening")
        ts = r2.json()
        if isinstance(ts, dict):
            ts = ts.get("results", [])
        target = next((t for t in ts if t["id"] == task_id), None)
        expect("FOH task shows today_completion after complete",
               target and target.get("today_completion") is not None,
               fail_msg=f"today_completion={target and target.get('today_completion')}")

    r = tm_c.post("/api/foh/tasks/", {"shift": "opening", "text": "Sneaky"},
                  content_type="application/json")
    expect("Team member is BLOCKED from creating FOH task (403)",
           r.status_code == 403,
           fail_msg=f"{r.status_code}")

if mgr_c:
    r = mgr_c.post("/api/foh/tasks/", {"shift": "opening", "text": "Mgr created"},
                   content_type="application/json")
    expect("Manager can create FOH task (201)", r.status_code == 201,
           fail_msg=f"{r.status_code} {r.content[:200]}")
    r = mgr_c.get("/api/foh/tasks/history/?range=7d")
    expect("FOH history rollup (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")


# ---------------------------------------------------------------------------
hdr("Phase 1 — Shift Summary")
# ---------------------------------------------------------------------------
if mgr_c:
    r = mgr_c.patch("/api/shift-summaries/draft/today/",
                    {"recap": "Test recap", "rating": 4},
                    content_type="application/json")
    expect("Draft autosave PATCH (200 or 201)", r.status_code in (200, 201),
           fail_msg=f"{r.status_code} {r.content[:200]}")

    r = mgr_c.get("/api/shift-summaries/draft/today/")
    expect("Draft GET returns the saved draft",
           r.status_code == 200 and r.json().get("recap") == "Test recap",
           fail_msg=f"{r.status_code} {r.content[:200]}")

    r = mgr_c.get("/api/shift-summaries/tags/")
    expect("Shift tags catalog (200)", r.status_code == 200)
    tags = r.json()
    if isinstance(tags, dict):
        tags = tags.get("results", [])
    expect("Shift tags seeded (>= 10)", len(tags) >= 10,
           fail_msg=f"got {len(tags)}")


# ---------------------------------------------------------------------------
hdr("Phase 2 — Setup Sheets")
# ---------------------------------------------------------------------------
if mgr_c:
    r = mgr_c.get("/api/setup-sheets/templates/")
    expect("Setup templates list (200)", r.status_code == 200)
    templates = r.json()
    if isinstance(templates, dict):
        templates = templates.get("results", [])
    expect("Templates seeded (>= 4)", len(templates) >= 4,
           fail_msg=f"got {len(templates)}")

    r = mgr_c.get("/api/setup-sheets/")
    expect("Saved setups list (200)", r.status_code == 200)


# ---------------------------------------------------------------------------
hdr("Phase 3 — Cleaning")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/cleaning/tasks/?scope=foh")
    expect("Cleaning tasks (FOH) (200)", r.status_code == 200)
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("FOH cleaning tasks seeded (>= 5)", len(rows) >= 5,
           fail_msg=f"got {len(rows)}")

    r = tm_c.get("/api/cleaning/tasks/counts/?scope=foh")
    expect("Cleaning counts rollup (200)", r.status_code == 200)
    j = r.json()
    expect("Counts has daily/weekly/monthly/quarterly",
           all(k in j for k in ("daily", "weekly", "monthly", "quarterly")),
           fail_msg=f"keys={list(j.keys())}")


# ---------------------------------------------------------------------------
hdr("Phase 4 — Kitchen Dashboard + Waste")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/kitchen/summary/")
    expect("Kitchen summary (200)", r.status_code == 200)
    j = r.json()
    expect("Summary has progress + cards",
           "progress" in j and "cards" in j,
           fail_msg=f"keys={list(j.keys())}")

    r = tm_c.get("/api/kitchen/checklists/?shift=transition")
    expect("Kitchen checklists (200)", r.status_code == 200)

    r = tm_c.get("/api/kitchen/waste/menu-items/?meal=lunch")
    expect("Menu items by meal (200)", r.status_code == 200)
    items = r.json()
    if isinstance(items, dict):
        items = items.get("results", [])
    expect("11 lunch menu items seeded", len(items) >= 11,
           fail_msg=f"got {len(items)}")

    if items:
        r = tm_c.post("/api/kitchen/waste/entries/",
                      {"menu_item": items[0]["id"], "qty": 2},
                      content_type="application/json")
        expect("Team member can log waste entry (201)",
               r.status_code in (200, 201),
               fail_msg=f"{r.status_code} {r.content[:200]}")

    r = tm_c.get("/api/kitchen/waste/kpis/")
    expect("Waste KPIs (200)", r.status_code == 200)
    r = tm_c.get("/api/kitchen/waste/trend/?range=30d")
    expect("Waste trend (200)", r.status_code == 200)
    r = tm_c.get("/api/kitchen/waste/top-items/?range=30d")
    expect("Waste top items (200)", r.status_code == 200)


# ---------------------------------------------------------------------------
hdr("Phase 5 — Equipment + Food Safety")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/kitchen/equipment/categories/")
    expect("Equipment categories (200)", r.status_code == 200)
    cats = r.json()
    if isinstance(cats, dict):
        cats = cats.get("results", [])
    expect("8 equipment categories seeded", len(cats) >= 8,
           fail_msg=f"got {len(cats)}")

    r = tm_c.get("/api/kitchen/equipment/?category=cooking")
    expect("Equipment list by category (200)", r.status_code == 200)
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("Cooking equipment seeded (>= 4)", len(rows) >= 4,
           fail_msg=f"got {len(rows)}")

    r = tm_c.get("/api/kitchen/food-safety/tasks/?daypart=morning")
    expect("Food safety tasks (200)", r.status_code == 200)
    r = tm_c.get("/api/kitchen/food-safety/temperature-targets/")
    expect("Temperature targets (200)", r.status_code == 200)


# ---------------------------------------------------------------------------
hdr("Phase 6 — Team domain")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/team/members/?status=active")
    expect("Team members list (200)", r.status_code == 200,
           fail_msg=f"{r.status_code} {r.content[:200]}")
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    # seed_sample_team_members is currently disabled in seed_data.py (the
    # 10 demo placeholders are pending the demo/test-store split). So we
    # expect just the seeded auth users for now.
    expect("Team roster includes seeded auth users (>= 3)", len(rows) >= 3,
           fail_msg=f"got {len(rows)}")

    r = tm_c.get("/api/team/stats/")
    expect("Team stats (200)", r.status_code == 200)
    r = tm_c.get("/api/team/documentation/stats/")
    expect("Documentation stats (200)", r.status_code == 200)
    r = tm_c.get("/api/training/stats/")
    expect("Training stats (200)", r.status_code == 200)
    r = tm_c.get("/api/team/quick-links/")
    expect("Quick links list (200)", r.status_code == 200)
    links = r.json()
    if isinstance(links, dict):
        links = links.get("results", [])
    expect("4 quick links seeded", len(links) >= 4,
           fail_msg=f"got {len(links)}")


# ---------------------------------------------------------------------------
hdr("Phase 7 — Leadership 360 + Development")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/leadership/360/templates/")
    expect("360 templates (200)", r.status_code == 200,
           fail_msg=f"{r.status_code}")
    r = tm_c.get("/api/leadership/360/")
    expect("360 evaluations list (200)", r.status_code == 200)
    r = tm_c.get("/api/leadership/areas/")
    expect("Leadership areas list (200)", r.status_code == 200)
    r = tm_c.get("/api/leadership/notes/")
    expect("Leadership notes list (200)", r.status_code == 200)
    r = tm_c.get("/api/team-development/tracks/")
    expect("Position tracks list (200)", r.status_code == 200)
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("Position tracks seeded (>= 4)", len(rows) >= 4,
           fail_msg=f"got {len(rows)}")


# ---------------------------------------------------------------------------
hdr("Phase 8 — Calendar, Guest Recovery, Vendors, Chat, Surveys")
# ---------------------------------------------------------------------------
if tm_c:
    for url, label in [
        ("/api/calendar/", "Calendar events list"),
        ("/api/guest-complaints/", "Guest complaints list"),
        ("/api/vendors/", "Vendors list"),
        ("/api/chat/channels/", "Chat channels list"),
        ("/api/surveys/", "Surveys list"),
    ]:
        r = tm_c.get(url)
        expect(f"{label} (200)", r.status_code == 200,
               fail_msg=f"{url} → {r.status_code}")


# ---------------------------------------------------------------------------
hdr("Phase 9 — Notifications + Weekly Digest + Dashboard insights")
# ---------------------------------------------------------------------------
if tm_c:
    r = tm_c.get("/api/notifications/")
    expect("Notifications list (200)", r.status_code == 200)
    r = tm_c.get("/api/notifications/unread-count/")
    expect("Notifications unread-count (200)", r.status_code == 200)
    r = tm_c.get("/api/weekly-digest/")
    expect("Weekly digest (200)", r.status_code == 200)
    r = tm_c.get("/api/dashboard/insights/catalog/")
    expect("Dashboard insights catalog (200)", r.status_code == 200)
    r = tm_c.get("/api/dashboard/insights/values/?ids=foh-tasks,documentation")
    expect("Dashboard insights values (200)", r.status_code == 200)


# ---------------------------------------------------------------------------
hdr("Multi-tenant isolation")
# ---------------------------------------------------------------------------
# Create a 2nd store + user; confirm that user CAN'T see the demo store's data.
from api.models import Store, User as UserModel
isolated_store = Store.objects.create(
    store_number="99999",
    name="Isolated Test Store",
)
isolated_u = UserModel.objects.create_user(
    username="isolated", email="isolated@test.local", password="pw",
    first_name="Iso", last_name="Lated", role="manager",
    store=isolated_store, company_id="99999",
)
iso_c = login("isolated@test.local", "pw")
if iso_c:
    r = iso_c.get("/api/foh/tasks/?shift=opening")
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("Isolated store user sees ZERO FOH tasks from demo store",
           len(rows) == 0,
           fail_msg=f"leaked {len(rows)} tasks")

    r = iso_c.get("/api/team/members/")
    rows = r.json()
    if isinstance(rows, dict):
        rows = rows.get("results", [])
    expect("Isolated store sees only its own 1 user",
           len(rows) == 1,
           fail_msg=f"got {len(rows)}")


# ---------------------------------------------------------------------------
hdr("Summary")
# ---------------------------------------------------------------------------
print(f"PASS: {PASS}")
print(f"FAIL: {FAIL}")
print(f"WARN: {WARN}")
if FAIL:
    print("\nFAILURES:")
    for label, msg in FAILS:
        print(f"  - {label}: {msg}")
    sys.exit(1)
print("\nAll backend checks passed.")
