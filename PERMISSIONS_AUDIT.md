# Permissions audit — 2026-05-17

Full role × resource matrix for the app. Read this **before** adding new
endpoints, components, or sensitive data, so the new code follows the
existing tier conventions and you don't accidentally leak admin data.

---

## 1. The four roles

| Role | What they are | Backend test |
|---|---|---|
| **Team Member** | Default. Sees their own data + everyone's operational/task data. | `not is_manager_or_above(user)` |
| **Manager-tier** | Manager, Shift Lead, Director, Admin (role names). Runs the floor + handles operations. | `is_manager_or_above(user)` |
| **Admin** | `role='admin'` OR `user.is_admin=True`. Owns store configuration + sensitive HR docs. | `is_admin_or_above(user)` |
| **Superuser** | Django `is_superuser=True`. Cross-store, full bypass. | `user.is_superuser` |

Note: "Director" and "Admin" both sit in `MANAGER_ROLES`; `is_admin_or_above`
is stricter and checks for the admin role / flag / superuser.

Frontend helpers (`frontend/src/utils/access.js`):
- `isManagerOrAbove(user)` — for manager-tier UI gates
- `isAdminOrAbove(user)` — for admin-tier UI gates (Operator Overview, etc.)

---

## 2. Per-viewset permission matrix

Symbols: ✓ = full access · 👁️ = read only · 🚫 = blocked (403) · *own* = only their own rows

| Endpoint | Team Member | Manager+ | Admin | Superuser |
|---|---|---|---|---|
| `GET /api/auth/me/` | ✓ | ✓ | ✓ | ✓ |
| `POST /api/auth/login/` | ✓ | ✓ | ✓ | ✓ |
| **FOH / Operations** | | | | |
| `/foh/tasks/` | 👁️ | ✓ | ✓ | ✓ |
| `/foh/tasks/:id/complete/` | ✓ | ✓ | ✓ | ✓ |
| `/cleaning/tasks/` (FOH+Kitchen) | 👁️ | ✓ | ✓ | ✓ |
| `/cleaning/tasks/:id/complete/` | ✓ | ✓ | ✓ | ✓ |
| `/kitchen/checklists/` | 👁️ | ✓ | ✓ | ✓ |
| `/kitchen/checklists/:id/complete/` | ✓ | ✓ | ✓ | ✓ |
| `/kitchen/food-safety/tasks/` | 👁️ | ✓ | ✓ | ✓ |
| `/kitchen/equipment/categories/` | 👁️ | ✓ | ✓ | ✓ |
| `/kitchen/equipment/` | 👁️ | ✓ | ✓ | ✓ |
| `/kitchen/waste/menu-items/` | 👁️ | ✓ | ✓ | ✓ |
| `/kitchen/waste/entries/` | ✓ | ✓ | ✓ | ✓ (logging is open) |
| `/setup-sheets/templates/` | 👁️ | ✓ | ✓ | ✓ |
| `/setup-sheets/` | ✓ (own drafts) | ✓ | ✓ | ✓ |
| `/shift-summaries/` | ✓ (own) | ✓ (all in store) | ✓ | ✓ |
| `/shift-summaries/tags/` | 👁️ | ✓ | ✓ | ✓ |
| **Team Domain** | | | | |
| `/team/members/` | 👁️ | ✓ | ✓ | ✓ |
| `/team/documentation/records/` (HR docs) | 🚫 | ✓ | ✓ | ✓ |
| `/team/quick-links/` | 👁️ | ✓ | ✓ | ✓ |
| `/training/plans/` | 👁️ | ✓ | ✓ | ✓ |
| `/training/trainees/` | 👁️ *own* | ✓ | ✓ | ✓ |
| **Leadership / Development** | | | | |
| `/leadership/areas/` | ✓ (own) | ✓ (own) | ✓ | ✓ |
| `/leadership/notes/` | ✓ (own) | ✓ (own) | ✓ | ✓ |
| `/leadership/development-plans/` (enrollment) | ✓ (own only) | 👁️ team progress, NO assignment | ✓ assign | ✓ |
| `/leadership/360/templates/` | 👁️ | ✓ | ✓ | ✓ |
| `/leadership/360/` | 👁️ (assigned to them) | ✓ | ✓ | ✓ |
| `/leadership/lesson-completions/` | ✓ (own) | ✓ (own) | ✓ | ✓ |
| `/team-development/tracks/` (4-card career strip) | 👁️ | 👁️ | ✓ edit | ✓ |
| `/team-development/plans/` (Manage Tracks) | 👁️ | ✓ | ✓ | ✓ |
| **Calendar / Vendors / Surveys / Chat** | | | | |
| `/calendar/` | 👁️ | ✓ | ✓ | ✓ |
| `/guest-complaints/` (sensitive!) | 🚫 | ✓ | ✓ | ✓ |
| `/vendors/` | 👁️ | ✓ | ✓ | ✓ |
| `/surveys/` | 👁️ active | ✓ | ✓ | ✓ |
| `/chat/channels/` | 👁️ | ✓ (create), manage their own | ✓ | ✓ |
| `/chat/channels/:id/members/` POST | 🚫 | ✓ | ✓ | ✓ |
| `/chat/messages/` POST | ✓ (subject to channel `allowed_roles`) | ✓ | ✓ | ✓ |
| **Notifications / Dashboard** | | | | |
| `/notifications/` | ✓ *own*, hides `requires_manager=True` | ✓ *own* | ✓ *own* | ✓ *own* |
| `/dashboard/insights/values/` | ✓ | ✓ | ✓ | ✓ |
| `/dashboard/priorities/` | ✓ *own* | ✓ *own* | ✓ *own* | ✓ *own* |
| `/weekly-digest/` (Operator Overview) | 🚫 | 🚫 | ✓ | ✓ |
| **Settings / Users** | | | | |
| `/stores/me/` | 👁️ | ✓ (limited fields) | ✓ | ✓ |
| `/stores/me/settings/` | 👁️ subset | ✓ FOH/operational | ✓ | ✓ |
| `/users/` (User Management) | 🚫 | 🚫 | ✓ (cannot promote to admin or higher) | ✓ |
| `/users/me/preferences/` | ✓ *own* | ✓ *own* | ✓ *own* | ✓ *own* |

---

## 3. Specific rules worth remembering

**Multi-tenancy.** Every operational model has a `store` FK, and every
`StoreScopedViewSet` auto-filters by `request.user.store` and auto-stamps
`store=request.user.store` on create. A manager in Store A literally
**cannot** see Store B's tasks even with a crafted request.

**Per-user data isolation:**
- `/leadership/development-plans/` returns ONLY the requesting user's
  enrollments (managers DO NOT see other users' plans through this list).
  Team progress is a separate endpoint (`team_progress/`) that's
  manager-gated.
- `/notifications/` returns ONLY the requesting user's rows, AND filters
  out `requires_manager=True` rows for team-member roles (so guest
  concerns/HR docs don't leak).
- `/users/me/preferences/` is always self-scoped.

**Sensitive notifications.** When server-side code creates a
`Notification`, set `requires_manager=True` for: guest concerns,
documentation/disciplinary docs, 360 evaluation results,
admin-only system alerts. Team members will not see these in their bell.

**Development plan assignments (the rule you asked for):** only
**admins and superusers** can assign a plan to another user. Manager-tier
roles can MONITOR progress (`Team Progress` panel) but cannot enroll a
team member. Enforced in `UserDevelopmentPlanViewSet.perform_create` via
`is_admin_or_above(requester)`. Frontend mirrors this with the
`canAssignPlans` gate in `LeadershipDevPlans.js`.

**Operator Overview / Weekly Digest.** Admin-tier only. The endpoint
returns 403 to non-admins server-side and the profile-dropdown link is
hidden in the UI via `isAdminOrAbove(user)`.

**User Management (`/users/`).** Admin-tier write. Even admins **cannot**
elevate someone to `is_admin` or `is_superuser` — only superusers can
toggle those flags. Enforced in `UserManagementViewSet` via
`CanManageUsers`.

**Career Path (4-card strip).** Read by everyone (subject to the
store's `dev_tracks_visible_to_team` toggle), but the edit drawer
requires admin-tier. Tracks themselves are STORE-WIDE configuration.

---

## 4. Quick reference: where to add a new permission gate

**Backend** — pick the right helper from `api/permissions.py`:

```python
# Read for all, write for managers (most common pattern)
permission_classes = [IsAuthenticated, ReadAllWriteManager]

# Manager-tier on every action
permission_classes = [IsAuthenticated, IsManagerOrAbove]

# Admin-tier on every action
permission_classes = [IsAuthenticated, IsAdminOrAbove]

# Per-action overrides
def get_permissions(self):
    if self.action in {'complete', 'history'}:
        return [IsAuthenticated()]
    if self.action in {'destroy', 'mass_archive'}:
        return [IsAdminOrAbove()]
    return super().get_permissions()
```

**Frontend** — mirror it in JSX:

```jsx
import { isManagerOrAbove, isAdminOrAbove } from '../utils/access';

const canManage = isManagerOrAbove(user);
const canAdmin  = isAdminOrAbove(user);

// Hide the action entirely (preferred over disabled)
{canManage && <button onClick={openCreate}>Create</button>}
// Disabled state for actions a team member sees but can't perform
<button disabled={!canManage}>Edit</button>
```

---

## 5. Closed gaps (was "Known gaps / TODO" — now historical)

All previously-tracked gaps have shipped:

- **Task #48** ✓ Demo + test users split into a separate sandbox store
  (number `00000`); `init_railway_users.py` migrates legacy users on
  every deploy.
- **Chat reactions** ✓ `ChatMessageReaction` model + `POST
  /chat/messages/:id/react/` (toggle) + `POST /chat/messages/:id/pin/`
  (manager+) + `DELETE /chat/messages/:id/` (author or manager+). Hover
  toolbar + inline reaction-bubble row + pinned banner all wired.
- **Documentation Preferences drawer** ✓ `StoreSettings.documentation_prefs`
  JSONField + slide-out drawer (date filter, view mode, sort, card
  highlights, disciplinary templates). Manager-only write.
  `TeamDocumentation.js` reads `default_category_filter` on mount as
  initial filter state.
- **Pending Acknowledgment** ✓ `EmployeeRecord.{requires_acknowledgement,
  acknowledged_at, acknowledged_by}` + `POST
  /team/documentation/records/:id/acknowledge/` (subject or manager+).
  UI: amber "Awaiting acknowledgement" banner with Acknowledge button →
  emerald "✓ Acknowledged by …" banner on success.
- **360 Take Evaluation / Results view** ✓ `Evaluation360Template.sections`
  JSON list of `{title, description, questions: [{text, kind,
  scale_min, scale_max}]}`. `TakeEvaluationModal` renders rating buttons
  + text areas + validates all rating questions before submit. Wired to
  existing `POST /leadership/360/:id/respond/`.
- **Documentation Analytics** ✓ Already built end-to-end — backend
  `documentation_analytics()` + frontend `TeamDocumentationAnalytics.js`
  with 3 tabs (Overview / Attention Needed / All Employees) and bar
  chart over 7 risk buckets. Routed from the analytics icon on the
  Documentation banner.

If you find a NEW gap, add it here.

---

_Last reviewed: 2026-05-17. Re-run this audit whenever a new viewset is
added or an existing one changes role gates._
