# Frontend Filler Audit — 2026-05-15

> Goal: catalogue every place in the frontend that still feels like **filler / a black box / a placeholder**, so you can go gather the real content (copy, programs, evaluation rubrics, templates, etc.) and we can wire each one up properly.
>
> All 18 phases of `plan-ui-wiring.md` are now done — every modal, button, and prompt has been replaced with real backend-wired controls. **What's left is _content + missing flows_, not plumbing.**

---

## Legend

- 🔴 **Page is mostly a shell** — needs new copy / structure + backend content from you.
- 🟠 **Feature is dead** — wired sentinel ("coming soon"), but the actual flow doesn't exist yet.
- 🟡 **Cosmetic / minor** — fallback string, hardcoded date, etc.
- 🆕 **What to copy/gather** — what I need from you (LD Growth screenshots, real program data, real templates, etc.).

---

## A. Pages where the **whole page** is a shell and needs structured content

### 1. **Leadership** (`/leadership` → `LeadershipDevelopment.js`) � — _layout shipped 2026-05-15_

**Status update**: page rebuilt to pixel-match LD Growth `/leadership/dashboard`. Sidebar renamed `Leadership Development` → `Leadership`. New layout includes:
- **Header** — `Hey, {firstName}` + dynamic today's date + gear (no longer hardcoded `Apr 20`)
- **Manage Areas modal** — gear opens a `FormModal` with the 12-area grid (replaces inline grid + sentinel)
- **My Numbers** — per-selected-area scorecard sections, each with a 2×2 grid of metric tiles (label + target + value `—` + edit/trend icons)
- **Today's Tasks** — rolled-up tasks across all selected areas, with progress bar + `+N more` collapse
- **Development card** — purple grad-cap tile linking to 360°, with computed progress (existing wiring preserved)
- **Notes** — input + recent list + See-all drawer + delete (existing wiring preserved)

What's still filler / needs backend:
- **`AREA_DEFS` is hardcoded** in `LeadershipDevelopment.js` (per-area metric defs + task templates). Pending real backend: `LeadershipKpi` model (per-store, per-area definitions + targets + current values) and `LeadershipTask` model (per-area task templates with completion records).
- **Metric values render as `—`** because no `LeadershipKpi` data exists yet. Tile click should open an Edit Value modal but is currently a no-op `<button>`.
- **Today's Tasks completion is local state only** — toggling a circle marks the task done in React state but does not persist.

✅ **The Development card is no longer a sentinel** — see item 1b below.

🆕 **What to copy/gather (next)**:
- For each area: **real metric labels + targets** (LD Growth shows Kitchen: Taste Score / Food Cost Gap / Waste $ / Food Safety Score — confirm these match your dataset).
- For each area: **real task templates** that should appear daily / weekly / monthly.
- **Where do metric values come from?** Manual entry (an Edit Value modal)? Pulled from another module (waste, safety, sales)?
- **Per-area task completion model** — daily reset? per-user? Manager sign-off?

---

### 1b. **Development Plans library + Plan Detail** (`/dev-plans`, `/dev-plan-detail/:key`) � — _shipped 2026-05-15_

**Status update**: full end-to-end flow shipped. Library + detail + per-lesson completion + 1-active-plan enforcement.

What works now:
- **Backend models** (migrations `0015_user_development_plan.py`, `0016_lesson_completion.py`):
  - `UserDevelopmentPlan` — per-user enrollment with `plan_key / status / current_step / total_steps / completed_at`. Unique `(user, plan_key)`.
  - `LessonCompletion` — per-lesson record under an enrollment, with `lesson_key`, `completed_at`, optional `notes`. Unique `(enrollment, lesson_key)`.
- **Business rules** enforced server-side in `UserDevelopmentPlanViewSet`:
  - **1-active-plan-per-user**: `perform_create` rejects a new `active` enrollment if another exists; `perform_update` rejects reactivation under the same condition.
  - **Auto-status transitions**: `LessonCompletionViewSet._sync_enrollment()` recomputes `current_step` from completion count and flips `status='completed'` (with `completed_at=now()`) when all lessons are done — and rolls back to `active` if a completion is deleted below the threshold.
- **Library page** (`LeadershipDevPlans.js`) — three card states with KPI strip and All/Active/Completed/Available filter pills:
  - **Available** → "Start plan" (blocked + relabeled "Active plan in progress" when another plan is active).
  - **Active** → Remove + **View plan** (navigates to detail).
  - **Completed** → Remove + Restart (also blocked when another plan is active).
  - All mutations optimistic with rollback; server-side error messages surfaced.
- **Plan detail page** (`LeadershipPlanDetail.js`) — pixel-match LD Growth `/leadership/plans/:key/tasks`:
  - Header: back arrow + title + `X% complete · N of M lessons` + Unenroll.
  - Purple progress bar.
  - Lesson list with type-colored icons (Activity=emerald target, Reading=blue book, Reflection=amber lightbulb, Assessment=purple clipboard, Video=red play).
  - Click row → accordion expands the description (tiny markdown renderer: `**bold**`, `•` bullets, paragraphs).
  - Click the right-side check pill → toggles completion (optimistic + auto-rollback on failure). Auto-flip to completed when all lessons checked.
- **Heart of Leadership** is fully populated with all 19 lessons + verbatim copy from LD Growth, including the **Reading Focus** bullet lists and 📝 **Completion Requirement** blocks. `total_steps` auto-derives from `lessons.length`.
- **Dashboard Development card** is now smart: clicking it routes to `/dev-plan-detail/:planKey` when a plan is active, else to the library.

What's still filler:
- **Plan catalog is still hardcoded** in `DEV_PLANS` inside `LeadershipDevPlans.js`. Heart of Leadership is the only fully-populated entry. Future plans get added as new objects with their own `lessons[]` arrays.
- **No resource links** inside lesson bodies yet. Several lessons reference external resources (Brené Brown TED Talk, Purdue self-assessment worksheet, Mark Miller's *Heart of Leadership* book, etc.) but the bodies are plain text. When the user shares URLs we extend `renderInline()` in `LeadershipPlanDetail.js` to handle `[text](url)` markdown.
- **`LessonCompletion.notes`** is stored but no UI exposes it yet — future polish: a notes textarea inside each expanded lesson body for self-documentation/manager review.

🆕 **What to copy/gather (next, plan-by-plan)**:
- Each new plan's metadata block: `name`, `tagline`, `description`, `category`, `icon`, `accent`.
- Each plan's lesson list with type / time / body copy (same format as Heart of Leadership).
- Any resource URLs the lesson bodies should link to.

---

### 2. **Team Development** (`/team-development` → `TeamDevelopment.js`) 🔴

What works now:
- Position chips (All / Team Member / Trainer / Zone Leader / Shift Lead) ✅
- Member rows loaded from backend ✅
- Manage Tracks FormModal + Create/Edit/Delete Track ✅
- Update Progress FormModal per member ✅
- `scope` toggle (My Team / All Teams) ✅

What's filler:
- The 5 positions (Team Member, Trainer, Zone Leader, Shift Lead) are **hardcoded inline** with icon + color — no per-track program content behind them.
- **"Update Progress" only stores `status / current_step / completed_steps` numbers** — there are no actual **named steps** to complete. It's a counter, not a curriculum.
- No per-member **profile / detail page** — clicking just opens Update Progress.

🆕 **What to copy/gather**:
- For each **position track** (Team Member → Trainer → Zone Leader → Shift Lead, etc.): the ordered list of **step names**, each step's **requirements** (e.g. *"Complete X training"*, *"Manager sign-off on Y"*, *"Submit observation report"*), and **how progression is measured**.
- Whether tracks are linear (must complete in order) or modular.
- Whether each step has assets (training videos, PDFs, quizzes).

---

### 3. **Leadership 360° Evaluations** (`/leadership-360` → `Leadership360Evaluations.js`) 🟠

What works now:
- Evaluations list from backend ✅
- New 360° Review wizard (4 steps: leader / template / schedule / evaluators) ✅
- Templates list + Create/Edit/Delete Template ✅
- Stats cards live ✅
- Filters + search ✅

What's filler:
- **Clicking an evaluation card** opens a "Take / View Evaluation — coming soon" sentinel. The whole **Take Evaluation flow** (rating form, per-question scoring, comments, evaluator selection sub-flow, final submission) doesn't exist.
- **Results dashboard** for completed evaluations doesn't exist (no per-evaluatee strengths/gaps view, no aggregate scoring).
- **Templates** are just `{ name, description, sections_count }` — there's no UI for editing the actual **questions inside a template**. So a template called "Director Leadership Review" with `sections_count: 6` is just a name; the 6 sections don't exist anywhere.

🆕 **What to copy/gather**:
- The **default 360° template content**: section headings, the questions inside each section, the rating scale (1–5? 1–10? Likert?), which sections are optional vs required.
- Whether evaluators see all sections or only ones tagged for their evaluator_type (peer vs manager vs direct report).
- The **results view design**: what does the evaluatee see when their review closes? What does their manager see?
- The "Take Evaluation" UX — one section at a time, or all questions on one page?

---

### 4. **Team Evaluations** (`/team-evaluations` → `TeamEvaluations.js`) 🔴

What it is right now: a **9-line file** that re-exports `Leadership360Evaluations`. So clicking "Evaluations" in the sidebar dumps you onto the same 360 page. The original LD Growth `/evaluations` page (per FAKE_DATA.md) had 4 top-level tabs — `Evaluations`, `Scheduled`, `Templates`, `Analytics` — and a sub-pill (`Team Overview` / `All Evaluations`) that have never been built.

🆕 **What to copy/gather**:
- The full **LD Growth `/evaluations` page** — what each of the 4 top tabs shows.
- What an **"Evaluation"** vs a **"360° Evaluation"** is in this app's mental model — are they the same thing? Two separate concepts? (I suspect "Evaluations" = annual / quarterly perf review and "360°" = the multi-rater feedback flow. Confirm.)
- The **Scheduled** tab content (calendar view of upcoming evals).
- The **Analytics** tab content (completion rates, trends).

---

### 5. **Team Training → Assessments + Community tabs** (`/team-training`) 🟠

What works now:
- Progress + Plans + New Hires tabs ✅
- Trainees list, search, status filter, Assign Training modal ✅
- KPI cards + by-department breakdown ✅

What's filler:
- The **Assessments** tab and the **Community** tab both render a hardcoded "— coming soon" empty state (lines 633–649 of `TeamTraining.js`).
- **Trainee row click** opens a sentinel — there's no trainee detail / per-step progress / "mark step complete" UI.
- **Recent Activity** sub-tab (under By Department) is empty.

🆕 **What to copy/gather**:
- **Assessments** content: are these quizzes? Skill checks? Sign-offs by managers? What's the data model?
- **Community** content: forum? FAQ? Recognition feed? Photos from training events?
- **Trainee detail page** layout: per-step progress, sign-off history, notes, ETA to completion.
- **Recent Activity** event types: assignments, completions, milestones — what gets logged?

---

### 6. **Kitchen Analytics → 4 deferred sub-tabs** (`/kitchen-analytics`) 🟠

What works now:
- Overview tab — trend chart, top items, KPIs, goals ✅
- Edit Goals FormModal (manager-only) ✅
- Range selector re-fetches data ✅

What's filler:
- **By Day**, **By Meal**, **By Hour**, **Top Items**, **Timeline** tabs all show "Analytics for this view are coming soon." (line 456)
- Top item rows have a chevron implying drill-down — no expand behaviour.

🆕 **What to copy/gather**:
- For each sub-tab: a **wireframe** of what the chart/table should look like (LD Growth screenshots if available).
- Whether **By Hour** is hourly buckets or daypart buckets (breakfast / lunch / dinner).
- Whether **Timeline** is a per-day event log of waste events or a longer-range trend.
- Drill-down design — when you click "Filet" in the Top Items list, what info appears? (Per-day waste, top reason, time-of-day pattern.)

---

### 7. **Weekly Digest** (`/weekly-digest` → `WeeklyDigest.js`) 🔴

What works now:
- 7-day selector ✅
- Backend `/weekly-digest/` endpoint is called ✅
- Empty skeleton rendered when no data ✅

What's filler:
- If the backend has **no `WeeklyDigest` records** yet, every card shows `$0.00 / — / 0`. The page **always** looks empty unless someone manually populates the backend.
- **No "generate digest" CTA**, no admin UI to seed the data, no source — where does sales/transactions/peak-hour data come from? POS integration? Manual entry?
- Highlights, tasks, staffing — all from the same digest record; no per-section refresh.

🆕 **What to copy/gather**:
- The **data source** for sales/transactions/avg-ticket/peak-hour — is this an Olo/POS feed? A manual entry per day? A nightly cron from HotSchedules?
- Whether the digest is **auto-generated** from existing data (rolling up FOH tasks + safety + waste + chats) or **manually composed** by the SD/GM.
- A "Generate Digest" or "Email Weekly Digest" button spec.

---

### 8. **Take / Results flows for Surveys** (`/team-surveys`) 🟠

What works now:
- Survey list + status pills + filters ✅
- Quick + Advanced Create Survey FormModal (with dynamic question list) ✅
- Per-card ActionMenu: Extend / Close / Archive / Delete ✅
- Dashboard panel with status breakdown ✅

What's filler:
- **Manager clicks a survey card** → "Survey results — coming soon" sentinel. No response-rate chart, no per-question breakdown, no comments thread.
- **Team member clicks a survey card** → "Take this survey — coming soon" sentinel. No question-by-question UI, no submit flow.
- Backend `respond()` action is already live — UI is the only missing piece.

🆕 **What to copy/gather**:
- The **Take Survey UX**: one question per screen? All questions on one page? Allow save-and-resume?
- The **Results view** for managers: bar chart per question? Free-text answers? Anonymous?
- Whether responses are anonymous or attributed.

---

## B. Dead buttons / placeholders inside otherwise-working pages

### 9. **Dashboard Insights cards** (`Dashboard.js`) 🟠

The 4 dashboard insight cards (FOH Tasks, Kitchen Checklist, Equipment Issues, Documentation) get their layout right but the **values** are placeholder defaults (`0%`, `0/64`, `Need repair`, `This week`).

🆕 **Need**: a single `GET /api/dashboard/insights` returning `{value, subtitle, trend}` per card. Then we kill the hardcoded defaults.

---

### 10. **Setup Sheet Detail view** (`SavedSetups.js` open action) 🟠

Clicking "Open" on a saved setup opens a "Coming soon" sentinel. Backend already has `GET /api/setup-sheets/:id` — we just need to build the **read-only Setup Detail page** showing all the rows that were submitted (positions, times, names).

🆕 **What to copy/gather**:
- LD Growth's "Setup Detail" / "View Setup" screen layout.
- Whether managers can **edit** an already-submitted setup or only view.

---

### 11. **Shift Summary History → PDF button** (`ShiftSummaryHistory.js`) 🟠

PDF export button opens "coming soon" sentinel. Print works (uses `window.print()`).

🆕 **What to copy/gather**: just a yes/no — should server-side PDF rendering be a real feature, or is "Save as PDF" via system print enough?

---

### 12. **Team Documentation → Analytics + Preferences icons** (`TeamDocumentation.js`) 🟠

Hero banner has two icons; both open "coming soon" sentinels.

🆕 **What to copy/gather**:
- **Analytics**: per-department doc trends, risk-score distribution, top-flagged employees, time-since-last-doc.
- **Preferences**: default record templates, escalation rules ("3 disciplinaries in 30 days → flag"), retention policy.

---

### 13. **CleaningMaintenance → Settings gear** (`CleaningMaintenance.js`) 🟠

Gear opens a "Cleaning settings — coming soon" sentinel. Backend `cleaning_settings` field on `StoreSettings` already exists; just the UI is missing.

🆕 **What to copy/gather**: what per-frequency toggles, default reminders, and shared-device options should live here?

---

### 14. **KitchenWasteTracker → Donations mode + Notes button** (`KitchenWasteTracker.js`) 🟠

- **Donations** toggle exists next to "Waste" but the Donations view is unimplemented.
- **Notes** button opens a sentinel.

🆕 **What to copy/gather**:
- Donations data model: same as waste entries (item + qty + cost) but tagged for donation? Recipient name (food bank)?
- Per-day Notes UX — is this a shared store note or a personal one?

---

### 15. **Routes: `cfadollars` and `safe-counting`** (`Dashboard.js` + `QuickActions.js`) 🟠

Quick Actions has tiles for **CFAdollars** and **Safe Counting** — both intentionally route to `__not_implemented__:` sentinels, no pages exist.

🆕 **What to copy/gather**:
- **CFAdollars**: loyalty / rewards program — is this an internal team rewards thing? A guest-facing program? What does the page show? (Balance? Earn rules? Redemption history?)
- **Safe Counting**: cash management UX — daily deposit count, variance reporting, drop log?

---

## C. Cosmetic / minor (one-line fixes, low priority)

| File | Issue | Severity |
|---|---|---|
| `LeadershipDevelopment.js:137` | Hardcoded header date `Monday, Apr 20` | 🟡 |
| `KitchenFoodSafety.js` banner | Hardcoded date `Monday, April 20` | 🟡 |
| `Dashboard.js` | `user?.firstName \|\| 'Demo User'` fallback in banner | 🟡 |
| `ShiftSummary.js` | `WIN_OPTIONS` and `CHALLENGE_OPTIONS` arrays hardcoded (6 each) | 🟡 |
| `TeamTraining.js` | Hero date `Wednesday, April 22` static | 🟡 |
| `KitchenAnalytics.js` | Top-items rows have chevron-down hinting expand — no logic | 🟡 |

---

## D. What's NOT filler (just to be clear)

These pages are fully wired — they read from + write to the backend, have manager-tier gating, optimistic updates, and no placeholder controls:

- `/foh-tasks` (incl. Settings + Initials prompt) ✅
- `/foh-cleaning` (history drawer + create task flow) ✅
- `/kitchen` (dashboard summary from API) ✅
- `/kitchen-checklists` (real tasks, history drawer, manage flow) ✅
- `/kitchen-cleaning` ✅
- `/kitchen-equipment` (categories, equipment, schedules, logs all live) ✅
- `/kitchen-safety` (tasks, targets, readings, history) ✅
- `/kitchen-waste` (entries, menu items, bulk entry, date chip) ✅
- `/team-members` (members, departments, Add Member, ActionMenu) ✅
- `/team-documentation` (records, employee drawer, add record) ✅
- `/team-training` (trainees, assign training, plans) ✅
- `/team-quick-links` (links, categories, manage flow) ✅
- `/team-surveys` (list, create, manage; only Take/Results sentinel) ✅
- `/team-chat` (channels, messages, new channel for managers) ✅
- `/calendar` (events, edit, day click) ✅
- `/guest-recovery` (full CRUD) ✅
- `/vendors` (full CRUD) ✅
- `/setup-sheet-templates` (full CRUD with ActionMenu) ✅
- `/saved-setups` (list, share, duplicate, delete — only Open sentinel) ✅
- `/setup-sheet-builder` (file upload works) ✅
- `/shift-summary` (real save, drafts) ✅
- `/shift-summary-history` (filters, detail modal, print) ✅
- `/settings` (all panels, both Reset buttons) ✅
- `/users` (UserManagement, full CRUD, reset password ConfirmDialog) ✅
- All `ui/` primitives (FormModal, ConfirmDialog, ActionMenu, HistoryDrawer, etc.) ✅

---

## E. Recommended order to gather content

If you can only do a few at a time, **gather in this order** — these are the pages your team will notice first as "broken" or empty:

1. **Leadership 360° template content** (questions, sections, rating scale) — unblocks "Take Evaluation" + Results dashboard.
2. **Leadership Development programs** (the per-program curriculum) — unblocks the "library of dev programs" you flagged.
3. **Team Evaluations** clarification — is this the same as 360, or a separate annual review concept?
4. **Team Development per-track step content** (Team Member → Trainer → Zone Leader → Shift Lead steps).
5. **Take Survey + Survey Results UX** — every other survey piece is already wired.
6. **Dashboard Insights** real data source(s).
7. **Weekly Digest** data source decision.
8. **CFAdollars + Safe Counting** — full page specs (or kill the tiles if dropped).
9. The rest (KitchenAnalytics sub-tabs, Setup Detail view, PDF export, sentinels) — each is a half-session of work once the spec exists.

---

_Last updated: 2026-05-15 — after all 18 UI-wiring phases shipped and final `window.confirm` cleanup._
