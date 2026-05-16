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
- ✅ **Resolved** — previously fake; now wired to real backend / proper UI.

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
| ✅ | "Require Team Member Initials" toggle now persists to `StoreSettings.foh_require_initials` (manager-only) and triggers an Initials FormModal before completion | Phase 17. |
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
| ✅ | ~~`templates` state hardcoded~~ — **resolved**: now loads from `GET /api/setup-sheets/templates/`. | |
| ✅ | ~~Card click navigates to `edit-template` with no real loader~~ — **resolved**: `SetupSheetTemplateEdit` page hydrates via `GET /api/setup-sheets/templates/:id/`. | |
| ✅ | ~~3-dot menu button is visual-only~~ — **resolved (Phase 13)**: `<ActionMenu>` with Open / Rename / Duplicate / Delete (manager+ gated), Rename `<FormModal>`, Delete `<ConfirmDialog>`, Duplicate via new `POST /api/setup-sheets/templates/:id/duplicate/`. | |

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
| ✅ | ~~`savedSetups` state hardcoded~~ — **resolved**: now loads from `GET /api/setup-sheets/`. | |
| � | Search filters client-side only (small dataset, fine for now) | Move to `?q=` once paginated. |
| ✅ | ~~"Sort by Date" button visual-only~~ — **resolved (Phase 13)**: `<ActionMenu>` with Date / Name / Owner client-side sort. | |
| � | Card click opens a "Coming soon" sentinel (Phase 13 wiring) | Build read-only Setup Detail view (`GET /api/setup-sheets/:id` already exists). |
| ✅ | ~~3-dot menu visual-only~~ — **resolved (Phase 13)**: `<ActionMenu>` with Open / Duplicate / Share / Delete (manager+ for Share/Delete), Share via `<UserPicker>` `<FormModal>`, Delete via `<ConfirmDialog>`. | |
| ✅ | ~~"Updated 12 minutes ago" static~~ — **resolved**: derived from `updated_at` via `relativeTime()` helper. | |

---

## Shift Summary

### `frontend/src/components/ShiftSummary.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~Shift Lead input was decorative (never sent in `buildPayload`)~~ — **resolved (Phase 13)**: input is now read-only and shows the auto-recorded current user. | |
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
| ✅ | ~~`TREND_POINTS` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/trend/?range=...`. | |
| ✅ | ~~`TOP_ITEMS` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/top-items/?range=...`. | |
| ✅ | ~~`kpis` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/kpis/`. | |
| ✅ | ~~`goals` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/goals/` and Phase 14 wires the pencil button to an Edit Goals `<FormModal>` that PATCHes them. | |
| ✅ | ~~Pen/edit button visual-only~~ — **resolved (Phase 14)**: opens Edit Goals `<FormModal>` (manager-tier gated). | |
| ✅ | ~~`range` selector visual-only~~ — **resolved**: every range change re-fetches `trend` and `top-items`. | |
| 🟠 | Sub-tabs By Day / By Meal / By Hour / Top Items / Timeline still show an empty placeholder panel | Each tab needs its own backend breakdown endpoint + chart/view. Deferred from Phase 14. |
| 🟡 | Top item rows have a chevron-down hinting expandable detail; no expand logic yet | Drill-down view; deferred. |

### `frontend/src/components/KitchenEquipment.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~`CATEGORIES` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/equipment/categories/`. | |
| ✅ | ~~`EQUIPMENT_BY_CATEGORY` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/equipment/?category=...`. | |
| ✅ | ~~Hardcoded schedule and status~~ — **resolved**: each card's schedule and status come from the equipment serializer. | |
| ✅ | ~~Running totals + upcoming badge hardcoded~~ — **resolved**: derived from real equipment + schedule data. | |
| ✅ | ~~History / Maint. / Clean / Issue buttons visual-only~~ — **resolved (Phase 14)**: History opens `<HistoryDrawer>` with real `GET /api/kitchen/equipment/:id/logs/`; Maint./Clean/Issue open a Log Action `<FormModal>` that POSTs to the logs endpoint. | |
| ✅ | ~~Schedule Done/Edit/Delete mini buttons visual-only~~ — **resolved (Phase 14)**: Done calls `complete/`, Edit opens the Schedule `<FormModal>`, Delete opens `<ConfirmDialog>`. | |
| ✅ | ~~Add Category button used `window.prompt`~~ — **resolved (Phase 14)**: opens an Add/Edit Category `<FormModal>` with auto-slug derivation. | |
| ✅ | ~~Manage Equipment / Settings buttons used chained `window.prompt`~~ — **resolved (Phase 14)**: top-right gear is now a per-category `+ Add Equipment` button; per-card 3-dot `<ActionMenu>` exposes Edit / Add Schedule / Delete. | |
| ✅ | ~~Upcoming tasks button used `window.alert`~~ — **resolved (Phase 14)**: opens a read-only `<HistoryDrawer>` titled "Upcoming Maintenance". | |
| 🟡 | Category drag/reorder + per-category delete not yet exposed in UI | Backend supports it; add Edit Category to a chip 3-dot menu if needed later. |

### `frontend/src/components/KitchenCleaning.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~`tasks` hardcoded empty array~~ — **resolved**: loads from `cleaningService.listGroupedByFrequency({ scope: 'kitchen' })`. | |
| ✅ | ~~`doneToday` / `totalToday` hardcoded~~ — **resolved**: derived from `today_completion` on each task. | |
| ✅ | ~~Frequency chips visual-only~~ — **resolved**: switching frequencies re-renders the list against grouped state. | |
| ✅ | ~~`History` button no-op~~ — **resolved (Phase 14)**: opens `<HistoryDrawer>` with `cleaningService.getHistory({ scope: 'kitchen' })`. | |
| ✅ | ~~`Add Task` button no-op + `window.prompt` chain~~ — **resolved (Phase 14)**: opens an Add Task `<FormModal>` with name + frequency dropdown. | |

### `frontend/src/components/KitchenChecklists.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~Hardcoded `TRANSITION_TASKS` / opening / closing seed lists~~ — **resolved**: loads real tasks via `kitchenService.listChecklistGrouped()`. | |
| ✅ | ~~`toggleTask()` was local-only~~ — **resolved**: calls `kitchenService.completeChecklistTask` / `uncompleteChecklistTask` with optimistic update. | |
| ✅ | ~~Sticky header History button no-op~~ — **resolved (Phase 14)**: opens `<HistoryDrawer>` with `getChecklistHistory({ range: '7d' })`. | |
| ✅ | ~~"Manage Positions" gear / "+" button used `window.prompt` chain~~ — **resolved (Phase 14)**: gear button removed; "+" opens an Add Task `<FormModal>` (shift dropdown + text). Per-row trash via `<ActionMenu>` + `<ConfirmDialog>`. | |
| 🟡 | Shift subtitle logic shows "✓ Done" when all complete, else `done/total` — derived from `shiftState` | Fine as-is. |

### `frontend/src/components/KitchenWasteTracker.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~`MENU_ITEMS_BY_PERIOD` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/menu-items/?meal=...`. | |
| ✅ | ~~`TODAY_ENTRIES` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/entries/?date=...`. | |
| ✅ | ~~Menu tile tap + Custom Entry not persisted~~ — **resolved**: both POST to `/api/kitchen/waste/entries/` with reason. | |
| ✅ | ~~X delete only mutates state~~ — **resolved**: calls `DELETE /api/kitchen/waste/entries/:id` with optimistic rollback. | |
| ✅ | ~~"Most Wasted: Filet / 12:15 PM" hardcoded~~ — **resolved (Phase 14)**: computed from `entries` (sum cost by item, latest timestamp wins). | |
| ✅ | ~~`WASTE_REASONS` hardcoded~~ — **resolved**: loads from `GET /api/kitchen/waste/reasons/` and the selected reason is POSTed with each entry. | |
| ✅ | ~~`⚙️ Items` and `💲 Prices` buttons no-op~~ — **resolved (Phase 14)**: both open the same Manage Menu Items `<FormModal>` with per-row Edit/Delete and `+ Add new item`. | |
| ✅ | ~~`📝 Bulk Entry` button no-op~~ — **resolved (Phase 14)**: opens a Bulk Entry `<FormModal>` with a qty input per item; submits one POST per non-blank row. | |
| ✅ | ~~`📅 Today` date chip no-op~~ — **resolved (Phase 14)**: opens a `<DatePicker>` modal and refetches entries for the chosen ISO date. | |
| ✅ | ~~`📝 Notes` button no-op~~ — **resolved (Phase 14)**: opens a "Coming soon" `<ConfirmDialog>` sentinel pointing users to Shift Summary. | |
| 🟠 | `Waste` / `Donations` mode toggle is visual only — Donations view is not implemented | Needs `GET /api/kitchen/donations/*` + UI. |

### `frontend/src/components/KitchenFoodSafety.js`

| Status | What | Notes |
|---|---|---|
| ✅ | ~~Hardcoded daypart tasks and temperature targets~~ — **resolved**: loads from `equipmentService.listSafetyTasks` and `listTemperatureTargets`. | |
| ✅ | ~~Record Temperature button used `window.prompt` chain~~ — **resolved (Phase 14)**: opens a Record Temperature `<FormModal>` (target picker + value + unit). | |
| ✅ | ~~History button used `window.alert(JSON.stringify())`~~ — **resolved (Phase 14)**: opens `<HistoryDrawer>` with `listRecentReadings`. | |
| ✅ | ~~Two column gear icons visual-only~~ — **resolved (Phase 14)**: each gear is now an `<ActionMenu>` with Add / Edit-per-row / Delete-per-row, backed by FoodSafetyTask + TemperatureTarget POST/PATCH/DELETE endpoints. Add/Edit open a `<FormModal>`. | |
| ✅ | ~~Hardcoded subtitles "0 remaining for morning" / "14/17 for morning"~~ — **resolved (Phase 14)**: derived from real loaded data (`activeTaskSubtitle`, `activeTempSubtitle`). | |
| 🟡 | Banner date is still a hardcoded "Monday, April 20" | Should use `getCurrentDate()` like the other kitchen pages — quick polish. |

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
| � | Search + filter pills filter client-side only; adequate until paginated | Pass to API when there are > ~50 rows. |
| � | Hero banner Analytics / Settings buttons open a "Coming soon" `ConfirmDialog` sentinel (Phase 12 wiring) | Build documentation analytics page + preferences modal (`GET /api/team/documentation/analytics`, `GET/PATCH /api/team/documentation/preferences`). |

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
| ✅ | `links` now loaded via `GET /api/team/quick-links/` and rendered with category-colored borders | Phase 16. |
| ✅ | Hero `Manage Categories` opens FormModal listing categories with ActionMenu (Edit / Delete) + "+ Add Category" sub-modal | Phase 16. |
| ✅ | Hero `Add Quick Link` opens FormModal (Label / URL / Icon / Category) — manager-only | Phase 16. |
| ✅ | Per-link ActionMenu (Edit / Delete) + ConfirmDialog wired (manager-only) | Phase 16. |
| ✅ | Empty-state CTA hidden for team members; copy switches to "your manager has not added any quick links yet" | Phase 16. |
| 🟡 | Greeting tagline "Keep your store's essential tools just one click away." is hardcoded copy | OK — static UI copy. |
| 🟡 | Hero date formats from client `new Date()` | Keep client-side; confirm store timezone. |

---

## Leadership (`/leadership`)

### `frontend/src/components/LeadershipDevelopment.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | `AREA_DEFS` map (12 areas × 4 metrics + 4–9 task templates per area) hardcoded inline | Move to backend: `LeadershipKpi` model (per-store, per-area metric defs + targets + values) + `LeadershipTask` model (per-area task templates). |
| 🟠 | Metric tiles always render `—` for the value (no current-value source) | Once `LeadershipKpi.values` exists, hydrate per-tile. Tile click should open Edit Value modal — currently a no-op `<button>`. |
| 🟠 | Today's Tasks completion is **local React state only** (`completedTaskIds` set) — toggling a task does NOT persist | `POST /api/leadership/tasks/:id/complete` (and a daily reset cron, or a `completed_for_date` join model). |
| 🟡 | Trend icon is hardcoded to a `minus` (no real trend data) | Compute from previous-period `LeadershipKpi.values`. |
| 🟡 | "Custom Area" tile uses placeholder metric labels (`Metric 1`, `Metric 2`, …) | Once a user picks Custom Area we should prompt for label + target inline. |
| ✅ | Development card now renders **two states at the same card size**: active enrollment with progress, OR a "Browse plans" CTA pill. Both navigate to `/dev-plans`. Active enrollment + progress hydrated from `GET /api/leadership/development-plans/`. | Backend `UserDevelopmentPlan` model is live (migration 0015). Catalog of plans (`DEV_PLANS` array) still hardcoded in `LeadershipDevPlans.js` — user is transcribing them 1 by 1. |

---

## Leadership > Development Plans (`/dev-plans`)

### `frontend/src/components/LeadershipDevPlans.js`

| Status | What | Notes |
|---|---|---|
| 🟠 | `DEV_PLANS` catalog hardcoded as a frontend constant. **The Heart of Leadership** is fully populated (19 lessons w/ verbatim copy from LD Growth); other plans pending user transcription | Each new plan gets `key`, `name`, `tagline`, `description`, `category`, `icon`, `accent`, optional `estimated_hours`, and a `lessons: []` array. `total_steps` is auto-computed from `lessons.length`. |
| ✅ | Per-user enrollment status (`active`/`completed`) + `current_step` / `total_steps` persisted via `UserDevelopmentPlan` (migration `0015_user_development_plan.py`) | Endpoints: `GET/POST /api/leadership/development-plans/`, `PATCH /:id/`, `DELETE /:id/`. `completed_at` auto-stamped. |
| ✅ | **1-active-plan-per-user** enforced on backend (`UserDevelopmentPlanViewSet.perform_create/_update`) **and** mirrored client-side: blocked Start / Restart buttons show "Active plan in progress" with a tooltip. Successful enroll deep-links into the plan detail page. | |
| ✅ | Active cards now expose a **"View plan"** button (navigates to `dev-plan-detail`). Manual "Mark complete" was removed in favor of per-lesson check-offs that auto-flip the enrollment to `completed`. | |
| ✅ | Filter pills (All / Active / Completed / Available) with live counts | Counts derived locally from cross-reference of `DEV_PLANS` × user enrollments. |

---

## Leadership > Plan Detail (`/dev-plan-detail/:planKey`)

### `frontend/src/components/LeadershipPlanDetail.js`

| Status | What | Notes |
|---|---|---|
| ✅ | Pixel-match LD Growth's plan detail page: back arrow + title + `X% complete · N of M lessons` + Unenroll + purple progress bar + accordion lesson cards with type-colored icons (Activity = emerald target, Reading = blue book, Reflection = amber lightbulb, Assessment = purple clipboard, Video = red play). | |
| ✅ | Per-lesson completion persisted via `LessonCompletion` model (migration `0016_lesson_completion.py`). Endpoints: `GET /api/leadership/lesson-completions/?enrollment=:id`, `POST`, `DELETE /:id/`. | Round-trip on every toggle; refresh of enrollment after each so `progress_percent` + status stay in sync. |
| ✅ | Auto-complete: when the last lesson is checked the enrollment auto-flips to `status='completed'` with `completed_at=now()` (sync logic in `LessonCompletionViewSet._sync_enrollment`). Unchecking a final lesson rolls it back to `active`. | |
| ✅ | Unenroll button at the top opens a `ConfirmDialog`; on confirm the enrollment row is deleted (CASCADE drops all `LessonCompletion` rows) and the user lands back on the library. | |
| 🟡 | Markdown rendering is intentionally tiny: `**bold**`, `•` bullets, paragraph splits. No links/images yet — every LD Growth lesson body the user has shared is plain text + emoji. | If we add resource links (TED Talk URL, Purdue worksheet PDF, etc.), extend `renderInline()` in `LeadershipPlanDetail.js`. |
| 🟡 | Lesson "notes" field on `LessonCompletion` is stored but not yet exposed in the UI | Future: a notes textarea inside the expanded lesson body for self-documentation. |

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

_Last updated: 2026-05-15 — **Manager assignment + non-destructive Pause**. New migration `0018_dev_plan_assignment.py` adds `deadline` (Date) and `assigned_by` (FK User) to `UserDevelopmentPlan`. `UserDevelopmentPlanViewSet.perform_create` now accepts an optional `user` field — when present, only managers-or-above can use it, and the target user must share the requester's store; on success the row is stamped `assigned_by=requester`. New regression suite `api/test_dev_plans.py` (6 tests, all passing) proves: (a) `GET /api/leadership/development-plans/` returns ONLY the requester's enrollments — never another user's, even within the same store; (b) managers can assign cross-user, non-managers cannot; (c) cross-store assignment is rejected; (d) self-start with no `user` defaults to the requester. The "Remove" button on **Active** library cards is now a **Pause** button — flips `status='paused'` instead of deleting, so progress is preserved for later resumption. Destructive Remove is still available on Paused / Completed cards, with a clearer ConfirmDialog warning that progress is permanently deleted. Library header gains a manager-only **"Assign to team member"** button → `FormModal` with searchable `UserPicker` + plan dropdown + optional `DatePicker` deadline. Cards and the plan-detail header now show **deadline pills** (blue normal, red overdue) and **"Assigned by {manager}"** pills. Frontend service has `assignDevPlanToUser({ user_id, plan_key, total_steps, deadline })`._
