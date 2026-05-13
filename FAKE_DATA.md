# Fake / Hardcoded Data Tracker

This document catalogs **every place we've hardcoded demo data** while replicating the
LD Growth UI, instead of wiring up the real backend. Use this as a checklist when it's
time to replace demo data with live API calls / database reads / persisted state.

> **How to read a row:** each entry lists the **file**, **symbol / block**, a
> **description** of what's fake, and the **backend work needed** to replace it.
>
> **Rule going forward:** any time we add new demo data in the frontend, we append a
> row here so nothing gets lost.

---

## Legend

- 🔴 **Critical** — must be replaced before production (save/load flows, mutations).
- 🟠 **Important** — user-visible data that should come from API.
- 🟡 **Cosmetic** — demo copy, default values, UX polish.

---

## Dashboard / Home

### `frontend/src/components/Dashboard.js`

| Status | What | Notes |
|---|---|---|
| 🟡 | Greeting `getGreeting()` uses local time | Keep client-side, just confirm correct timezone for user's store. |
| 🟡 | Date `getCurrentDate()` uses local time | Same as above. |
| 🟠 | `user?.firstName \|\| 'Demo User'` fallback in banner | Should always have a real user; audit auth/session. |
| 🟠 | Dashboard Insights cards (FOH Tasks, Kitchen Checklist, Equipment Issues, Documentation) pull from `insights` state, but the **values** themselves (0%, 0/64, `Need repair`, `This week`) are hardcoded defaults | Backend endpoint: `GET /api/dashboard/insights` returning per-card `{value, subtitle, trend}`. |
| 🟠 | "All Caught Up 🎉" status card is always shown | Should be conditional on actual task/priority backlog — e.g. `GET /api/dashboard/status`. |
| 🟡 | `CustomizeInsightsModal` available insights list | Persist user's selection via `PATCH /api/users/me/insights`. |
| 🟡 | `CustomizeActionsModal` default set | Same as above — persist per user. |

### `frontend/src/components/QuickActions.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | `quickActionItems` array (22 entries) is fully hardcoded in the component | Eventually driven by role / permissions from `GET /api/users/me/permissions`. |
| 🟡 | `DEFAULT_ACTION_IDS` (8 items) is the "out-of-box" curated set | Backend should own the default per role. |
| 🟠 | `customActions` prop comes from `Dashboard.js` state (not persisted) | Persist to `PATCH /api/users/me/quick-actions`. |
| 🟡 | `cfadollars` action points to `page: 'cfadollars'` which doesn't exist yet | Placeholder until page built. |

---

## FOH Daily Tasks

### `frontend/src/components/FOHTasks.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | Initial `tasks` state (opening 16 items, transition 6, closing 34) is hardcoded in `useState` | `GET /api/foh/tasks?shift={opening\|transition\|closing}` — served per store. |
| 🔴 | `toggleTask(id)` only mutates local state | `POST /api/foh/tasks/:id/complete` with user initials + timestamp. |
| 🔴 | `deleteTask(id)` only mutates local state | `DELETE /api/foh/tasks/:id`. |
| 🔴 | `handleAddTask` only mutates local state | `POST /api/foh/tasks`. |
| 🟠 | "Require Team Member Initials" toggle is local | Store setting: `PATCH /api/stores/me/settings`. |
| 🟡 | Subtitle "6:30 AM - 11:00 AM • Lunch rush preparation" in Add Task modal header is hardcoded | Could be derived from shift config. |
| 🟠 | Grip/drag handle is visual-only; no reorder persistence | `PATCH /api/foh/tasks/reorder`. |

---

## FOH Cleaning & Maintenance

### `frontend/src/components/CleaningMaintenance.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `frequencies` all show `0/0` count | `GET /api/cleaning/tasks/counts`. |
| 🔴 | Empty state is always shown; no real cleaning tasks loaded | `GET /api/cleaning/tasks?frequency={daily\|weekly\|monthly\|quarterly}`. |
| 🟠 | Calendar view uses `generateCalendarDays()` with **hardcoded** April 2026, `today=18`, `hasTask: [11..18]` | Replace with real date range + `GET /api/cleaning/schedule?month=YYYY-MM`. |
| 🟠 | "Enable Daily Tasks" / "Team Member Completion" toggles local only | `PATCH /api/stores/me/cleaning-settings`. |
| 🟡 | Create Task form submit just closes modal (no POST) | `POST /api/cleaning/tasks`. |
| 🟡 | Day selector chips, frequency-option buttons, supply inputs, link inputs all non-functional | Wire as part of the create-task POST body. |
| 🟡 | History view shows "No completions found" always | `GET /api/cleaning/history?range=7d\|30d\|90d`. |

---

## Setup Sheets

### `frontend/src/components/SetupSheetTemplates.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `templates` state hardcoded: `NewMain / Main (Copy) / 9/15 - 9/22 / Summer` with fake dates and timeBlock counts | `GET /api/setup-templates`. |
| 🔴 | Card click navigates to `edit-template` with the template object; no real template loader | `GET /api/setup-templates/:id`. |
| 🔴 | 3-dot menu button is visual-only | Menu actions: rename, duplicate, share, delete → `PATCH/POST/DELETE`. |

### `frontend/src/components/SetupSheetBuilder.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | File drop/select just alerts the filename; no upload | `POST /api/setup-sheets/upload` (multipart). Parse the Excel server-side. |
| 🔴 | "Load Previous Setup" `<select>` options (`NewMain`, `Main (Copy)`, `9/15 - 9/22`, `Summer`) are hardcoded | Populate from `GET /api/setup-templates`. |
| 🔴 | `selectedTemplate` change has no side effect (no template load) | Should hydrate builder state from template. |
| 🟡 | Hero copy ("HotSchedules...") assumes HotSchedules integration — pure instructional | No backend work, just confirm source system. |

### `frontend/src/components/SavedSetups.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `savedSetups` state has **one** hardcoded entry: `{id:1, name:'4-19-25', weekRange:'Apr 18 – Apr 25, 2026', isShared:true, owner:'Savannah Holloway', employees:560, areas:94, hours:0, updatedAt:'Updated 12 minutes ago'}` | `GET /api/setup-sheets?mine=true`. |
| 🔴 | Search only filters in-memory | Server-side search: `GET /api/setup-sheets?q=...`. |
| 🟠 | "Sort by Date" button is visual-only (no state, no handler body) | Local or server-side sort; wire onClick. |
| 🔴 | Card click navigates `'setup-detail'` which has no route yet | Add route + detail page; `GET /api/setup-sheets/:id`. |
| 🔴 | 3-dot menu is visual-only | Edit / share / delete actions. |
| 🟡 | "Updated 12 minutes ago" is static string | Compute from `setup.updatedAt` timestamp w/ relative-time lib. |

---

## Shift Summary

### `frontend/src/components/ShiftSummary.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | All form state (`shiftLead`, `shiftDate`, `shiftType`, `shiftStatus`, `rating`, `wins`, `challenges`, `recap`, `salesNote`, `laborPercent`, `sosNote`, `handoffNote`, `needsFollowUp`) is local `useState` | `POST /api/shift-summaries` on Save; `GET /api/shift-summaries/today` on mount (resume draft). |
| 🔴 | `handleSave` just `alert('Shift summary saved (demo).')` | Real save + redirect to history. |
| 🔴 | `clearForm` only resets local state | Should also DELETE any in-progress draft on server. |
| 🟠 | `WIN_OPTIONS` and `CHALLENGE_OPTIONS` arrays hardcoded (6 each) | `GET /api/shift-summaries/tag-options` so admins can customize. |
| 🟠 | `SHIFT_TYPES` (Opening/Mid/Closing) and `SHIFT_STATUSES` (Normal/Busy/Slow/Incident) hardcoded | Same as above. |
| 🟡 | `toneForStatus()` derives tone from status locally | Could be server-provided. |
| 🟠 | Default `shiftLead` falls back to `"demo User"` | Should always be real user. |
| 🟡 | Live preview is pure client-side derivation of the form state | Fine to keep local. |
| 🟡 | "Why this workflow helps" card is static marketing copy | Keep as-is unless CMS-driven. |

### Shift Summary History — `frontend/src/components/ShiftSummaryHistory.js`

> Page exists but was **not** rewritten in this session. Audit separately when updated.

---

## Kitchen Dashboard

### `frontend/src/components/KitchenDashboard.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `progressData = { overall: 29, opening: 100, transition: 0, closing: 0 }` hardcoded | `GET /api/kitchen/today-progress`. |
| 🔴 | All 4 `cards` have hardcoded stats: | Single endpoint: `GET /api/kitchen/summary` returning per-module `{stats, attention, alerts, progress}`. |
| 🔴 | → Food Safety: `0/33 checklists`, `0/9 temp checks`, `13 overdue tasks`, `1 issue need attention`, `progress: 100` | |
| 🔴 | → Waste Tracker: `$7.18 today's waste`, `20 items tracked`, `progress: 0` | |
| 🔴 | → Equipment Status: `24/24 operational`, `22 needs work`, `progress: 0` | |
| 🔴 | → Shift Checklists: `24/84 completed`, `29% rate`, `progress: 29` | |
| 🟡 | User greeting fallback `'Demo'` | Real user. |

### `frontend/src/components/KitchenAnalytics.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `TREND_POINTS` — 30 hardcoded daily waste values (Mar 23 → Apr 21) used to draw the line chart | `GET /api/kitchen/waste/trend?range={7d\|14d\|30d\|90d\|month}`. |
| 🔴 | `TOP_ITEMS` — hardcoded top 5 wasted items (Nuggets $120 / Mac & Cheese $59.59 / Strips $49.29 / Filet $32.64 / Spicy Filet $31.25) with item counts, pct, color | `GET /api/kitchen/waste/top-items?range=...`. |
| 🔴 | `kpis` — hardcoded 4 KPI cards: Today $7.18 (-45%), This Week $20.32 (204 items), Yesterday $13.14, Top Item Filet $4.08 | `GET /api/kitchen/waste/kpis`. |
| 🔴 | `goals` — hardcoded targets: Daily $100, Weekly $600, Monthly $2500; values drawn from `kpis` numbers | `GET /api/kitchen/waste/goals` + `PATCH` when edit pen button is wired. |
| 🟠 | Pen/edit button on goals header is visual-only | Open edit modal → persist. |
| 🟠 | `range` selector (Last 7/14/30/90 Days, This Month, Last Month) only updates local state; data doesn't change | Wire to query param + re-fetch. |
| 🟠 | Sub-tabs By Day / By Meal / By Hour / Top Items / Timeline show empty placeholder panel | Each tab needs its own endpoint + chart/view. |
| 🟡 | Top item rows each have a "chevron-down" hinting expandable detail; no expand logic yet | Expand to show item-level breakdown. |

### `frontend/src/components/KitchenEquipment.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `CATEGORIES` — 8 hardcoded equipment categories with emojis + counts (hvac 4, cleaning 4, pos_tech 4, safety 4, cooking 4, refrigeration 4, preparation 0, beverage 0) | `GET /api/kitchen/equipment/categories`. |
| 🔴 | `EQUIPMENT_BY_CATEGORY` — only `cooking` has 4 seed items (Primary Fryers, Secondary Fryers, Grills, Pressure Fryers); all others are empty arrays | `GET /api/kitchen/equipment?category=...`. |
| 🔴 | Primary Fryers schedule hardcoded: `{ task: 'boil out', cadence: 'weekly', date: 'Apr 21', urgency: 'Soon' }` — the only maintenance row on the page | `GET /api/kitchen/equipment/:id/schedules`. |
| 🔴 | All cards show "OK" status pill — always green | `GET /api/kitchen/equipment` should return `status: OK \| needs_attention \| down`. |
| 🔴 | `runningTotal = 24`, `runningOf = 24` in toolbar hardcoded | `GET /api/kitchen/equipment/running-summary`. |
| 🔴 | Calendar-days button shows a red "1" badge — hardcoded | `GET /api/kitchen/upcoming-tasks/count`. |
| 🔴 | History / Maint. / Clean / Issue action buttons on each card are visual-only | Each opens a modal / logs an action; endpoints TBD. |
| 🔴 | Schedule-row Done / Edit / Delete mini buttons are visual-only | `POST /api/kitchen/schedules/:id/complete`, `PATCH`, `DELETE`. |
| 🟠 | Category drag/reorder + delete (X on hover) + "Add Category" button are visual-only | `PATCH /api/kitchen/equipment/categories/order` + `POST` / `DELETE`. |
| 🟠 | Upcoming tasks button and Settings button have no click handlers | Open respective modals/pages. |

### `frontend/src/components/KitchenCleaning.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `tasks = []` hardcoded empty array; page shows the `🧹 No tasks` empty state regardless of data | `GET /api/kitchen/cleaning/tasks?frequency={daily\|weekly\|monthly}`. |
| 🔴 | `doneToday = 0`, `totalToday = 0` in subtitle `"0 of 0 done today"` hardcoded | Derived from tasks endpoint. |
| 🔴 | `FREQUENCIES` (Daily / Weekly / Monthly) hardcoded; active chip only updates local state, does not refetch | Wire selection to query param + re-fetch. |
| 🟠 | `History` button has no click handler | Navigate to history / open modal. |
| 🔴 | `Add Task` button has no click handler | Open create-task modal → `POST /api/kitchen/cleaning/tasks`. |

### `frontend/src/components/KitchenChecklists.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `TRANSITION_TASKS` — hardcoded list of 25 transition-shift task names copied verbatim from LD Growth (Dishes, Needs to have enough wraps, Prep chicken, …, Clean lowboy) | `GET /api/kitchen/checklists/:shift` returning `[{id, text, completed}]`. |
| 🔴 | Opening shift seeded with 24 placeholder tasks all `completed: true` (to reproduce the "✓ Done" pill) | Fetch real task defs + completion state per shift. |
| 🔴 | Closing shift seeded with 35 placeholder tasks all `completed: false` | Fetch real task defs + completion state per shift. |
| 🔴 | `toggleTask()` mutates local state only; `completed` flag is not persisted | `POST /api/kitchen/checklists/:shift/:taskId/toggle` with user + timestamp. |
| 🟠 | Sticky header "History" button has no handler | Navigate to history page. |
| 🟠 | Sticky header "Manage Positions" (users) button has no handler | Open positions modal / page. |
| 🟠 | Sticky header red "+" button has no handler | Open add/edit-tasks modal → `POST /api/kitchen/checklists/:shift`. |
| 🟡 | Shift subtitle logic shows "✓ Done" when all complete, else `done/total` — derived from `shiftState` | Keep client-side once tasks come from API. |

### `frontend/src/components/KitchenWasteTracker.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `MENU_ITEMS_BY_PERIOD` — hardcoded menu with 11 lunch items (Spicy Filet $1.25, Filet $1.02, Grilled Filet $1.12, Nuggets $0.15, Grilled Nuggets $0.17, Strips $0.53, Mac & Cheese $1.01, White Bun $0.16, Multigrain Bun $0.33, Gluten Free Bun $0.85, sandwich $1.00), plus 4 breakfast + 4 dinner placeholders | `GET /api/kitchen/waste/menu-items?meal={breakfast\|lunch\|dinner}`. |
| 🔴 | `TODAY_ENTRIES` — 16 hardcoded waste log entries (Filet, Strips x7, CFA Chicken Biscuit x2, Egg Whites, Spicy Filet, etc.) with times from 9:40 AM to 12:15 PM | `GET /api/kitchen/waste/entries?date=today`. |
| 🔴 | Tapping a menu tile adds an entry with `qty: 1`, `unit: 'pieces'`, client-side `new Date()` time — not persisted | `POST /api/kitchen/waste/entries`. |
| 🔴 | X delete button only mutates local state | `DELETE /api/kitchen/waste/entries/:id`. |
| 🔴 | Custom Entry `Add Entry` writes to local state, no API call | `POST /api/kitchen/waste/entries`. |
| 🔴 | "Most Wasted: Filet / Last: 12:15 PM" KPI is hardcoded string (not derived from entries) | `GET /api/kitchen/waste/kpis`. |
| 🔴 | "Today's Waste" KPI total is derived from `entries`, but `entries` themselves are fake | Once entries are real, this calc stays client-side. |
| 🟠 | `WASTE_REASONS` (Overproduction / Quality Issues / Expired / Dropped) hardcoded; selected reason is never sent when adding an entry | Include `reason` in POST body; `GET /api/kitchen/waste/reasons` for admin-managed list. |
| 🟠 | `Waste` / `Donations` mode toggle is visual only — Donations view is not implemented | `GET /api/kitchen/donations/*` + Donations UI. |
| 🟠 | `📝 Bulk Entry` button has no click handler | Open bulk-entry modal. |
| 🟠 | `⚙️ Items` and `💲 Prices` buttons have no click handlers | Navigate to items / prices management. |
| 🟠 | `📝 Notes` button (top-right of entries) has no handler | Open notes modal. |
| 🟠 | `📅 Today` date chip has no handler — cannot change date filter | Open date picker. |

### Kitchen sub-pages (not yet updated)
- `KitchenFoodSafety.js`

> All likely contain hardcoded data. Audit when each gets redesigned.

---

## Team Members

### `frontend/src/components/TeamEvaluations.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | Empty state is hardcoded — always shows "No Team Members / You don't have any direct reports assigned to you yet." | `GET /api/evaluations/team?scope={team-overview\|all}` — render list when non-empty, empty state otherwise. |
| 🟠 | Main 4-tab nav (`Evaluations` / `Scheduled` / `Templates` / `Analytics`) only switches local state — no content changes per tab | Each tab needs its own view / list. |
| 🟠 | Sub-tab pill (`Team Overview` / `All Evaluations`) only switches local state | Switch data source accordingly. |

### `frontend/src/components/TeamDocumentation.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `STATS` — hardcoded `{ total: 52, disciplinary: 21, admin: 30, employeesWithDocs: 31 }` for the three KPI cards + section subtitle ("Last 60 days") | `GET /api/team/documentation/stats?window=60d`. |
| 🔴 | `EMPLOYEES` — hardcoded 10 employees copied verbatim from LD Growth `/documentation` (Emily Harrison, Colton Holder, Hayden Green, Miguel Hernandez, Carlee Banks, Robby Hall, Addisyn Thomas, Destinee Moore, Caitlyn Trammell, Landon Jarvis) with name, role, risk level, Disc/PIP/Admin counts, and latest record (title/date/status/text) | `GET /api/team/documentation/employees?filter={all\|disciplinary\|pip\|admin}&search=...`. |
| 🔴 | `riskLevel` (`standard` / `mid` / `high`) driving card left border + avatar gradient is derived client-side from verbatim LD Growth classes | Should be returned by API (e.g. based on Disc count threshold) or computed from real counts. |
| 🔴 | `latest.kind` (`admin` / `warning`) picks the tile color + emoji (📄 blue / ⚠️ red) — currently hardcoded per row | Derive from real record type enum. |
| 🔴 | `latest.status` values (`Documented` / `Pending`) drive the purple / amber status pills — hardcoded | Derive from real doc state machine. |
| 🟠 | Card click has no handler (cursor is a pointer though) | Open an employee documentation detail page. |
| 🟠 | Per-card trash button has no handler | `DELETE /api/team/documentation/records/:id` (latest record). |
| 🟠 | Hero banner bar-chart + settings icon buttons have no handlers | Wire to analytics view + preferences modal. |
| 🟡 | Search + filter pills filter client-side only; adequate until paginated | Pass to API when there are > ~50 rows. |

### `frontend/src/components/TeamMembers.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `STATS` — hardcoded `{ active: 183, inactive: 71, managers: 53 }` used for pill count badges + pagination total | `GET /api/team/stats`. |
| 🔴 | `TEAM_MEMBERS` — hardcoded list of 10 members (Greg Argyrou, Adaya Garcia, Addisyn Thomas, Aleia Anderson, Alisha Champet, Aliyah Henry, Allison Burlison, Allison Villalobos, Ana Aguilar Rios, Ana Carranza) copied verbatim from LD Growth's `/users` page | `GET /api/team/members?page=N&status=active\|inactive&search=...`. |
| 🔴 | Pagination only has data for page 1 (10 rows), but total is 183 — pages 2+ show the same 10 rows | Server-side pagination. |
| 🔴 | `isAdmin` / Admin badge + green "active" status dot are in the hardcoded data | Returned by team members endpoint. |
| 🔴 | Manager name strings (Savannah Holloway, Phillip Williams, Kaylee Baker Williams, Laura Garcia) are plain strings on each member; `manager_link` click has no handler | Should be `manager: { id, name }` with click → navigate to manager's profile. |
| 🟠 | Collapsible "Team Managers" card body shows a placeholder string when open | `GET /api/team/managers` + list of 53 manager rows. |
| 🟠 | `All Departments` dropdown, `Sort: Name` dropdown, and "..." more-menu are visual only | Wire to filter/sort/export controls. |
| 🟠 | Row and card `⋮` more-vertical action buttons have no handlers | Open action menu (Edit / Deactivate / Reset password / etc.). |
| 🟠 | Contact field on mobile card always shows "No phone" | Add phone to member model. |
| 🟡 | Search filters client-side only; server-side filter needed once paginated | Pass `search=` to API. |

---

## Team Training

### `frontend/src/components/TeamTraining.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | `TABS` top nav items (Progress, Plans, New Hires, Assessments, Community) are static and only toggle local state | Replace with real routes under `/training/*` when those pages are built. |
| 🟠 | KPI cards (Active Trainees 25, Completion Rate 75%, New Hires 25, Active Plans 60) are hardcoded | `GET /api/training/stats` → `{activeTrainees, completionRate, newHires, activePlans}`. |
| 🟠 | `DEPARTMENTS` progress (FOH 81, Drive Thru 100, Kitchen 16, Management 90) hardcoded | `GET /api/training/progress-by-department`. |
| 🟡 | "By Department / Recent Activity" sub-tab — Recent Activity shows empty placeholder only | `GET /api/training/recent-activity` once event log exists. |
| 🔴 | `TRAINEES` list (10 hardcoded employees w/ initials, plan, progress, status) is the core list rendered on the page | `GET /api/training/trainees?status={active\|completed}&page=&size=&q=`. |
| 🔴 | Trainee card delete button is a no-op (stopPropagation only) | `DELETE /api/training/trainees/:id`. |
| 🔴 | Trainee card click does nothing | Navigate to `/training/trainees/:id` detail view. |
| 🔴 | Search is client-side over the hardcoded `TRAINEES` array | Send `q=` to backend once list is paginated server-side. |
| 🟠 | Active/Completed pill toggle is local state only; does not re-fetch | Pass `status=` filter to API. |
| 🔴 | `Assign Training` button is a no-op | Open modal then `POST /api/training/assignments`. |
| 🟠 | Pagination (`TOTAL_TRAINEES = 25`, `PAGE_SIZE = 10`) hardcoded | Backend should own total + page metadata. |
| 🟡 | Hero date "Wednesday, April 22" is a static string | Should format from `new Date()` same as Dashboard. |

---

## Team Quick Links

### `frontend/src/components/TeamQuickLinks.js`

| Status | What | Notes |
|---|---|---|
| 🔴 | `links` is hardcoded empty array; page always renders the "No Quick Links Yet" empty state | `GET /api/team/quick-links` for the logged-in user/store. |
| 🔴 | Hero `Manage Categories` button is a no-op | Open categories modal → `GET/POST/PATCH/DELETE /api/team/quick-links/categories`. |
| 🔴 | Hero `Add Quick Link` button is a no-op | Open add-link modal → `POST /api/team/quick-links` with `{label, url, category, icon}`. |
| 🔴 | Empty-state `Add Your First Link` button is a no-op | Same add-link flow as above. |
| 🟡 | Greeting tagline "Keep your store's essential tools just one click away." is hardcoded copy | OK — static UI copy. |
| 🟡 | Hero date formats from client `new Date()` | Keep client-side; confirm store timezone. |

---

## Leadership 360° Evaluations

### `frontend/src/components/Leadership360Evaluations.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | KPI cards (Total Reviews 1, In Progress 1, Completed 0, Reviewed 0) hardcoded in `STATS` | `GET /api/leadership/360/stats`. |
| 🔴 | `EVALUATIONS` array (single Anthony Pope / Director / Leadership 360 - Directors, 50% progress, due Mar 2 2026, overdue) is hardcoded | `GET /api/leadership/360/evaluations?status=&q=`. |
| 🔴 | `New 360° Review` CTA is a no-op | Open create-review modal → `POST /api/leadership/360/evaluations`. |
| 🔴 | Evaluation card click does nothing (cursor-pointer only) | Navigate to `/leadership/360-evaluations/:id` detail view. |
| 🟠 | Tab `Templates` shows only an empty placeholder | `GET /api/leadership/360/templates` + create flow. |
| 🟠 | Pill filter (`all/in-progress/completed`) and search are client-side only | Send as query params once paginated. |
| 🟡 | Overdue flag is a static boolean on demo row | Derive server-side from `dueDate < now` & incomplete. |

---

## Team Development

### `frontend/src/components/TeamDevelopment.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | `POSITIONS` (All / Team Member / Trainer / Zone Leader / Shift Lead) defined inline | Keep in config; consider `GET /api/positions` if variable per store. |
| 🔴 | `members` array is hardcoded empty — page always shows "No team members found" | `GET /api/team-development/members?scope={my-team\|all}&position=&q=`. |
| 🔴 | Position counts all zero because `members` is empty | Derived from above API or separate `GET /api/team-development/counts`. |
| 🔴 | Hero `Edit Tracks` button is a no-op | Open tracks modal → `GET/PATCH /api/team-development/tracks`. |
| 🔴 | `My Team / All Teams` scope toggle is local only | Pass `scope=` in API call and persist preference. |
| 🟡 | Search and position-filter are client-side over the empty list | Move to server once list is real. |

---

## Auth / User

### (Wherever auth lives — `App.js` / context)

| Status | What | Notes |
|---|---|---|
| 🟠 | `user` prop widely defaults to `'Demo User'` / `'Demo'` in component fallbacks | Confirm there's a real auth flow and no component is ever rendered without a `user`. |
| 🟠 | Store name (e.g. "CFA I-410 & Rigsby" in nav) likely hardcoded | Pull from `user.store` / `GET /api/stores/me`. |
| 🟠 | Notification count badge is likely a placeholder | `GET /api/notifications/unread-count`. |

---

## Navigation / Routing

| Status | What | Notes |
|---|---|---|
| 🟠 | `onNavigate('cfadollars')` wired in Quick Actions but no matching page exists | Add route + page. |
| 🟠 | `onNavigate('setup-detail', setup)` in SavedSetups passes an object — current routing likely doesn't handle it | Needs route param or URL-based navigation. |
| 🟡 | Shift Summary links to `shift-summary-history` which exists but wasn't verified in this pass | |

---

## Template for future entries

```
### `path/to/Component.js`

| Status | What | Notes |
|---|---|---|
| 🔴/🟠/🟡 | [One-line description of the fake data] | [Endpoint or persistence requirement] |
```

---

_Last updated: 2026-04-24 — after 360° Evaluations & Team Development redesign._
