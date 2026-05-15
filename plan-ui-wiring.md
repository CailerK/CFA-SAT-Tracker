# Plan: Make Every Page Actually Interactive

_Audit + execution plan for wiring the dead UI controls across the app._
_Written: 2026-05-14. Backend status: fully migrated. This plan covers frontend only._

---

## Why this plan exists

The backend migration is done — every page loads real data and saves changes that persist. **But many of the buttons, menus, and inputs that *look* interactive don't actually do anything yet.** This document inventories every dead control across all 41 React components and lays out a phased plan to fix them.

The audit categorizes each fix by effort:

- **(a) Pure wiring** — backend endpoint exists, just need `onClick` + a small modal or input. Fast.
- **(b) Small backend addition** — endpoint missing, but conceptually small (e.g. a "delete note" endpoint, a sort param).
- **(c) Real UI work** — needs a properly designed modal/page (the `window.prompt`-driven flows mostly fall here).

**The single biggest pattern** across the app is that ~15 features use chained `window.prompt()` calls in place of proper modals — they technically save to the backend, but the UX is so bad they're effectively unimplemented. These are all category **(c)**: the backend is ready, the UI just needs to exist.

---

## A. Shared infrastructure to build first

Before fixing per-page issues, build these reusable pieces once:

### A1. A generic `<ActionMenu>` component (3-dot menu popover)
Replaces the dozen scattered `window.prompt('Type edit, delete, etc.')` patterns. Renders a floating menu when the 3-dot button is clicked.

**Props**: `actions: [{ label, icon?, onClick, destructive?: bool }]`, `disabled?: bool`.

**Used by**: SetupSheetTemplates cards, SavedSetups cards, TeamMembers row, TeamTraining row, Leadership360Evaluations cards, QuickLinks rows, KitchenEquipment cards, KitchenChecklists rows, KitchenCleaning rows, CleaningMaintenance rows, Vendors cards, Calendar events, TeamSurveys cards, etc.

### A2. A generic `<ConfirmDialog>` component
Replaces every `window.confirm(...)` call with a styled modal that matches the app's red theme. Single component, used everywhere.

### A3. A generic `<FormModal>` shell + form-field building blocks
Most "Add X" / "Edit X" modals are 90% the same structure (header + scrollable body of fields + footer with Cancel/Save buttons). Build once, use 20+ times.

**Building blocks**: `<TextField>`, `<TextArea>`, `<SelectField>`, `<NumberField>`, `<DatePicker>`, `<TimePicker>`, `<ChipMultiSelect>`, `<UserPicker>` (combobox over `/api/team/members/`).

### A4. A `<RouteOrPlaceholder>` helper
For cards/rows that link to a "not implemented yet" page, use the existing `__not_implemented__:Name` sentinel pattern we set up for CFA Dollars / Safe Counting.

**Once A1–A4 exist, every per-page fix below becomes a 5–30 minute wire-up.**

---

## B. Phased execution plan

Phases are ordered roughly by daily-use frequency × user value. Each phase is independently shippable.

### Phase 11 — Foundation: build A1–A4 shared components
**Goal**: stop reinventing modals.

- [ ] Build `<ActionMenu>` (popover with click-outside-to-close).
- [ ] Build `<ConfirmDialog>` (replaces every `window.confirm`).
- [ ] Build `<FormModal>` + the 8 field components above.
- [ ] Refactor `CustomizeActionsModal` to use `<FormModal>` as a sanity check (it's already working — just a smoke-test of the new shell).

**Estimate**: 1 session. **Unblocks**: every later phase.

---

### Phase 12 — Team Members + Documentation
**Why first**: the Team page is the most-visited admin page and currently has no Add Member button at all.

#### TeamMembers.js
- [ ] **Add Member button** in the header (currently doesn't exist). Opens an Add Member `<FormModal>` with: name, email, phone, role, departments (multi-select), shift preference, is_admin toggle. Calls `teamService.createMember`. (a)
- [ ] **"All Departments" dropdown** in filter bar → use `<SelectField>` populated by departments from `/api/team/members/?dept=` or a new departments endpoint. Filters list. (a)
- [ ] **"Sort: Name" dropdown** → add `?ordering=` query param to the backend list endpoint OR sort client-side. (b — tiny backend tweak)
- [ ] **3-dot menu on each row** (`<ActionMenu>`): Edit, Deactivate, Reset Password, Reassign Manager. Edit opens prefilled `<FormModal>`. (a)
- [ ] **More-options ⋮ icon in header** → bulk actions popover (Export CSV, Bulk Email). (b — needs export endpoint)
- [ ] **Manager-tier guard**: hide Add Member + 3-dot menu for team_member role. (a)

#### TeamDocumentation.js
- [ ] **Add Record button** in the header (currently doesn't exist). `<FormModal>` with: employee (user picker), kind (admin / warning / pip / recognition), title, body, status. Calls `teamService.addEmployeeRecord`. (a)
- [ ] **Click an employee card** → opens an Employee Records detail drawer/page showing full history. Calls `teamService.listEmployeeRecords`. (a)
- [ ] **Per-card trash icon** → `<ConfirmDialog>` then `teamService.deleteRecord` for the latest record. (a)
- [ ] **Banner Analytics icon** → currently dead. Decision: route to KitchenAnalytics-style page or remove. (b)
- [ ] **Banner Settings icon** → currently dead. Probably should remove or wire to a doc-type config modal. (c)

**Estimate**: 1 session.

---

### Phase 13 — Setup Sheets + Shift Summary History
**Why**: managers use these weekly; ShiftSummaryHistory filters are 100% dead.

#### SetupSheetTemplates.js
- [ ] **3-dot menu on each template card** (`<ActionMenu>`): Open, Duplicate, Rename, Delete. Currently it just does a confirm-then-delete. (a — backend supports all)
- [ ] Replace the inline `confirm()` with `<ConfirmDialog>`.

#### SavedSetups.js
- [ ] **Card click should OPEN the setup** (currently it duplicates — surprising). Needs a Setup Detail view (drawer or page). Calls `setupSheetsService.getSheet`. (a + c for the detail view)
- [ ] **Sort by Date button** → real dropdown (Date, Name, Owner). (a)
- [ ] **3-dot menu** (replace `window.prompt`): Open, Share, Duplicate, Delete. (a)
- [ ] **Share UX**: replace `window.prompt('Type names')` with a `<UserPicker>` modal. (a)

#### ShiftSummary.js
- [ ] **Shift Lead input** is decorative (the value isn't included in `buildPayload`). Decision: either drop the field OR extend `ShiftSummary` model to store a custom lead string and include it in payload. (b)

#### ShiftSummaryHistory.js
- [ ] **All 4 filter "dropdowns"** (date range, shift, status, summary) are plain `<div>`s with chevrons — no menu at all. Convert to real `<SelectField>`s and pass to `shiftSummaryService.list({range, shift, status})`. (a)
- [ ] **PDF button** → either drop OR wire to a backend PDF export. (b)
- [ ] **Print button** → just `window.print()`. (a, 1 line)
- [ ] **Click a summary card** → open a Shift Summary detail view (read-only) showing the full submitted form. (a + c)

**Estimate**: 1.5 sessions.

---

### Phase 14 — Kitchen domain (the prompt-flood)
**Why**: every kitchen page uses `window.prompt`. Highest UX gain.

#### KitchenChecklists.js
- [ ] **Add Task button**: replace `window.prompt('Task text?')` with an Add Task `<FormModal>` (shift + text + order). (a)
- [ ] **Per-row trash button**: render the trash icon (currently not even rendered on the screen). (a)

#### KitchenCleaning.js
- [ ] **Add Task button**: same Add Task `<FormModal>` reused. Includes frequency + supplies + days. (a)
- [ ] **History button** → currently does `window.alert(JSON.stringify(history))`. Replace with a history drawer showing the data nicely. (a)

#### KitchenEquipment.js
This whole page is prompt-driven. Build modals for:
- [ ] **Add Category** modal. (a)
- [ ] **Edit Category** modal. (a)
- [ ] **Add Equipment** modal (name + icon + status + category). (a)
- [ ] **Edit Equipment** modal. (a)
- [ ] **Add Schedule** modal (task name + cadence + next_due). (a)
- [ ] **Edit Schedule** modal. (a)
- [ ] **Log Action** modal (kind: history / maintenance / cleaning / issue, notes). (a)
- [ ] Card-level 3-dot menu using `<ActionMenu>`. (a)

#### KitchenFoodSafety.js
- [ ] **Two `column-settings-btn` gears** at the top of safety tasks + temperature targets columns. Wire to "Manage tasks" / "Manage targets" admin modals. Needs backend POST endpoints for `FoodSafetyTask` and `TemperatureTarget` (currently only GET is exposed). (b + a + c)
- [ ] **Record Temperature** modal (replace `window.prompt`): target picker + value + unit. Calls `equipmentService.logReading`. (a)
- [ ] **View History panel** (replace `window.alert`). (a + c)
- [ ] Fix hardcoded subtitle bug "0 remaining for morning" / "14/17 for morning" — derive from state. (a, bug)

#### KitchenWasteTracker.js
- [ ] **⚙️ Items button** → Manage Menu Items modal (list + add/edit/archive). Backend `createMenuItem` exists; add PATCH endpoint for updating. (a + tiny b)
- [ ] **💲 Prices button** → either fold into Items modal (recommended) OR a separate Prices grid. (b)
- [ ] **📝 Bulk Entry button** → Bulk Entry modal (select multiple items + qty at once). Backend already accepts individual entries. (a)
- [ ] **📝 Notes button** → decide what this does (per-day store notes?) or remove. (b — needs a model or removal)
- [ ] **📅 Today date chip** → wire to a date picker, refetch entries for selected date. (a)

#### KitchenAnalytics.js
- [ ] **Edit Goals pencil** → replace 3 chained prompts with Edit Goals `<FormModal>`. (a)
- [ ] **Sub-tabs (By Day / By Meal / By Hour / Top Items / Timeline)** — currently show "Coming soon" placeholders. Need backend endpoints for each breakdown. (b — 3 new endpoints, then UI charts)
- [ ] **Top wasted item row click** → drill-down panel showing entries for that item. Backend would need an "entries-by-menu-item" query (small b).

**Estimate**: 2–3 sessions.

---

### Phase 15 — Leadership + Training ✅ DONE (2026-05-15)
**Why**: high-value but lower-frequency than kitchen.

#### Leadership360Evaluations.js
- [x] **Evaluation card click** → sentinel ConfirmDialog. *Full take-eval UI (rating form, results dashboard) deferred to a future phase — backend `respondToEvaluation`/`getEvaluation` are live.*
- [x] **Template card actions** (replace `window.prompt('Type edit or delete')`) with `<ActionMenu>`: Edit + Delete (Duplicate deferred — not on backend yet).
- [x] **Create Template flow** — new Create/Edit Template `<FormModal>` (TextField + TextArea + NumberField), manager-gated.

#### New360Evaluation.js
- [x] **"+ Create Additional Template" button** → opens inline Create Template `<FormModal>` that auto-selects the newly created template. Manager-gated. Dashboard now passes `user` prop.

#### TeamTraining.js
- [x] **Plans tab** — renders `plans` list with create/edit (FormModal) + delete (ConfirmDialog) per row via `<ActionMenu>`. Service methods `createPlan`/`updatePlan`/`deletePlan` added.
- [x] **New Hires tab** — filters `teamMembers` by `created_at` >= now − 30d. *Required backend change: `TeamMemberSerializer` now exposes `created_at`.*
- [x] **Assessments + Community tabs** — "coming soon" placeholder cards (deferred MVP).
- [x] **Trainee row click** → "Trainee detail coming soon" sentinel. *Full progress drawer with Mark Complete/Pause deferred — backend `updateTrainee` is live.*
- [x] **Assign Training button** — Assign Training `<FormModal>` with 2x `<SelectField>` (member + plan), manager-gated. Replaces 2-prompt chain.
- [x] **Delete trainee** — `<ConfirmDialog>` replaces `window.confirm`.

#### LeadershipDevelopment.js
- [x] **Settings gear** — wired to "coming soon" `<ConfirmDialog>` sentinel describing future per-area customization.
- [x] **"See all" in notes** → opens `<HistoryDrawer>` listing every note with timestamp.
- [x] **Development card progress** — now computed as `mean(progress_percent)` across the current user's 360 evaluations where they're the evaluatee. Replaces hardcoded `0%`.
- [x] **Per-note delete button** — hover-trash icon on each note → `<ConfirmDialog>`. Service `deleteNote` added; backend already supports DELETE via `LeadershipNoteViewSet` (no backend change).

#### TeamDevelopment.js
- [x] **Edit Tracks button** — opens Manage Tracks `<FormModal>` listing all tracks with per-row `<ActionMenu>` (Edit/Delete) wired to Create/Edit Track `<FormModal>` and delete `<ConfirmDialog>`. Replaces 5-prompt chain.
- [x] **Member row click** → Update Progress `<FormModal>` with `<SelectField>` (status) + two `<NumberField>`s (current_step, completed_steps) calling `updateProgress`. Manager-gated.

**Net change**: 5 components fully wired, 1 service method added (`deleteNote`), 3 service methods added (`createPlan/updatePlan/deletePlan`), 1 backend field exposed (`User.created_at` on `TeamMemberSerializer`). 8 `window.prompt`/`window.confirm` chains eliminated.

---

### Phase 16 — Calendar + Surveys + QuickLinks ✅ _(done 2026-05-15)_
**Why**: these have working data but bad modals.

#### Calendar.js ✅
- [x] **Click empty day cell** → New Event modal (pre-fills date). Manager-only.
- [x] **Click existing event** → Edit Event FormModal with Delete in left footer slot → destructive ConfirmDialog.
- [x] **Category color legend** is now toggleable: clicking dims+strike-throughs that category; "Show all" pill appears whenever filters are active.
- [x] Dashboard now passes `user` so `isManagerOrAbove` gating works.

#### TeamSurveys.js ✅
- [x] **Survey card click** → "Take Survey — coming soon" sentinel for team members; "Survey results — coming soon" sentinel for managers (full take/results UI deferred — backend `respond()` + `getResults()` already live).
- [x] **Quick / Advanced Survey buttons** → replaced 3-prompt chain with **Create Survey FormModal**: TextField title + DatePicker close + Toggle anonymous + dynamic question list. Advanced adds kind SelectField + "+ Add Question".
- [x] **Dashboard view** now renders a 4-card status breakdown (Active/Closed/Drafts/Archived) with percent-of-total + total-responses footer.
- [x] **Per-card 3-dot menu**: Extend (PATCH `closes_at`), Close (`status=closed`), Archive (`status=archived`), Delete (DELETE).
- [x] Fixed long-standing "Back Home" bug — Dashboard was passing `onBack` but TeamSurveys reads `onNavigate`.

#### TeamQuickLinks.js ✅
- [x] **Add Quick Link** → replaced 4-prompt chain with **Add Quick Link FormModal** (Label + URL + Icon + Category select). Edit reuses the same modal.
- [x] **Manage Categories** → replaced 2-prompt chain with **Manage Categories FormModal**: lists every category with color swatch + ActionMenu (Edit / Delete) + "+ Add Category" sub-modal (Name + Color SelectField).
- [x] **Per-link ActionMenu** (Edit / Delete) appears on every card for managers; opens ConfirmDialog before destroying.
- [x] Empty-state CTA hidden for team members; copy switches to "your manager has not added…".

**Deferred (not blocking; tracked in `FAKE_DATA.md` for follow-up phases)**:
- Take Survey UI (one-screen-per-question form + submit).
- Survey Results UI (per-question chart + response-rate bar).
- 360 Take/View Evaluation UI (was deferred from Phase 15).

**Backend additions**: none required. Surveys, QuickLinks, and QuickLinkCategories already exposed PATCH/DELETE via `ModelViewSet`.

**Service additions**: `surveysService.update`, `teamService.updateQuickLink`, `teamService.updateLinkCategory`, `teamService.deleteLinkCategory`.

**Net change**: 3 components fully wired, 12+ `window.prompt`/`window.confirm` chains eliminated, 4 new service methods, 1 long-standing prop-name bug fixed (Dashboard ↔ TeamSurveys).

**Estimate**: 1.5 sessions.

---

### Phase 17 — FOH + Cleaning polish
**Why**: low backlog, mostly small bugs.

#### FOHTasks.js
- [ ] **"Require Team Member Initials" toggle** → persist to `StoreSettings.foh_require_initials` (backend already has this field!). When ON, `toggleTask` should prompt for initials before completing. (a + c)

#### TaskHistory.js
- [ ] **Date picker button** → wire to a `<DatePicker>` range selector. Backend already accepts arbitrary ranges. (a + c)

#### CleaningMaintenance.js
- [ ] **Header has 3 buttons** (settings, history, settings) with no handlers and one is a duplicate. Audit: keep History (wire to `cleaningService.getHistory`), drop the duplicate settings, decide on the remaining gear. (a)

**Estimate**: half a session.

---

### Phase 18 — Settings + Misc polish
**Why**: cleanup pass at the end.

#### Settings.js
- [ ] **Two "Reset to Default" buttons** — handlers exist but no onClick wiring. (a, 5 minutes)
- [ ] Audit per-panel gear/icon buttons.

#### NotificationDropdown.js
- [ ] **Per-row dismiss "X"** currently both marks-read AND navigates — should just mark-read. (a)

#### TeamChat.js
- [ ] **"+ New channel" button** doesn't exist in the UI. Add it. `createChannel` endpoint exists. (a)
- [ ] **Channel-creation gating** to managers? (a, decision)

**Estimate**: half a session.

---

## C. Backend additions needed (collected from above)

These are the (b) items — small backend endpoints to add as part of the relevant phase:

| Endpoint | Phase | Used by |
|---|---|---|
| `GET /api/team/members/?ordering=...` (param) | 12 | TeamMembers sort |
| `POST /api/team/exports/` (CSV) | 12 | TeamMembers bulk |
| `POST /api/kitchen/food-safety/tasks/` | 14 | KitchenFoodSafety gear |
| `POST /api/kitchen/food-safety/temperature-targets/` | 14 | KitchenFoodSafety gear |
| `PATCH /api/kitchen/waste/menu-items/:id/` | 14 | Items/Prices manager |
| `GET /api/kitchen/waste/breakdown/?dim=meal|day|hour` | 14 | KitchenAnalytics sub-tabs |
| `GET /api/kitchen/waste/entries/?menu_item=...` | 14 | KitchenAnalytics drill-down |
| `DELETE /api/leadership/notes/:id/` | 15 | LeadershipDevelopment |
| `GET /api/leadership/360/progress/:user_id/` | 15 | LeadershipDevelopment card |
| `GET /api/training/new-hires/` (or filter param) | 15 | TeamTraining New Hires tab |
| `POST /api/shift-summaries/:id/export/` (PDF) | 13 | ShiftSummaryHistory |
| `GET /api/surveys/:id/stats/` | 16 | TeamSurveys dashboard |

None of these are big — most are 30–60 lines each in `views_*.py`.

---

## D. Per-page testing checklist for the wiring work

For each fix above, the QA pattern is the same:

1. **Click works.** Button does something other than nothing.
2. **The thing it claims to do happens.** Backend record actually got created/updated/deleted.
3. **The list reflects the change.** No refresh needed.
4. **Permission gating.** Manager-only actions hidden or blocked for team_member. (Use `demouser@gmail.com / demouser` to test.)
5. **Optimistic update + rollback.** If the request fails, the UI shouldn't lie about success.
6. **`window.prompt` / `window.confirm` is gone** from this code path.

These should be added to `TESTING_CHECKLIST.md` as a Phase 11–18 section once each phase ships.

---

## E. Estimate summary

| Phase | Scope | Sessions |
|---|---|---|
| 11 | Shared components (ActionMenu, ConfirmDialog, FormModal, fields) | 1 |
| 12 | Team Members + Documentation | 1 |
| 13 | Setup Sheets + Shift Summary History | 1.5 |
| 14 | Kitchen (5 sub-pages, 20+ modals) | 2–3 |
| 15 | Leadership + Training | 2 |
| 16 | Calendar + Surveys + QuickLinks | 1.5 |
| 17 | FOH + Cleaning polish | 0.5 |
| 18 | Settings + Misc polish | 0.5 |
| **Total** | | **~10 sessions** |

---

## F. Suggested ordering for the user

If you can only commit to a few phases right now, I'd prioritize:

1. **Phase 11 first** — the shared components unlock everything else and you'll start to see a consistent feel.
2. **Phase 12 next** — Team Members is the most "obviously broken" page (no Add Member button at all).
3. **Phase 14** — Kitchen prompts are the most embarrassing thing if anyone demos the app.
4. **Phase 13** — Setup Sheets is high daily value but only used by managers.
5. The rest in declared order.

When you're ready, I'll start with Phase 11. Or tell me to jump to a specific phase if you have a different priority.
