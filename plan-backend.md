# Backend Implementation Plan

_Last revised: 2026-05-13. Scope: replace every piece of hardcoded data in the React frontend with a real Django + Postgres backend so the app actually persists data._

---

## 1. Executive Summary

The frontend is rich (~50 React components covering FOH, Kitchen, Team, Setup Sheets, Leadership, Calendar, Chat, Vendors, etc.), but **almost none of it persists data**. Every page reads from `useState` defaults and array literals; mutations vanish on refresh.

The backend already has the right *shape* of foundational models (`User`, `Team`, `Department`, `Document`, `Notification`, etc.) and a working auth flow on Railway. What's missing is the long tail of domain models, the DRF serializers/viewsets that expose them, and the wiring on the frontend that swaps hardcoded arrays for `fetch` calls.

This document is the **complete roadmap** to close that gap. It's organized so we can ship value incrementally — one domain at a time — rather than as one big-bang refactor.

### What we're optimizing for
- **Persistence first, polish second.** Get data saving; refine later.
- **Same patterns everywhere.** One way to do CRUD, one way to do permissions, one way to do pagination. Repetition lowers cognitive load and reduces bugs.
- **Vertical slices.** Each phase delivers an end-to-end working feature (model → migration → serializer → viewset → URL → frontend integration → test), not a stack of half-finished layers.

### Done means
A user logs in, performs actions across the app (creates a setup sheet, completes FOH tasks, logs waste, writes a shift summary, etc.), logs out, comes back tomorrow on a different device, and **sees everything they did** — for themselves and for their store.

---

## 2. Current Backend State

### What works today
- Custom `User` model with `role` + `company_id` + `is_demo_user` ([`backend/api/models.py`](backend/api/models.py)).
- Session-cookie auth via `/api/auth/login/`, `/api/auth/logout/`, `/api/auth/me/`, password reset endpoints.
- DRF default permissions locked to `IsAuthenticated` (closed by default).
- React app served from same domain on Railway; CSRF + cookies working end-to-end.
- Postgres on Railway with auto-migrate on every deploy.
- Idempotent user seeder ([`backend/init_railway_users.py`](backend/init_railway_users.py)) that runs on every deploy.

### Existing models (in `backend/api/models.py`)
`User`, `UserProfile`, `Department`, `Team`, `TeamMember`, `LeadershipModule`, `LeadershipActivity`, `UserLeadershipProgress`, `Evaluation`, `PerformanceMetric`, `TaskCategory`, `Task`, `Document`, `SetupSheet`, `SetupTask`, `Notification`.

Most are skeletal — the right entity name, the wrong (or missing) set of fields.

### What's missing entirely
No `Store` model (we're storing store identity as a string on the User). No models for any of:
shift summaries, cleaning tasks/frequencies, kitchen equipment, kitchen waste, kitchen checklists, food safety, employee documentation records, training plans/assignments, quick links, calendar events, guest complaints, vendors, chat channels, surveys, dashboard customization persistence, store settings, user preferences, position tracks, evaluation templates, evaluators on a 360.

That's the work.

---

## 3. Architecture Decisions

### 3.1 Tech stack (already locked in)
- **Django 4.2 + Django REST Framework** for the API.
- **Postgres on Railway** for persistence.
- **Session-cookie auth** (works because Django serves the React build itself — same origin).
- **DRF ViewSets + Routers** for almost all endpoints. Use `@action` for verbs that don't fit pure REST (e.g., `POST /api/foh/tasks/:id/complete/`).
- **DRF `PageNumberPagination`** with a page size of 25 by default, overridable via `?page_size=`.
- **`django-filter`** for list endpoint filtering (status, date range, search).

### 3.2 Multi-tenancy: scoping data per store

This is the most important architectural decision. Every operational record (a task, a setup sheet, a waste entry, a vendor, a chat message) belongs to **one store**. A user can only ever see/edit data from their own store.

**Pattern:**
1. Add a `store = models.ForeignKey(Store, on_delete=models.CASCADE)` field on every per-store model.
2. Add a `Store` field on `User` (FK, not the current free-text `company_id`).
3. Write one `StoreScopedViewSet` base class that overrides `get_queryset()` to filter by `request.user.store`. Every viewset inherits from it. **One place to get this right.**
4. On `perform_create()`, auto-set `store=request.user.store` so frontend never has to send it.

### 3.3 Permissions model

Three roles matter:
| Role | Can read | Can write | Notes |
|---|---|---|---|
| `team_member` | their own work, store-wide read-only views | their own completions, their own profile | majority of users |
| `manager` / `shift_lead` / `director` | everything in their store | most things | management tier |
| `admin` (is_superuser) | everything | everything, plus Django admin | for owners/Cailer |

Implement as DRF permission classes:
- `IsAuthenticated` — already the default.
- `IsManagerOrAbove` — `request.user.role in {manager, shift_lead, director, admin}`.
- `IsAdmin` — `request.user.is_superuser`.

Per-resource: `viewset.permission_classes` is a list. Most write operations get `[IsManagerOrAbove]`; reads stay at `[IsAuthenticated]`.

### 3.4 API conventions

- **URL shape:** `/api/<domain>/<resource>/` (e.g., `/api/foh/tasks/`, `/api/kitchen/waste/entries/`). Groups are: `auth`, `dashboard`, `foh`, `cleaning`, `setup-sheets`, `shift-summaries`, `kitchen`, `team`, `training`, `leadership`, `calendar`, `vendors`, `chat`, `surveys`, `notifications`, `settings`.
- **List + Detail + Create + Update + Delete** standard CRUD via ViewSets.
- **Bulk endpoints** use `@action(methods=['post'], detail=False, url_path='bulk')`.
- **Action endpoints** use `@action(methods=['post'], detail=True, url_path='complete')` for `/api/foh/tasks/:id/complete/`.
- **Snake_case in JSON.** The React app already normalizes once at the App.js boundary (`first_name → firstName`). Keep the wire format snake_case to match Django defaults.
- **ISO 8601 datetimes everywhere.** No more `"4-19-25"` or `"Updated 12 minutes ago"` — frontend formats for display.
- **No string FKs in payloads.** Replace `assignedTo: "Maria"` with `assigned_to: 7` (user ID). Frontend displays the name from a joined user object.

### 3.5 Code organization

When `api/models.py` and `api/views.py` get unwieldy (we're already at ~250 lines of models with way more coming), split them into a package:

```
backend/api/
├── models/
│   ├── __init__.py            # re-exports everything for migrations
│   ├── core.py                # User, Store, Department, UserProfile, UserPreferences
│   ├── foh.py                 # FOHTaskTemplate, FOHTaskCompletion, etc.
│   ├── cleaning.py
│   ├── setups.py
│   ├── shift.py
│   ├── kitchen.py             # equipment, waste, checklists, food safety
│   ├── team.py                # TeamMember, EmployeeRecord, Training, QuickLinks
│   ├── leadership.py
│   ├── ops.py                 # Calendar, GuestComplaint, Vendors, Chat, Surveys
│   └── notifications.py
├── views/                     # mirrors models/ structure
├── serializers/               # same
├── urls.py                    # one router-per-domain
└── permissions.py             # IsManagerOrAbove etc.
```

Plan this split at the start of Phase 1 so we don't have to re-do it mid-flight.

---

## 4. Complete Data Model

This is the target schema. Phase numbers indicate when each model lands. **\*** = extension of an existing model.

### 4.1 Core / Foundation (Phase 0)

```
Store
  id, name, store_number (CHAR(10), unique), address, phone, email,
  vision, mission, timezone (default 'America/Chicago'), created_at

StoreSettings  (1:1 with Store)
  store_id,
  features: JSONField,                 # {foh_tasks: True, kitchen: True, ...}
  access: JSONField,                   # {setup_view_leaders_only: False, ...}
  cleaning_settings: JSONField,        # {enable_daily_tasks: True, ...}
  foh_require_initials: Bool,
  waste_goal_daily: Decimal,
  waste_goal_weekly: Decimal,
  waste_goal_monthly: Decimal

User*                                  # extend existing
  + store: FK(Store, nullable for old data, then required)
  + initials: Char(4)                  # derived in save(); also serializable
  + phone: Char(20, blank)

UserPreferences  (1:1 with User; replaces current UserProfile.dashboard_customization)
  user_id,
  language: Char(10) default 'english',
  theme_color: Char(7) default '#E51636',
  dark_mode: Bool, compact_mode: Bool,
  notifications: JSONField,            # {eval_due, task_reminder, chat, complaint, email_digest}
  quick_action_ids: ArrayField(Char) or JSONField,
  insight_ids: ArrayField(Char) or JSONField

Department*                            # extend existing — minor only
  + store: FK(Store)                   # so 'FOH' at store A != 'FOH' at store B
```

### 4.2 FOH Daily Tasks (Phase 1)

```
FOHTaskTemplate
  id, store, shift ('opening'|'transition'|'closing'), text, order,
  created_at, archived_at (nullable; soft delete)

FOHTaskCompletion
  id, template (FK), date (DateField), completed_at (DateTime),
  completed_by (FK User), initials (CharField, optional),
  UNIQUE(template, date)               # one completion per task per day
```

### 4.3 Cleaning & Maintenance (Phase 3)

```
CleaningTask
  id, store, name,
  frequency ('daily'|'weekly'|'monthly'|'quarterly'),
  days: JSONField,                     # ['mon','wed','fri'] for weekly
  supplies: JSONField,                 # ['Sanitizer', 'Microfiber'] or []
  links: JSONField,                    # [{label, url}, ...]
  estimated_minutes (int, nullable),
  created_at, archived_at

CleaningCompletion
  id, task (FK), date, completed_at, completed_by (FK User),
  notes (TextField, blank)
```

### 4.4 Setup Sheets (Phase 2)

```
SetupSheetTemplate                     # named templates, reusable
  id, store, name, description, created_by (FK User), created_at, updated_at,
  time_blocks_count (int, denorm of len of children below)

TimeBlock                              # template OR sheet can have these
  id, template (FK, nullable), sheet (FK, nullable),  # XOR — one or the other
  start_time, end_time, position (str),
  positions_needed: JSONField,         # [{role, count}, ...]
  notes (TextField)

SetupSheet*                            # extend existing
  + name (Char), week_start (Date), week_end (Date),
  + owner (FK User), is_shared (Bool),
  + employees_count (int), areas_count (int), hours (Decimal),
  + source_template (FK SetupSheetTemplate, nullable),
  + uploaded_file (FileField, nullable),         # raw HotSchedules export
  + status ('draft'|'published'|'archived')

SetupSheetShare
  id, sheet (FK), shared_with_user (FK User), permission ('view'|'edit')
```

### 4.5 Shift Summary (Phase 1)

```
ShiftSummary
  id, store, shift_lead (FK User), shift_date (Date),
  shift_type ('opening'|'mid'|'closing'),
  shift_status ('normal'|'busy'|'slow'|'incident'),
  rating (1..5),
  recap (Text), sales_note (Char), labor_percent (Decimal),
  sos_note (Char), handoff_note (Text),
  needs_follow_up (Bool),
  is_draft (Bool, default True),       # auto-saved drafts before submit
  created_at, updated_at, submitted_at (nullable)

ShiftTag                               # admin-configurable tag catalog
  id, store, kind ('win'|'challenge'), label, order, is_active

ShiftSummaryTag                        # M2M join
  summary (FK), tag (FK)
```

### 4.6 Kitchen — Dashboard + Checklists (Phase 4)

```
KitchenChecklistTask                   # mirrors FOHTaskTemplate shape
  id, store, shift ('opening'|'transition'|'closing'),
  text, order, archived_at

KitchenChecklistCompletion
  id, task (FK), date, completed_at, completed_by (FK User)
  UNIQUE(task, date)
```

Kitchen Dashboard summary endpoint is **aggregation only** — no new model. Rolls up completion counts across FoodSafety/Waste/Equipment/Checklists.

### 4.7 Kitchen — Equipment (Phase 5)

```
EquipmentCategory
  id, store, name, slug, emoji, order, archived_at

Equipment
  id, store, category (FK), name, icon (Char),
  status ('ok'|'needs_attention'|'down'), notes (Text),
  installed_at (Date, nullable), warranty_expires (Date, nullable),
  archived_at

MaintenanceSchedule
  id, equipment (FK), task_name (Char), cadence ('weekly'|'monthly'|'quarterly'|'yearly'),
  next_due (Date), last_completed (Date, nullable),
  urgency_threshold_days (int)

MaintenanceLog
  id, equipment (FK), kind ('history'|'maintenance'|'cleaning'|'issue'),
  notes (Text), performed_by (FK User), performed_at (DateTime)
```

### 4.8 Kitchen — Waste Tracker (Phase 4)

```
MealPeriod                             # global catalog, not per-store
  id, slug ('breakfast'|'lunch'|'dinner'), label, emoji, order

MenuItem
  id, store, meal_period (FK), name, emoji, unit_price (Decimal),
  archived_at

WasteReason                            # store-customizable
  id, store, slug ('overproduction'|'quality'|'expired'|'dropped'|...), label, emoji

WasteEntry
  id, store, menu_item (FK), qty (int), unit ('pieces'|'portions'),
  unit_price_at_time (Decimal),        # snapshot — protects against menu price changes
  reason (FK, nullable),
  recorded_at (DateTime), recorded_by (FK User),
  notes (Char, blank)

# Goals live on StoreSettings.waste_goal_* already
```

### 4.9 Kitchen — Food Safety (Phase 5)

```
FoodSafetyTask
  id, store, daypart ('morning'|'lunch'|'dinner'), text, order, archived_at

FoodSafetyCompletion
  id, task (FK), date, completed_at, completed_by

TemperatureTarget                      # named slots: 'Walk In Cooler', 'Chicken @ Hold'
  id, store, kind ('equipment'|'product'), name, expected_min, expected_max,
  archived_at

TemperatureReading
  id, target (FK), value (Decimal), unit ('F'|'C'),
  status ('good'|'warning'|'critical'),  # derived from min/max but stored for queryability
  recorded_at, recorded_by (FK User)
```

### 4.10 Team Members + Documentation (Phase 5)

```
TeamMember*                            # extend existing
  + store: FK(Store)
  + manager: FK(User, self-ref, nullable)
  + departments: M2M(Department)
  + shift_preference: ('day'|'night'|'flex')
  + is_admin: Bool (separate from is_superuser; site-level admin badge)
  + is_active: Bool (default True)

EmployeeRecord
  id, user (FK), recorded_by (FK User),
  kind ('admin'|'warning'|'pip'|'recognition'),
  title (Char), body (Text),
  status ('documented'|'pending'|'resolved'),
  recorded_at, resolved_at (nullable)
  # risk_level computed on the fly: high if 3+ active warnings/PIPs in last 60d, etc.
```

### 4.11 Team Training (Phase 6)

```
TrainingPlan
  id, store, name, description, department (FK, nullable),
  total_steps (int), archived_at

TraineeAssignment
  id, user (FK), plan (FK), assigned_by (FK User),
  assigned_at, status ('in_progress'|'completed'|'paused'),
  completed_steps (int), progress_percent (int — computed property),
  completed_at (nullable)

TrainingActivity                       # event log per assignment
  id, assignment (FK), kind, notes, recorded_at, recorded_by
```

### 4.12 Team Quick Links (Phase 6)

```
QuickLinkCategory
  id, store, name, color, order, archived_at

QuickLink
  id, store, category (FK, nullable),
  label, url, icon (Char), order, archived_at
```

### 4.13 Leadership 360 + Development (Phase 7)

```
Evaluation360Template
  id, store, name, description, sections_count (int), is_active

Evaluation360
  id, store, evaluatee (FK User), template (FK),
  status ('in_progress'|'completed'), due_date,
  progress_percent (int), created_at, completed_at (nullable)

EvaluationEvaluator
  id, evaluation (FK), user (FK User),
  type ('peer'|'manager'|'direct_report'),
  invited_at, completed_at (nullable),
  responses: JSONField                 # answers to the template's questions

PositionTrack                          # career progression — reuse for Team Development
  id, store, name ('team-member'|'trainer'|'zone-leader'|'shift-lead'),
  description, order

TrackProgress
  id, user (FK), track (FK),
  status ('not_started'|'in_progress'|'completed'),
  completed_steps (int), current_step (int), updated_at

LeadershipArea                         # user's selected focus areas from LeadershipDevelopment.js
  id, user (FK), area_key (Char)       # 'kitchen', 'drive-thru', 'food-safety', etc.

LeadershipNote
  id, user (FK), text, created_at
```

### 4.14 New domains (Phase 8)

```
CalendarEvent
  id, store, title, category ('weekly_task'|'out_of_school'|'store_event'|'local_event'|'announcement'|'deadline'|'other'),
  starts_at, ends_at (nullable), all_day (Bool),
  created_by (FK User), notes (Text)

GuestComplaint
  id, store, guest_name, guest_phone,
  category ('order_error'|'service'|'food_quality'|'wait_time'|'cleanliness'|'staff_behavior'|'app_rewards'|'other'),
  description, status ('open'|'in_progress'|'resolved'),
  resolution (Text), assigned_to (FK User, nullable),
  occurred_at (DateTime), resolved_at (nullable), created_by (FK)

Vendor
  id, store, name,
  category ('food_beverage'|'supplies'|'equipment'|'cleaning'|'uniforms'|'marketing'|'other'),
  contact_name (Char), phone, email, website,
  account_number (Char), notes (Text),
  tags: JSONField                      # ['Primary', 'Weekly Delivery', 'Auto-Ship']

ChatChannel
  id, store, name, slug ('general'|'operations'|'kitchen'|'foh'), is_default (Bool)

ChatMembership
  id, channel (FK), user (FK), joined_at, last_read_at

ChatMessage
  id, channel (FK), author (FK User), body (Text), created_at,
  edited_at (nullable)

Survey
  id, store, title, status ('draft'|'active'|'closed'|'archived'),
  opens_at, closes_at, created_by (FK), is_anonymous (Bool, default True)

SurveyQuestion
  id, survey (FK), text, kind ('text'|'rating'|'multiple_choice'|'yes_no'),
  options: JSONField, order, required (Bool)

SurveyResponse
  id, survey (FK), submitted_at,
  user (FK, nullable — null when anonymous)

SurveyAnswer
  id, response (FK), question (FK), value (JSONField)
```

---

## 5. API Surface (complete URL map)

Every list endpoint supports `?page=`, `?page_size=`, `?search=`, `?ordering=`. Detail endpoints are `/<id>/`.

```
/api/auth/
  POST   login/                         already built
  POST   logout/                        already built
  GET    me/                            already built
  POST   forgot-password/               already built
  POST   reset-password/                already built

/api/users/
  GET    me/preferences/                read UserPreferences
  PATCH  me/preferences/                write UserPreferences

/api/stores/
  GET    me/                            current user's Store + StoreSettings
  PATCH  me/                            update store info (manager+)
  GET    me/settings/                   feature flags etc.
  PATCH  me/settings/                   (manager+)

/api/dashboard/
  GET    insights/catalog/              available insight cards (18 entries)
  GET    insights/                      values for *user's selected* insights
  GET    quick-actions/catalog/         available quick actions (22 entries)
  GET    status/                        'All caught up' or backlog summary

/api/foh/tasks/
  GET    ?shift=opening                 list templates for a shift
  POST   /                              create template
  PATCH  /:id/                          edit text/order/archive
  DELETE /:id/
  POST   /:id/complete/                 record completion for today
  POST   /:id/uncomplete/               undo
  GET    /completions/?date=YYYY-MM-DD  today's completions across shifts
  POST   /reorder/                      bulk reorder
  GET    /history/?range=7d             rollup for TaskHistory.js

/api/cleaning/tasks/
  GET    ?frequency=daily
  POST   /
  PATCH/DELETE /:id/
  POST   /:id/complete/
  GET    /counts/                       per-frequency counts for the page header
  GET    /schedule/?month=YYYY-MM       calendar view
  GET    /history/?range=30d

/api/setup-sheets/templates/
  full CRUD
/api/setup-sheets/
  GET    ?mine=true&q=
  POST   /                              create from scratch
  POST   /upload/                       multipart file upload (HotSchedules)
  GET    /:id/
  PATCH/DELETE /:id/
  POST   /:id/share/                    body: {user_id, permission}
  POST   /:id/duplicate/

/api/shift-summaries/
  GET    ?range=&shift=&status=
  POST   /                              submit
  GET    /draft/today/                  resume in-progress draft
  PATCH  /draft/today/                  autosave
  DELETE /draft/today/
  GET    /:id/
  GET    /tags/                         catalog of wins + challenges
  POST   /tags/                         (manager+)

/api/kitchen/
  GET    summary/                       rollup card for Kitchen Dashboard

/api/kitchen/checklists/
  GET    ?shift=opening
  POST   /, PATCH/DELETE
  POST   /:id/complete/

/api/kitchen/waste/
  GET    menu-items/?meal=lunch
  POST   menu-items/                    (manager+)
  GET    reasons/
  GET    entries/?date=today&meal=lunch
  POST   entries/
  DELETE entries/:id/
  GET    kpis/?range=7d
  GET    trend/?range=30d
  GET    top-items/?range=30d
  GET    goals/                         from StoreSettings
  PATCH  goals/                         (manager+)

/api/kitchen/food-safety/
  GET    tasks/?daypart=morning
  POST   /:id/complete/
  GET    temperature-targets/
  POST   temperature-readings/
  GET    temperature-readings/?range=

/api/kitchen/equipment/
  GET    categories/
  POST/PATCH/DELETE categories/         (manager+)
  POST   categories/reorder/
  GET    /?category=cooking
  full CRUD
  GET    /:id/schedules/
  POST   /:id/schedules/
  POST   /schedules/:id/complete/
  GET    /:id/logs/
  POST   /:id/logs/

/api/team/
  GET    members/?status=active&search=&dept=
  full CRUD
  GET    stats/
  GET    managers/

/api/team/documentation/
  GET    employees/?filter=disciplinary
  GET    stats/?window=60d
  GET    employees/:id/records/
  POST   employees/:id/records/         (manager+)
  PATCH/DELETE records/:id/

/api/training/
  GET    plans/, POST/PATCH/DELETE      (manager+)
  GET    trainees/?status=&search=&page=
  POST   trainees/                      create assignment
  PATCH  trainees/:id/                  update progress
  DELETE trainees/:id/
  GET    stats/
  GET    progress-by-department/

/api/team/quick-links/
  GET    /, full CRUD
  GET    categories/
  POST/PATCH/DELETE categories/

/api/leadership/
  GET    modules/                       (existing)
  GET    activities/                    (existing)
  POST   progress/

/api/leadership/360/
  GET    templates/
  POST   templates/                     (manager+)
  GET    evaluations/?status=
  POST   evaluations/                   create with evaluators
  GET    evaluations/:id/
  POST   evaluations/:id/respond/       evaluator submits responses
  GET    stats/

/api/team-development/
  GET    tracks/
  GET    members/?scope=my-team&position=
  GET    counts/

/api/calendar/
  GET    events/?month=YYYY-MM
  full CRUD

/api/guest-recovery/
  GET    complaints/?status=open
  full CRUD
  POST   complaints/:id/resolve/

/api/vendors/
  GET    /?category=
  full CRUD

/api/chat/
  GET    channels/
  GET    channels/:slug/messages/?before_id=
  POST   channels/:slug/messages/
  POST   channels/:slug/mark-read/

/api/surveys/
  GET    /
  full CRUD                             (manager+)
  POST   /:id/respond/                  open to all authenticated

/api/notifications/
  GET    /
  POST   :id/mark-read/
  POST   mark-all-read/
  GET    unread-count/

/api/weekly-digest/
  GET    /?week=YYYY-MM-DD              aggregates across modules
```

---

## 6. Phased Implementation Plan

Each phase is shippable on its own — push to main when done, Railway auto-deploys, you can use the feature that day. Phases are ordered roughly by usage frequency × ease.

### Phase 0 — Foundation (1–2 days)
**Goal: get the multi-tenant scaffolding in before adding more models.**
- [ ] Reorganize `api/models.py` and `api/views.py` into the package layout from §3.5.
- [ ] Create `Store`, `StoreSettings`, `UserPreferences` models + migrations.
- [ ] Add `store` FK to `User` (nullable migration → data migration to set existing users → make non-null). Backfill from `company_id`.
- [ ] Build `StoreScopedViewSet` base class. Document with example.
- [ ] Build `permissions.py` with `IsManagerOrAbove`, `IsAdmin`.
- [ ] `/api/stores/me/`, `/api/stores/me/settings/`, `/api/users/me/preferences/` endpoints.
- [ ] Frontend: hook `Settings.js` to real endpoints (replace local useState).

### Phase 1 — Shift Summary + FOH Tasks (3–5 days)
**Goal: the highest-frequency daily-use features start saving data.**
- [ ] `ShiftSummary` + `ShiftTag` models, serializers, viewset.
- [ ] `FOHTaskTemplate` + `FOHTaskCompletion` models, serializers, viewset (incl. `complete`, `reorder`, `history` actions).
- [ ] `/api/shift-summaries/` and `/api/foh/tasks/` URLs wired up.
- [ ] Frontend: replace `useState` defaults in `ShiftSummary.js`, `FOHTasks.js`, `TaskHistory.js`, `ShiftSummaryHistory.js` with `fetch` calls.
- [ ] Test: log in as `demouser@gmail.com`, complete an FOH task, refresh, see it stay green.

### Phase 2 — Setup Sheets (4–6 days)
**Goal: the most complex single feature — templates, file uploads, sharing.**
- [ ] Extend `SetupSheet` and `SetupTask`; add `SetupSheetTemplate`, `TimeBlock`, `SetupSheetShare`.
- [ ] File upload via `multipart/form-data` — store the raw HotSchedules file, defer parsing for v2.
- [ ] Endpoints: `/api/setup-sheets/templates/`, `/api/setup-sheets/`, `/api/setup-sheets/:id/upload/`, `/share/`, `/duplicate/`.
- [ ] Frontend: `SetupSheetTemplates.js`, `SetupSheetBuilder.js`, `SavedSetups.js`.
- [ ] **Defer to v2:** server-side Excel parsing. For now, just store + return the file.

### Phase 3 — Cleaning & Maintenance (2–3 days)
- [ ] `CleaningTask`, `CleaningCompletion` models + endpoints.
- [ ] Frontend: `CleaningMaintenance.js`, `KitchenCleaning.js`.
- [ ] Test: create a daily cleaning task, mark complete, see it in /history.

### Phase 4 — Kitchen Dashboard, Checklists, Waste Tracker (4–6 days)
**Goal: the kitchen's daily operational loop.**
- [ ] `KitchenChecklistTask`, `KitchenChecklistCompletion` (mirror of FOH).
- [ ] `MealPeriod`, `MenuItem`, `WasteReason`, `WasteEntry`.
- [ ] Kitchen Dashboard aggregation endpoint (`/api/kitchen/summary/`).
- [ ] Waste KPIs, trend, top-items endpoints — these can start as simple GROUP BY queries; optimize later.
- [ ] Frontend: `KitchenDashboard.js`, `KitchenChecklists.js`, `KitchenWasteTracker.js`, `KitchenAnalytics.js`.
- [ ] **Seed data:** import the 11 lunch menu items + 4 reasons currently hardcoded in `KitchenWasteTracker.js`.

### Phase 5 — Equipment & Food Safety (3–4 days)
- [ ] `EquipmentCategory`, `Equipment`, `MaintenanceSchedule`, `MaintenanceLog`.
- [ ] `FoodSafetyTask`, `FoodSafetyCompletion`, `TemperatureTarget`, `TemperatureReading`.
- [ ] Frontend: `KitchenEquipment.js`, `KitchenFoodSafety.js`.

### Phase 6 — Team Domain (4–6 days)
**Goal: stop hardcoding the team roster.**
- [ ] Extend `TeamMember`: store FK, manager self-ref, departments M2M, shift_preference, is_admin, is_active.
- [ ] `EmployeeRecord` (docs/PIP/admin) + endpoints.
- [ ] `TrainingPlan`, `TraineeAssignment`, `TrainingActivity` + endpoints.
- [ ] `QuickLinkCategory`, `QuickLink` + endpoints.
- [ ] Frontend: `TeamMembers.js`, `TeamDocumentation.js`, `TeamTraining.js`, `TeamQuickLinks.js`.
- [ ] **Seed:** import some sample team members so the page isn't empty on day one.

### Phase 7 — Leadership (3–4 days)
- [ ] `Evaluation360Template`, extend `Evaluation` → `Evaluation360`, `EvaluationEvaluator`.
- [ ] `PositionTrack`, `TrackProgress`, `LeadershipArea`, `LeadershipNote`.
- [ ] Frontend: `Leadership360Evaluations.js`, `New360Evaluation.js`, `TeamDevelopment.js`, `LeadershipDevelopment.js`.

### Phase 8 — New Domains (5–7 days)
- [ ] `CalendarEvent` → `Calendar.js`.
- [ ] `GuestComplaint` → `GuestRecovery.js`.
- [ ] `Vendor` → `Vendors.js`.
- [ ] `ChatChannel`, `ChatMembership`, `ChatMessage` → `TeamChat.js`. (Polling for v1; WebSockets later if needed.)
- [ ] `Survey`, `SurveyQuestion`, `SurveyResponse`, `SurveyAnswer` → `TeamSurveys.js`.

### Phase 9 — Polish (2–3 days)
- [ ] `Notification` endpoints + `unread-count` for the badge.
- [ ] Weekly Digest aggregation endpoint (`/api/weekly-digest/?week=`). Uses POS data if available; otherwise computes from FOH/Shift records.
- [ ] Dashboard `/api/dashboard/insights/` returns real values per the user's selected catalog ids.
- [ ] Persist `UserPreferences.quick_action_ids` and `insight_ids` from the customize modals.

### Phase 10 — Production hardening (ongoing)
- [ ] Real email service (Resend/SendGrid) for password reset + notification digest.
- [ ] Sentry for error tracking.
- [ ] Rate limiting via `django-ratelimit` on auth endpoints.
- [ ] Postgres backup verification.
- [ ] Sentry alerts on 5xx error rate.
- [ ] Add `select_related` / `prefetch_related` to list queries that show N+1 problems.

---

## 7. Frontend Integration Pattern

To avoid making this an afterthought, every phase follows the **same 4-step integration**:

1. **Create the service module.** In `frontend/src/services/`, add `<domain>.js` next to `api.js`. It exposes typed wrappers: `getFOHTasks({ shift })`, `completeFOHTask(id)`, etc. All call `apiService.request(...)` from `api.js` under the hood so we get auth + CSRF for free.
2. **Replace `useState` defaults with `useEffect` + fetch.** Example:
   ```js
   // BEFORE
   const [tasks, setTasks] = useState({ opening: [/* 16 hardcoded */], ... });

   // AFTER
   const [tasks, setTasks] = useState({ opening: [], transition: [], closing: [] });
   const [loading, setLoading] = useState(true);
   useEffect(() => {
     fohService.getTasksGroupedByShift()
       .then(setTasks)
       .finally(() => setLoading(false));
   }, []);
   ```
3. **Wire mutations through the service.** No more local-only state mutations:
   ```js
   const toggleTask = async (id, shift) => {
     await fohService.completeTask(id);
     // either: optimistic update, or: refetch
     setTasks(t => ({ ...t, [shift]: t[shift].map(x => x.id === id ? { ...x, completed: !x.completed } : x) }));
   };
   ```
4. **Update `FAKE_DATA.md`** by checking off the rows that have moved to real data.

---

## 8. Permissions Matrix (cheat sheet)

| Action | team_member | manager/shift_lead/director | admin |
|---|---|---|---|
| Read own profile + preferences | ✓ | ✓ | ✓ |
| Read store-wide schedules/tasks/templates | ✓ | ✓ | ✓ |
| Complete a task (their own work) | ✓ | ✓ | ✓ |
| Submit a shift summary | ✗ (read-only) | ✓ | ✓ |
| Create/edit/delete task templates | ✗ | ✓ | ✓ |
| Create/edit team members | ✗ | ✓ | ✓ |
| Document an employee (warning/PIP) | ✗ | ✓ | ✓ |
| Assign training | ✗ | ✓ | ✓ |
| Edit store settings | ✗ | ✓ (with confirm) | ✓ |
| Create a survey | ✗ | ✓ | ✓ |
| Respond to a survey | ✓ | ✓ | ✓ |
| Delete records (hard delete) | ✗ | ✗ | ✓ |

Use soft deletes (`archived_at`) by default; only `is_admin` can hard-delete via the Django admin if needed.

---

## 9. Testing Strategy

- **Per-endpoint API tests** in `backend/api/tests/test_<domain>.py`. Use `rest_framework.test.APIClient`. Tests follow this template:
  1. Create a store, two users (manager + team_member), log in as each.
  2. POST/GET/PATCH/DELETE the resource.
  3. Assert response shape, status, and that data is scoped to the right store.
  4. Negative test: a user from store B cannot read/write store A's data (returns 404 from queryset filtering).
- **Migration safety:** Every new field gets `null=True, blank=True` initially, then a data migration to backfill, then a separate migration to flip non-null. **Never combine these in one migration** — Railway will run them sequentially and you can roll back per migration if needed.
- **Local before remote:** Always test a phase end-to-end against local SQLite + `npm start` before pushing to Railway. The Railway deploy auto-migrates, but you don't want to discover broken migrations against the production DB.

---

## 10. Seed Data

Each phase should ship with a `seed_<domain>.py` script (idempotent, like `init_railway_users.py`) so a fresh Railway DB has *something* to look at instead of empty pages:

- Phase 0: 1 store (`CFA I-410 & Rigsby #00727`), the existing users assigned to it.
- Phase 1: ~15 FOH tasks per shift, 6 wins + 6 challenges as ShiftTags.
- Phase 2: 2 setup templates, 1 saved setup.
- Phase 3: ~10 cleaning tasks across frequencies.
- Phase 4: 11 lunch menu items, 4 waste reasons, 5 sample waste entries.
- Phase 5: 8 equipment categories with sample equipment, sample maintenance schedules.
- Phase 6: 10 team members + sample manager hierarchy, 2 training plans, 5 sample quick links.
- Phase 7: 1 evaluation template, 2 position tracks.
- Phase 8: 1 chat channel per slug, 1 sample vendor per category.

Wire all seeds into `init_railway_users.py` or a new `init_railway_seed.py` that runs after migrations on every deploy. Same idempotency rules: check existence before creating.

---

## 11. What's NOT in this plan (deferred)

These are real but out-of-scope until the above ships:

- **WebSockets / real-time** for chat (use polling first).
- **HotSchedules Excel parsing** for setup sheets (store raw file, parse in v2).
- **POS / sales API integration** for Weekly Digest sales numbers (placeholder until then).
- **PWA / offline mode** the original site has (the underlying data layer needs to settle first).
- **Push notifications** (need a service worker + Firebase or similar).
- **Multi-store users** — for now, a User belongs to exactly one Store. If a manager runs two stores, model that later with a `StoreMembership` join table.
- **Audit trail / change history** beyond what `created_at`/`updated_at` give you. Consider `django-simple-history` if it becomes important.
- **CSV/Excel exports** of reports.

---

## 12. How to use this document

- Treat sections 1–5 as **spec** — they shouldn't change much.
- Treat sections 6+ as **plan** — adjust phasing as you learn what's painful vs. easy.
- At the end of each phase, **strike completed items from FAKE_DATA.md** and **check off the phase here**. If you discover new fake data along the way, add it to FAKE_DATA.md immediately; it's the running ledger.
- When a model decision changes (e.g., "actually let's split `Equipment.status` into `operational_status` + `cleanliness_status`"), update §4 in the same commit so the spec stays current.
- The phases are **independent enough** that another developer (or you on a different day) can pick one up and ship it without context from the others — that was a design goal.

The goal of any week of work should be: "this week, the app started saving real data for *one more feature*." A year from now, no part of the React tree should be reading from a `const HARDCODED_DATA = [...]`.
