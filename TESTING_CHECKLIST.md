# CFA-SAT-Tracker — Comprehensive Testing Checklist

_Updated at the end of every backend-migration phase. Use this for a full pre-launch walkthrough._

---

## Test accounts to use

| Email | Password | Role | Tier | Use for |
|---|---|---|---|---|
| `kellenbergercailer@gmail.com` | _(set in Railway env vars)_ | admin | superuser | Bypasses all permissions. Test "happy path" + admin panel. |
| `admin@gmail.com` | `admin` | manager | manager | Mid-tier: can create/edit/delete most things. |
| `demouser@gmail.com` | `demouser` | team_member | team_member | Bottom-tier: should be **blocked** from manager-only actions; should still be able to complete tasks, log waste, submit shift summaries (when applicable). |

For every page test below, run at minimum: **once as superuser** (sanity check), **once as `demouser`** (permission gating). Where it matters I've called out the specific permission expectations.

---

## How to use this doc

1. Work through each phase section.
2. Tick ✓ as you go (`- [x]`).
3. If anything renders weirdly or doesn't behave how you want, **don't fix it yet** — just write a quick note next to the line. We'll triage at the end.
4. The "UI/UX review" sub-section at the end of each page lists the styling/copy/spacing things to eyeball.

---

## Cross-cutting (test on every page)

These rules apply everywhere — flag any place they're violated.

- [ ] **Refresh keeps me on the same page.** Open a page, press Cmd-R / browser refresh, should stay there (Phase 0 navigation fix).
- [ ] **Back/forward buttons work.** Click into a page → browser back → should land where you came from. Forward should re-enter.
- [ ] **Logout works from any page.** Profile dropdown → Log out → returns to login screen.
- [ ] **No console errors** in normal use. Open DevTools console — incidental warnings OK, but red errors are a bug.
- [ ] **Mobile viewport** (resize browser to ~380px wide): no horizontal scroll, no overlapping elements.
- [ ] **Same user, different device**: log in on phone, complete an action, then log in on desktop — should see the same state. (Postgres is the source of truth.)
- [ ] **Two users at the same time**: open two browsers, log in as `admin@gmail.com` in one and `demouser@gmail.com` in the other. Changes one makes should appear in the other after refresh (we don't have real-time push yet).

---

## Dashboard Customize + navigation routing

### Customize Stat Cards modal (Dashboard Insights)
- [ ] Click "Customize" next to Dashboard Insights → modal opens.
- [ ] Currently-selected cards have the red ✓ check.
- [ ] Uncheck 2 of the 4 defaults, check 2 different cards → click **Save Changes** → modal closes → the dashboard's 4 insight cards **swap out** to match your selection.
- [ ] **Refresh the page** → your custom selection persists (loaded from `/api/users/me/preferences/`).
- [ ] Click **Reset to Default** → 4 defaults re-selected (FOH Tasks / Kitchen Checklist / Equipment Issues / Documentation). Save → confirm defaults return.

### Customize Quick Actions modal
- [ ] Click "Customize" next to Quick Actions → modal opens.
- [ ] Currently-selected actions are highlighted.
- [ ] Add 2, remove 1 (up to 12 total) → Save → grid below updates immediately.
- [ ] **Refresh** → custom set persists.
- [ ] Reset to Default → defaults return.

### Navigation: every Quick Action card opens the right page
Walk through these one by one — each card on the Quick Actions grid should navigate cleanly (no blank screens, no console errors):

| Card label | Expected page |
|---|---|
| Team Overview | `/users` (Team Members) |
| Evaluations | Team Evaluations |
| FOH Tasks | FOH Tasks |
| Cleaning | FOH Cleaning |
| Setup Sheets | Setup Sheet Templates |
| Kitchen | Kitchen Dashboard |
| Training | Team Training |
| Documentation | Team Documentation |
| Leadership | Leadership 360 |
| Analytics | Kitchen Analytics |
| Waste Tracker | Kitchen Waste |
| Equipment | Kitchen Equipment |
| Food Safety | Kitchen Safety |
| My Training | Team Training |
| My Evaluations | Team Evaluations |
| My Profile | Settings _(temporary alias — there's no profile page yet)_ |
| Playbooks | Leadership |
| Goals | Leadership 360 |
| CFAdollars | Dashboard _(no rewards page yet — placeholder)_ |
| Safe Counting | Dashboard _(no page yet — placeholder)_ |
| Team Chat | Team Chat |
| Settings | Settings |

### Navigation: every Insight card opens the right page
| Insight card | Expected page |
|---|---|
| FOH Tasks | FOH Tasks |
| Kitchen Checklist | Kitchen Checklists |
| Equipment Issues | Kitchen Equipment |
| Documentation | Team Documentation |
| Waste Today | Kitchen Waste |
| Team Members | Team Members |
| Evaluations | Team Evaluations |
| Active Trainees | Team Training |
| New Hires | Team Members |
| Completion Rate | Team Training |
| Training | Team Training |
| Leadership Plans | Leadership 360 |
| Team Performance | Team Development |
| Food Safety Temps | Kitchen Safety |
| Safety Incidents | Kitchen Safety |
| Schedule Compliance | Team Members _(no schedules page yet — placeholder)_ |
| Guest Recovery | Guest Recovery |
| Prep Tasks | Kitchen Dashboard |

> Any card that lands on the wrong page or a blank screen — note it next to the row.

---

## Phase 0 — Foundation (Settings, Store, Preferences)

### `/settings` (Settings page)

#### As superuser (admin):
- [ ] Page loads with "Loading your settings…" briefly, then populates with real store data (CFA I-410 & Rigsby, etc.).
- [ ] **General tab**: Language dropdown defaults to "English". Timezone defaults to "Central Time". Click Save Changes → pill flashes "Saved ✓".
- [ ] **Store Info tab**: All 7 fields populated (name, number, address, phone, email, vision, mission). Edit the store name → Save Changes → "Saved ✓". Refresh page → your edit persists.
- [ ] **Features tab**: 12 feature toggles, all on by default. Flip 3 of them off → Save → refresh → toggles match what you saved.
- [ ] **User Access tab**: 5 access toggles. Flip one → save → refresh → persists.
- [ ] **Notifications tab**: 5 toggles (these are **per-user preferences**, not per-store). Flip one → save → refresh → persists.
- [ ] **Appearance tab**: Dark mode + Compact mode toggles + theme color swatches.

#### As `demouser@gmail.com` (team_member):
- [ ] Can read all tabs.
- [ ] Can save **Notifications** and **Appearance** (these are personal preferences).
- [ ] Trying to save **Store Info**, **Features**, **User Access** → button should show "Try again" red pill / 403 in console. (Manager-only.)
- [ ] **Bug to verify is fixed**: editing General language saves successfully (it's a user pref, not a store-level config).

#### UI/UX review:
- [ ] Tab nav on left side reads clearly at all viewport sizes.
- [ ] Save buttons have clear hover states.
- [ ] "Saved ✓" message is visible long enough to register.
- [ ] Dropdowns (language, timezone) have a chevron and align with input fields.

---

## Phase 1 — FOH Tasks + Shift Summary

### `/foh` (FOH Tasks page)

#### As superuser or `admin@gmail.com`:
- [ ] On mount, three tabs (Opening / Transition / Closing) show real counts: 16 / 6 / 34 (seeded from the existing hardcoded list).
- [ ] Click a task checkbox → checkmark appears + sticks.
- [ ] **Refresh page** → checked tasks **stay checked**. (This is the headline feature.)
- [ ] Switch tabs → each shift's tasks load independently. Completion state is per-task per-day.
- [ ] **Add task button (+)** → modal opens → enter "Test task" → Add → appears in the active shift's list.
- [ ] **Delete a task** (row trash icon) → confirms → task disappears. Refresh → it's gone (soft-archived in DB).
- [ ] **History button** in header → shows the past 7 days of completion rollups per shift.

#### As `demouser@gmail.com`:
- [ ] Can see all 56 tasks across the three shifts.
- [ ] Can check / uncheck boxes → persists (no permission error). _If this fails — that's the bug we already fixed; re-verify._
- [ ] **Add task** → should fail with manager-only message.
- [ ] **Delete task** → should fail with "manager role required" message; the row should snap back.

#### Day-rollover test (optional but valuable):
- [ ] Complete a task today. Tomorrow, the box should appear **unchecked** again (per-day completion). Yesterday's completion still shows up in history.

#### UI/UX review:
- [ ] Progress bars in each tab visibly reflect the completion ratio.
- [ ] Long task text wraps cleanly (some closing tasks are wordy).
- [ ] Completed tasks are visibly distinct (strikethrough? color shift?).
- [ ] Sticky header doesn't overlap content as you scroll.

### `/shift-summary` (Shift Summary form)

#### As any user:
- [ ] Form fields hydrate from `kellenbergercailer@gmail.com` user's name and today's date.
- [ ] Wins chips (6) and Challenges chips (6) load from the seeded `ShiftTag` catalog — NOT hardcoded in JS anymore.
- [ ] Type in the recap field → wait ~1 second → top-right or below button shows "Saved" pill (autosave hit `/draft/today/`).
- [ ] **Refresh page** → all your typed values come back from the draft endpoint.
- [ ] Toggle 2 win chips + 1 challenge chip → autosaves.
- [ ] Click **Save shift summary** → button flashes "Saving…" → "Saved ✓" → auto-redirects to `/shift-summary-history`.
- [ ] **Clear form** → all fields reset AND the server-side draft is discarded.

#### UI/UX review:
- [ ] Star rating component is intuitive (hover + click).
- [ ] Chip-style multi-select for wins/challenges is clear when items are selected.
- [ ] The Save button label changes appropriately based on `saveStatus`.

### `/shift-summary-history` (Shift Summary History)

- [ ] After submitting a shift summary, it shows up here as a card with: lead name, shift type, date, status, rating, recap, tags as colored pills.
- [ ] Empty state shows "No saved summaries..." cleanly when no submissions exist for the user yet.
- [ ] Submitting a summary as multiple different users — each one shows their own attribution.

---

## Phase 2 — Setup Sheets

### `/setup-sheet-templates`

- [ ] 4 seeded templates load: NewMain, Main (Copy), 9/15 - 9/22, Summer.
- [ ] Each card shows a real "Updated MM DD, YYYY" timestamp (no longer hardcoded).
- [ ] `time_blocks_count` shows on each card (currently 0 for seeded templates since no time blocks attached yet — that's expected).
- [ ] **Click + New** button (manager+) → creates a new template? (currently goes to builder — verify it does something reasonable).

### `/saved-setups`

- [ ] Sample sheet "4-19-25" loads with: week range "Apr 18 – Apr 25, 2026", 560 employees, 94 areas, "Updated X minutes/hours/days ago".
- [ ] Search box filters by name (server-side now).
- [ ] **3-dot menu** on each card — known unwired for now, but card click should at least not crash.

### `/setup-sheet-builder`

- [ ] **Load Previous Setup dropdown** lists your real templates (NewMain, Main (Copy), 9/15 - 9/22, Summer).
- [ ] **Drag & drop a file** (any small .xlsx or .csv) onto the dropzone → blue "Uploading..." banner → green "Saved..." banner → auto-redirect to `/saved-setups` → your new draft appears at the top.
- [ ] **Click Browse + select a file** → same flow.
- [ ] As `demouser@gmail.com`: file upload should fail with permission error (the create-sheet step requires manager OR you need to allow it — verify expected behavior matches what you want).

#### Known limitation (don't flag):
- File contents aren't parsed yet — just acknowledged. The sheet that appears in Saved Setups will have your filename but no time blocks.

---

## Phase 3 — Cleaning & Maintenance

### `/cleaning` (FOH Cleaning & Maintenance)

- [ ] 4 frequency tabs load with real counts: Daily 4 (0 done), Weekly 2, Monthly 2, Quarterly 1.
- [ ] Click a task checkbox → checkmark appears, "You" + "just now" in metadata, counts update.
- [ ] Refresh → completion sticks.
- [ ] Switch tab → see different tasks per frequency.
- [ ] Trash icon (manager+) deletes a task → removed from list → counts refresh.

#### As `demouser@gmail.com`:
- [ ] Can check/uncheck tasks.
- [ ] Trash delete → fails gracefully with "manager role required."

### Kitchen → Clean tab (`/kitchen-cleaning` or via Kitchen Dashboard nav)

- [ ] Daily tab loads with 3 seeded kitchen tasks (Wipe down prep tables, Sweep & mop kitchen floor, Empty trash & change liners).
- [ ] Header subtitle reads "0 of 3 done today" initially.
- [ ] Click a task row → checkmark fills in, header count updates.
- [ ] Switch to Weekly tab → 2 different tasks. Monthly → 2 different.
- [ ] Refresh → completion state persists.

---

## Phase 4 — Kitchen Dashboard, Checklists, Waste Tracker

### `/kitchen` (Kitchen Dashboard)

- [ ] On load, the **overall progress** bar and per-shift mini-percentages (🌅 / 🔄 / 🌙) reflect real checklist completion for today (not always 29% / 100% / 0% / 0%).
- [ ] The four cards (Food Safety, Waste Tracker, Equipment, Shift Checklists) show real values:
  - **Waste card** shows actual `$X.XX` today's-cost + entries count (was hardcoded $7.18 / 20).
  - **Checklists card** shows real "Completed X/Y" and rate %.
  - **Equipment card** shows "Phase 5" placeholders for now (real data lands later).
- [ ] Clicking any card navigates to the right kitchen sub-page.

### Kitchen → Lists (`/kitchen-checklists`)

- [ ] On load, Transition tab is active. Click Opening / Closing → tasks for that shift load.
- [ ] Each shift's task count comes from the seeded list (Opening 10, Transition 15, Closing 14 — verify those numbers match the seeder).
- [ ] Click a task row → checkmark fills in → persists across refresh.
- [ ] Switch tabs → completion state is per-shift per-day.
- [ ] As `demouser@gmail.com`: completion works (this was the fix from Phase 1); template CRUD blocked.

### Kitchen → Waste (`/kitchen-waste`)

- [ ] Meal-period tabs (Breakfast / Lunch / Dinner) toggle. Lunch shows the 11 seeded menu items (Spicy Filet, Filet, Grilled Filet, Nuggets, Grilled Nuggets, Strips, Mac & Cheese, White Bun, Multigrain Bun, Gluten Free Bun, Sandwich).
- [ ] **Tap a menu tile** → new entry appears immediately at the top of Today's Entries with qty 1 + the unit price.
- [ ] **Refresh page** → entries persist (loaded from `/api/kitchen/waste/entries/?date=today`).
- [ ] **Select a waste reason** chip (Overproduction / Quality / Expired / Dropped) → next tap saves the reason with that entry.
- [ ] **X delete button** on a row → optimistically removes + persists on backend.
- [ ] **"Today's Waste" KPI total** at the top updates as you add/remove entries.

#### Known limitation:
- The "Custom Entry" form (bottom of the Waste page) creates local-only rows for now — they vanish on refresh. Real custom-item creation lands later.

### Kitchen → Analytics (`/kitchen-analytics`)

- [ ] KPI cards (Today / This Week / Yesterday / Top Item) display real values from `/api/kitchen/waste/kpis/`. Empty fresh DB → all $0.00.
- [ ] After logging waste (do it from `/kitchen-waste` first, come back) → KPIs reflect what you logged.
- [ ] **Goals card** shows your store's waste goal targets (default $100 / $600 / $2500). The "Today" bar fills proportionally as you log waste.
- [ ] **30-day trend line chart** is empty/flat on a fresh DB; gets a real curve once you've logged on multiple days.
- [ ] **Top Wasted Items** list shows the items you've logged in the past 30 days, sorted by total cost, with colored dots.
- [ ] **Range selector** (Last 7/14/30/90 Days, This Month, Last Month) re-fetches trend + top items when changed.
- [ ] As `demouser@gmail.com`: can read all analytics. Can't change goals (manager-only).

### Kitchen → Safety, Equip
- [ ] Pages render without crashing (real backend lands in Phase 5).

---

## Phase 5 — Equipment & Food Safety

### Kitchen → Equip (`/kitchen-equipment`)

- [ ] 8 categories load with real counts: HVAC 4, Cleaning 4, POS/Tech 4, Safety 4, Cooking 4, Refrigeration 4, Preparation 0, Beverage 0.
- [ ] Click any populated category → its equipment cards load below.
- [ ] **Cooking → Primary Fryers** shows a maintenance schedule pill ("Boil out — weekly — Soon") because that's the seeded sample.
- [ ] Toolbar "X/Y operational" reflects the real status counts (initially 16/16 = 100%).

#### As `demouser@gmail.com`:
- [ ] Can browse all categories + see equipment.
- [ ] Cannot create new equipment / categories (manager-only).

### Kitchen → Safety (`/kitchen-safety`)

- [ ] KPI strip loads with real values: Complete %, Temps `X/Y`, Warning count, Critical count — all derived from your seeded data.
- [ ] **Daypart tabs** (Morning / Lunch / Dinner) show seeded tasks: 8 morning, 5 lunch, 5 dinner. Click a task → checkmark fills, "You — just now" appears underneath.
- [ ] **Refresh page** → completed task remains checked. Tomorrow it resets.
- [ ] **Temperature Log** equipment tab shows 5 seeded targets (Walk In Cooler, Walk In Freezer, Prep Area Cooler, Cooking Line, Ice Cream) with expected ranges and "No reading yet" since none have been logged.
- [ ] Product tab shows 3 seeded targets (Chicken Strips, Filets, Nuggets).

#### As `demouser@gmail.com`:
- [ ] Can check off safety tasks.
- [ ] Cannot create new safety tasks / temperature targets.

#### Known limitation:
- Manually logging a new temperature reading from the UI isn't wired yet (Phase 5 backend supports it; UI button comes later). For now you can log via Django admin to test the status-classification logic.

---

## Phase 6 — Team (Members, Documentation, Training, Quick Links)

### `/users` (Team Members)

- [ ] On load, the roster shows your superuser/admin + 3 demo users (`demouser@gmail.com`, `admin@gmail.com`, `store@cfasattracker.com`) + 10 sample team members seeded from LD Growth roster (Greg Argyrou, Adaya Garcia, Addisyn Thomas, etc.).
- [ ] Pill counts at top (Active / Inactive / Managers) reflect real counts from `/api/team/stats/`.
- [ ] Search box → filters server-side. Try searching "Garcia" → both Garcias appear.
- [ ] Switch tab Active ↔ Inactive → list updates.
- [ ] **Admin badge** appears on Greg Argyrou (seeded as `is_admin=True`).
- [ ] Department pills under each name reflect their seeded departments (FOH, Kitchen, Drive Thru, etc.).

#### As `demouser@gmail.com`:
- [ ] Can view the roster.
- [ ] 3-dot action menu / Add member is gated (manager-only).

### `/documentation` (Team Documentation)

- [ ] Empty initially: KPI cards all show 0, employee list is empty.
- [ ] **Test the create flow** via Django admin: log into `/admin/`, find a user, add an EmployeeRecord with kind=warning, refresh `/documentation` — the user card should now appear, KPI counts update, risk badge shows.
- [ ] Add 3 warnings → user's risk_level should compute to `mid` then `high`.
- [ ] Filter pills (All / Disciplinary / PIP / Admin) re-fetch + filter.
- [ ] Search box → filters.

### `/training/progress` (Team Training)

- [ ] KPI strip shows real counts: Active Trainees, Completion Rate, New Hires (last 30 days), Active Plans (4 seeded plans).
- [ ] Departments donut shows progress per department (likely 0% for all initially — needs trainee assignments to populate).
- [ ] Trainee list is empty initially. Create a TraineeAssignment via Django admin: user=demouser, plan="Foundations FOH" → comes back here, demouser shows up with In Progress status and 0% progress.
- [ ] Switch Active/Completed pill → re-fetches.

### `/quick-links` (Team Quick Links)

- [ ] 4 seeded links appear: HotSchedules, Pathway, Beam, CFA Connect.
- [ ] Each card has a colored border matching its category (Daily Tools=red, Reference=blue, External=green).
- [ ] Clicking a link opens it in a new tab.
- [ ] "Add Quick Link" and "Manage Categories" buttons aren't wired yet — known limitation, will be in a polish phase.

#### As `demouser@gmail.com`:
- [ ] Can see + click all quick links.
- [ ] Cannot edit categories or add new links (gated when those buttons get wired).

---

## Phase 7 — Leadership 360 + Team Development

### `/leadership/development` (Leadership Development)

#### As any user:
- [ ] Page loads with "Active Plan" card showing "The Heart of Leadership" at 0% progress.
- [ ] "Browse Plans" section shows all 14 leadership programs as cards with titles, descriptions, and durations.
- [ ] Programs display in correct order: Heart of Leadership, Restaurant Culture Builder (8 weeks), Team Development Expert (10 weeks), Strategic Leadership Mastery (12 weeks), Communication & Influence Excellence (10 weeks), Operational Excellence Leader (10 weeks), Innovation & Change Champion (9 weeks), Hospitality Leader (8 weeks), Conflict Resolution & Problem Solving (9 weeks), Emotional Intelligence Leader (10 weeks), Situational Leadership Mastery (12 weeks), Complete Ownership of an Area (10 weeks), Resilience Mastery (12 weeks), Work Ethic Excellence (10 weeks).
- [ ] Click "Continue" on a program card → navigates to program detail view (if wired).
- [ ] Each program card shows the correct emoji icon and duration label.

### `/leadership/360` (Leadership 360 Evaluations)

#### As manager:
- [ ] Page loads with "New 360 Evaluation" button visible.
- [ ] Empty state shows "No evaluations yet" message when no evaluations exist.
- [ ] Click "+ New 360 Evaluation" → opens modal/form to create evaluation.
- [ ] Create evaluation form allows selecting: evaluatee (team member), template (Leadership 360 Assessment), due date, and evaluators (peers, manager, direct reports).
- [ ] After creating evaluation → appears in list with status "In Progress", 0% progress, evaluatee name, due date.
- [ ] Click on evaluation card → opens detail view showing evaluators list with their completion status.

#### As team member (evaluatee):
- [ ] Can see evaluations where they are the evaluatee.
- [ ] Shows progress bar indicating how many evaluators have completed.
- [ ] Cannot create new evaluations (button hidden or disabled).

#### As team member (evaluator):
- [ ] Can see evaluations where they are assigned as an evaluator.
- [ ] Click "Complete Evaluation" → opens response form with questions.
- [ ] Submit responses → evaluation progress updates, their status shows "Completed".
- [ ] Once all evaluators complete → evaluation status changes to "Completed".

### `/team-development` (Team Development / Position Tracks)

#### As any user:
- [ ] Page loads with 4 position tracks displayed: Team Member, Trainer, Zone Leader, Shift Lead.
- [ ] Each track card shows description and current team members at that level.
- [ ] Progress indicators show how many team members are at each level.
- [ ] Filter by position → updates the team member list.
- [ ] Search box filters team members by name.

#### As manager:
- [ ] Can assign team members to position tracks.
- [ ] Can update progress for team members (completed steps, current step).
- [ ] Stats card shows: Total team members, In progress count, Completed count.

#### As team member:
- [ ] Can view their own position track progress.
- [ ] Can see their current position and next steps.
- [ ] Cannot edit other team members' progress.

### `/leadership/notes` (Personal Leadership Notes)

#### As any user:
- [ ] Can create personal leadership development notes.
- [ ] Notes list shows all their notes in reverse chronological order.
- [ ] Can edit and delete their own notes.
- [ ] Cannot see other users' notes (personal only).
- [ ] Rich text editor or textarea for note content.

### API Endpoints (Backend Testing)

#### Leadership Programs:
- [ ] `GET /api/leadership/modules/` returns 14 programs with correct titles and descriptions.
- [ ] Programs are ordered correctly (0-13).
- [ ] Each program has at least one activity seeded.

#### 360 Evaluations:
- [ ] `GET /api/leadership/360/templates/` returns "Leadership 360 Assessment" template.
- [ ] `POST /api/leadership/360/` creates new evaluation (manager-only).
- [ ] `GET /api/leadership/360/` returns evaluations for current user (as evaluatee or evaluator).
- [ ] `POST /api/leadership/360/:id/respond/` allows evaluator to submit responses.
- [ ] `GET /api/leadership/360/stats/` returns total, in_progress, completed counts.

#### Position Tracks:
- [ ] `GET /api/team-development/tracks/` returns 4 tracks: Team Member, Trainer, Zone Leader, Shift Lead.
- [ ] `GET /api/team-development/progress/` returns progress for current user (or all if manager).
- [ ] `POST /api/team-development/progress/` creates progress record (manager-only).
- [ ] `PATCH /api/team-development/progress/:id/` updates progress.

#### Leadership Areas & Notes:
- [ ] `GET /api/leadership/areas/` returns user's selected focus areas.
- [ ] `POST /api/leadership/areas/` creates new focus area.
- [ ] `GET /api/leadership/notes/` returns user's personal notes.
- [ ] `POST /api/leadership/notes/` creates new note.

### Permissions Testing:
- [ ] Team members can view leadership programs and their own progress.
- [ ] Team members can complete evaluations where they're assigned as evaluators.
- [ ] Team members cannot create 360 evaluations (manager-only).
- [ ] Team members cannot edit other users' position track progress.
- [ ] Managers can create evaluations, assign tracks, and view all progress.

---

## Phase 8 — Calendar, Guest Recovery, Vendors, Team Chat, Surveys

### `/calendar` (Calendar Events)

#### As manager:
- [ ] Page loads with calendar view showing events.
- [ ] Can create new events with title, category, start/end times, all-day toggle, notes.
- [ ] Categories: Weekly Task, Out of School, Store Event, Local Event, Announcement, Deadline, Other.
- [ ] Events display on calendar with color coding by category.
- [ ] Can edit and delete events.
- [ ] "Upcoming Events" section shows next 30 days.

#### As team member:
- [ ] Can view all calendar events.
- [ ] Cannot create, edit, or delete events (manager-only).

### `/guest-recovery` (Guest Complaints)

#### As manager:
- [ ] Page loads with complaints list showing guest name, category, status, occurred date.
- [ ] Can create new complaint with guest info, category, description, occurred time.
- [ ] Categories: Order Error, Service, Food Quality, Wait Time, Cleanliness, Staff Behavior, App/Rewards, Other.
- [ ] Can assign complaints to team members.
- [ ] Can mark complaints as resolved with resolution notes.
- [ ] Stats card shows: Total, Open, In Progress, Resolved counts.
- [ ] Filter by status (open/in_progress/resolved).

#### As team member:
- [ ] Can view all complaints.
- [ ] Can see complaints assigned to them.
- [ ] Cannot create or assign complaints (manager-only).

### `/vendors` (Vendor Directory)

#### As manager:
- [ ] Page loads with vendor list showing name, category, contact info.
- [ ] Can create new vendor with all fields (name, category, contact, phone, email, website, account #, notes, tags).
- [ ] Categories: Food & Beverage, Supplies, Equipment, Cleaning, Uniforms, Marketing, Other.
- [ ] Tags are editable (e.g., "Primary", "Weekly Delivery", "Auto-Ship").
- [ ] Can edit and archive vendors.
- [ ] Search/filter by category or tags.

#### As team member:
- [ ] Can view vendor directory.
- [ ] Cannot create, edit, or archive vendors (manager-only).

### `/team-chat` (Team Chat)

#### As any user:
- [ ] Page loads with 4 default channels: #general, #operations, #kitchen, #foh.
- [ ] Can select a channel and see message history (last 100 messages).
- [ ] Can post messages to channels they're a member of.
- [ ] Messages show author name, initials, timestamp.
- [ ] Real-time updates via polling (no WebSockets yet).
- [ ] Unread count badge on channels with new messages.

#### As manager:
- [ ] Can create new chat channels.
- [ ] Can set channel as default.
- [ ] Can manage channel memberships.

### `/surveys` (Team Surveys)

#### As manager:
- [ ] Page loads with surveys list showing title, status, response count.
- [ ] Can create new survey with title, open/close dates, anonymous toggle.
- [ ] Can add questions with types: Text, Rating, Multiple Choice, Yes/No.
- [ ] Can set questions as required.
- [ ] Can activate/close/archive surveys.
- [ ] Can view survey results (aggregated responses).
- [ ] Results respect anonymity setting (no user names if anonymous).

#### As team member:
- [ ] Can see active surveys only.
- [ ] Can submit responses to active surveys.
- [ ] Anonymous surveys don't capture user identity.
- [ ] Cannot view survey results (manager-only).
- [ ] Cannot create or edit surveys (manager-only).

### API Endpoints (Backend Testing)

#### Calendar:
- [ ] `GET /api/calendar/` returns all events for store.
- [ ] `POST /api/calendar/` creates new event (manager-only).
- [ ] `GET /api/calendar/upcoming/` returns events in next 30 days.
- [ ] `PATCH /api/calendar/:id/` updates event.
- [ ] `DELETE /api/calendar/:id/` deletes event.

#### Guest Recovery:
- [ ] `GET /api/guest-complaints/` returns all complaints.
- [ ] `POST /api/guest-complaints/` creates complaint (manager-only).
- [ ] `POST /api/guest-complaints/:id/assign/` assigns to user.
- [ ] `POST /api/guest-complaints/:id/resolve/` marks as resolved.
- [ ] `GET /api/guest-complaints/stats/` returns status counts.

#### Vendors:
- [ ] `GET /api/vendors/` returns all vendors.
- [ ] `POST /api/vendors/` creates vendor (manager-only).
- [ ] `PATCH /api/vendors/:id/` updates vendor.
- [ ] Tags field accepts JSON array of strings.

#### Team Chat:
- [ ] `GET /api/chat/channels/` returns 4 default channels.
- [ ] `GET /api/chat/messages/` returns messages for user's channels.
- [ ] `GET /api/chat/messages/channel/:id/` returns last 100 messages for channel.
- [ ] `POST /api/chat/messages/` creates message (auto-sets author).

#### Surveys:
- [ ] `GET /api/surveys/` returns active surveys (or all if manager).
- [ ] `POST /api/surveys/` creates survey (manager-only).
- [ ] `POST /api/surveys/:id/respond/` submits response with answers.
- [ ] `GET /api/surveys/:id/results/` returns results (manager-only).
- [ ] Anonymous surveys have null user on responses.

### Permissions Testing:
- [ ] Team members can view all Phase 8 data but cannot create/edit (except chat messages and survey responses).
- [ ] Managers can create/edit calendar events, complaints, vendors, channels, and surveys.
- [ ] Survey results are manager-only.
- [ ] Chat messages are scoped to channels user is a member of.

---

## Phase 9 — Polish (Notifications, Dashboard insights, Weekly Digest)

### Notifications

#### As any user:
- [ ] Bell icon in header shows unread count badge.
- [ ] Click bell icon → opens notifications dropdown/panel.
- [ ] Notifications list shows title, message, timestamp, read/unread status.
- [ ] Click notification → marks as read and navigates to action_url (if present).
- [ ] "Mark all as read" button marks all notifications as read.
- [ ] Unread count updates in real-time after marking as read.

#### API Endpoints:
- [ ] `GET /api/notifications/` returns user's notifications (newest first).
- [ ] `POST /api/notifications/:id/mark-read/` marks single notification as read.
- [ ] `POST /api/notifications/mark-all-read/` marks all as read, returns count.
- [ ] `GET /api/notifications/unread-count/` returns unread count for badge.
- [ ] Users can only see their own notifications (scoped by user).

### Dashboard Insights

#### As any user:
- [ ] Dashboard shows customizable insight cards.
- [ ] Click "Customize Dashboard" → opens modal with insight catalog.
- [ ] Insight catalog shows 6 available insights:
  - Tasks Completed Today (operations)
  - Waste Today (kitchen)
  - Shifts Logged (operations)
  - Team Size (team)
  - Open Complaints (guest_recovery)
  - Upcoming Events (calendar)
- [ ] Can select/deselect insights to show on dashboard.
- [ ] Selected insights persist in UserPreferences.
- [ ] Insight cards show real-time values from backend.
- [ ] Values update when page refreshes.

#### API Endpoints:
- [ ] `GET /api/dashboard/insights/catalog/` returns full catalog of 6 insights.
- [ ] `GET /api/dashboard/insights/values/?ids=tasks_completed_today,waste_today` returns actual values for requested IDs.
- [ ] Values include: value (number), label (formatted string), trend (optional).
- [ ] `PATCH /api/users/me/preferences/` persists insight_ids selection.

### Weekly Digest

#### As any user:
- [ ] Weekly digest page shows aggregated stats for current week.
- [ ] Can select different weeks via date picker.
- [ ] Stats shown:
  - Shifts logged
  - FOH tasks completed
  - Cleaning tasks completed
  - Kitchen tasks completed
  - Waste total ($)
  - Waste entries count
  - Complaints received
  - Complaints resolved
  - Training completed
- [ ] Week starts on Monday, ends on Sunday.
- [ ] Stats are accurate for the selected week.

#### API Endpoints:
- [ ] `GET /api/weekly-digest/` returns current week's digest.
- [ ] `GET /api/weekly-digest/?week=2026-05-12` returns specific week's digest.
- [ ] Week parameter is start of week (Monday).
- [ ] Returns aggregated counts and totals from all operational data.

### UserPreferences Persistence

#### As any user:
- [ ] Dashboard customization (insight_ids) persists across sessions.
- [ ] Quick actions customization (quick_action_ids) persists across sessions.
- [ ] `GET /api/users/me/preferences/` returns current preferences including insight_ids and quick_action_ids.
- [ ] `PATCH /api/users/me/preferences/` updates preferences.
- [ ] Preferences are user-specific (not shared across users).

### Integration Testing:
- [ ] Create a notification → appears in list with unread badge.
- [ ] Mark notification as read → badge count decreases.
- [ ] Select insights on dashboard → preferences saved, insights load on next visit.
- [ ] View weekly digest for past week → shows historical data accurately.
- [ ] All Phase 9 endpoints respect authentication (require login).

---

## Phase 10 — Production Hardening

### Rate Limiting

#### Login Endpoint:
- [ ] Attempt 6 failed logins in a row → 6th attempt is blocked with 429 Too Many Requests.
- [ ] Rate limit: 5 attempts per 15 minutes per IP address.
- [ ] After 15 minutes, can attempt login again.
- [ ] Successful login does not count against rate limit.

#### Forgot Password Endpoint:
- [ ] Attempt 4 password reset requests in an hour → 4th attempt is blocked with 429.
- [ ] Rate limit: 3 attempts per hour per IP address.
- [ ] After 1 hour, can request password reset again.

### Email Service (Setup Required)

#### Password Reset Flow:
- [ ] Request password reset → email received within 1 minute.
- [ ] Email contains valid reset link with uid and token.
- [ ] Click reset link → redirects to frontend reset password page.
- [ ] Submit new password → password is updated successfully.
- [ ] Old password no longer works, new password works.
- [ ] Reset link expires after 24 hours.

#### Email Configuration:
- [ ] `RESEND_API_KEY` or `SENDGRID_API_KEY` set in Railway environment.
- [ ] `DEFAULT_FROM_EMAIL` set to valid sender address.
- [ ] `FRONTEND_URL` set to production frontend URL.
- [ ] Test email sending from Django shell: `send_mail(...)` works.

### Sentry Error Tracking (Setup Required)

#### Configuration:
- [ ] `SENTRY_DSN` environment variable set in Railway.
- [ ] Sentry SDK installed: `sentry-sdk[django]` in requirements.txt.
- [ ] Sentry initialized in `settings.py` with DjangoIntegration.
- [ ] Environment set to 'production' in Sentry config.

#### Error Capture:
- [ ] Trigger a test error (e.g., divide by zero in a view).
- [ ] Error appears in Sentry dashboard within 30 seconds.
- [ ] Error includes: stack trace, request data, user info, environment.
- [ ] Can navigate to error in Sentry and see full context.

#### Performance Monitoring:
- [ ] Sentry captures transaction performance data.
- [ ] Can see slow endpoints in Sentry Performance tab.
- [ ] Transaction sample rate set to 10% (configurable).

#### Alerts:
- [ ] Sentry alert configured for error rate > 5/minute.
- [ ] Sentry alert configured for 5xx response rate > 1%.
- [ ] Alerts sent to email/Slack when triggered.

### Database Performance

#### Query Optimization:
- [ ] List endpoints use `select_related()` for foreign keys.
- [ ] List endpoints use `prefetch_related()` for many-to-many and reverse FKs.
- [ ] No N+1 query problems (check with Django Debug Toolbar in dev).
- [ ] Most list endpoints return in < 200ms.
- [ ] Detail endpoints return in < 100ms.

#### Connection Pooling:
- [ ] `CONN_MAX_AGE` set to 600 in database config.
- [ ] Database connections are reused across requests.
- [ ] No connection timeout errors under load.

### Postgres Backups

#### Railway Backups:
- [ ] Go to Railway → Postgres Service → Backups tab.
- [ ] Verify daily backups are running.
- [ ] Latest backup is less than 24 hours old.
- [ ] Can download a backup file.

#### Restore Testing (Staging):
- [ ] Download a backup from Railway.
- [ ] Restore to a test database: `pg_restore -d test_db backup.dump`.
- [ ] Verify data integrity after restore.
- [ ] Test application against restored database.

### Security Checklist

- [ ] `SECRET_KEY` is in environment variable (not in code).
- [ ] `DEBUG=False` in production.
- [ ] `ALLOWED_HOSTS` configured with production domain.
- [ ] CORS configured for frontend domain only (not `*`).
- [ ] CSRF protection enabled (default Django behavior).
- [ ] HTTPS enforced (Railway handles this automatically).
- [ ] Rate limiting active on auth endpoints.
- [ ] No sensitive data in logs or error messages.

### Environment Variables

#### Required Variables Set in Railway:
- [ ] `SECRET_KEY`
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS`
- [ ] `FRONTEND_URL`
- [ ] `DATABASE_URL` (provided by Railway)
- [ ] `RESEND_API_KEY` or `SENDGRID_API_KEY`
- [ ] `DEFAULT_FROM_EMAIL`
- [ ] `SENTRY_DSN`

### Deployment Checks

#### Pre-Deployment:
- [ ] Run `python manage.py check --deploy` → no warnings.
- [ ] Run `python manage.py migrate --plan` → migrations are safe.
- [ ] All tests pass: `python manage.py test`.
- [ ] Frontend builds successfully: `npm run build`.
- [ ] No ESLint errors in frontend code.

#### Post-Deployment:
- [ ] Application loads successfully at production URL.
- [ ] Can log in with test account.
- [ ] All API endpoints return 200 or expected status codes.
- [ ] No 500 errors in Railway logs.
- [ ] Sentry receives first transaction/error.
- [ ] Database migrations applied successfully.

### Monitoring & Alerts

#### Health Check Endpoint:
- [ ] `GET /api/health/` returns 200 with status: healthy.
- [ ] Health check verifies database connection.
- [ ] Health check returns 503 if database is down.

#### Railway Monitoring:
- [ ] CPU usage < 80% under normal load.
- [ ] Memory usage < 80% under normal load.
- [ ] No deployment failures in history.
- [ ] Logs are accessible and readable.

#### Sentry Monitoring:
- [ ] Sentry dashboard shows recent transactions.
- [ ] No critical errors in last 24 hours.
- [ ] Performance metrics look normal (< 1s avg response time).
- [ ] Alerts are configured and working.

### Performance Testing (Optional)

#### Load Testing:
- [ ] Use tool like Apache Bench or Locust to simulate 100 concurrent users.
- [ ] All endpoints respond in < 1 second under load.
- [ ] No 500 errors under load.
- [ ] Database connection pool handles concurrent requests.
- [ ] Memory usage remains stable under load.

#### Stress Testing:
- [ ] Gradually increase load to find breaking point.
- [ ] Application degrades gracefully (slow responses, not crashes).
- [ ] Can recover after load is reduced.

---

## UI Phase 15 — Leadership + Training wiring _(2026-05-15)_

> Replaces dead controls and `window.prompt` chains across 5 components with FormModal/ConfirmDialog/ActionMenu primitives. Backend untouched except for `TeamMemberSerializer` exposing `created_at`.

### `/leadership/360` (Leadership360Evaluations)

#### As `admin@gmail.com / admin` (manager):
- [ ] "+ New Template" button opens **Create 360° Template** FormModal with Name (required), Description, Sections Count fields.
- [ ] Submitting creates the template; it appears at the bottom of the Templates section.
- [ ] Each template card has a 3-dot ActionMenu → **Edit** opens the same modal pre-filled.
- [ ] ActionMenu → **Delete** opens a destructive ConfirmDialog; confirming archives it (disappears from list).
- [ ] Click an evaluation card → "Take / View Evaluation — coming soon" sentinel ConfirmDialog appears (full take-eval UI deferred).

#### As `demouser@gmail.com / demouser` (team member):
- [ ] Templates section is read-only — no "+ New Template" button, no 3-dot menu on cards.
- [ ] Clicking an evaluation card still shows the same "coming soon" sentinel.

### `/leadership/360/new` (New360Evaluation wizard)

#### As manager:
- [ ] Step 2 (Choose Template) shows a "**+ Create Additional Template**" button below the template grid.
- [ ] Clicking it opens the inline Create Template FormModal.
- [ ] After submitting, the new template appears in the grid AND is auto-selected for the current evaluation flow.

#### As team member:
- [ ] The "+ Create Additional Template" button is hidden.

### `/training/progress` (TeamTraining)

#### As manager:
- [ ] **Progress** tab (default) shows KPIs, departments, search/status pills, trainee list, pagination — same as before.
- [ ] "**Assign Training**" button opens FormModal with two SelectFields: Team Member + Training Plan; both required.
- [ ] Submitting creates a TraineeAssignment; the trainee appears in the list.
- [ ] Each trainee row has a trash icon → opens ConfirmDialog; confirming removes the assignment.
- [ ] Clicking a trainee row → "Trainee detail — coming soon" sentinel (full progress drawer deferred).
- [ ] **Plans** tab lists training plans with name, description, total_steps.
- [ ] "+ New Plan" opens Create Training Plan FormModal (Name + Description + Total Steps).
- [ ] Each plan card has an ActionMenu → Edit (FormModal) and Delete (ConfirmDialog).
- [ ] **New Hires** tab lists members created in the last 30 days with hire date + role.
- [ ] **Assessments** and **Community** tabs show a "coming soon" placeholder card.

#### As team member:
- [ ] "Assign Training" button is hidden.
- [ ] Trash icons on trainee rows are hidden.
- [ ] "+ New Plan" button + per-plan ActionMenus are hidden (read-only Plans tab).

### `/leadership/development` (LeadershipDevelopment)

#### As any user:
- [ ] **Settings gear** (top right) → opens "Settings — coming soon" ConfirmDialog (sentinel, replaces dead button).
- [ ] **Development card** progress bar is no longer hardcoded `0%` — shows the average `progress_percent` of all 360 evaluations where current user is the evaluatee.
- [ ] If user has no evaluations, progress shows `0%`.
- [ ] After typing a note + clicking Save, the note appears in the list with a small trash icon.
- [ ] Clicking the trash icon → ConfirmDialog; confirming removes the note from the list (and the database).
- [ ] **"See all"** button next to Notes opens a HistoryDrawer listing every note with timestamp.
- [ ] HistoryDrawer subtitle shows the correct note count.

### `/team-development` (TeamDevelopment)

#### As manager:
- [ ] **"Edit Tracks"** button (hero, top right) opens **Manage Position Tracks** FormModal listing every track.
- [ ] Inside, "+ New Track" closes that modal and opens **Create Track** FormModal (Name + Description).
- [ ] Submitting adds the track and refreshes the list.
- [ ] Each track row in Manage modal has an ActionMenu → Edit (Create Track FormModal pre-filled) and Delete (ConfirmDialog).
- [ ] Clicking a member row → **Update Progress** FormModal with Status SelectField + Current Step + Completed Steps NumberFields.
- [ ] Submitting calls `PATCH /api/team-development/progress/:id/` and refreshes the member list.

#### As team member:
- [ ] "Edit Tracks" button is hidden.
- [ ] Member rows are not clickable (no cursor change, no modal opens).

### Backend regression
- [ ] `GET /api/team/members/` includes `created_at` for each user (needed by New Hires tab).

---

## UI Phase 16 — Calendar + Surveys + QuickLinks wiring _(2026-05-15)_

> Replaces 12+ `window.prompt`/`window.confirm` calls across 3 components with FormModal/ConfirmDialog/ActionMenu primitives. Backend untouched — surveys/quick-links already support PATCH/DELETE via `ModelViewSet`. Service layer adds `surveysService.update`, `teamService.updateQuickLink`, `teamService.updateLinkCategory`, `teamService.deleteLinkCategory`.

### `/calendar` (Calendar)

#### As `admin@gmail.com / admin` (manager):
- [ ] "+ Add Event" button (top right) opens **New Event** FormModal with TextField title + SelectField category + DatePicker date + TimePicker time + Toggle "All Day" + TextArea notes.
- [ ] Submitting creates the event; it appears on the correct day cell.
- [ ] Clicking an empty day cell opens the same modal with that date pre-selected.
- [ ] Clicking an existing event opens **Edit Event** FormModal pre-filled.
- [ ] Edit modal has a **Delete** button in the footer's left slot → closes Edit, opens destructive ConfirmDialog.
- [ ] Confirming delete removes the event from the calendar.
- [ ] **Category legend** items at the bottom are now buttons — clicking one hides that category's events (line-through + dimmed); clicking again restores. A "Show all" pill appears whenever ≥1 category is hidden.

#### As `demouser@gmail.com / demouser` (team member):
- [ ] "+ Add Event" button is hidden.
- [ ] Clicking a day cell does nothing (no cursor change).
- [ ] Clicking an existing event does nothing.
- [ ] Category legend filters still work for read-only viewing.

### `/surveys` (TeamSurveys)

#### As manager:
- [ ] "Quick Survey" button opens **Quick Survey** FormModal: TextField title + DatePicker close date (default +14d) + Toggle anonymous + a single TextField for question 1 (kind locked to text).
- [ ] "Advanced Survey" button opens **Create Survey (Advanced)** FormModal — same as Quick but with kind SelectField (text/rating/yes_no/multiple_choice) per question and a "+ Add Question" button.
- [ ] "+ Add Question" appends a question card; each card past the first has a "Remove" link.
- [ ] Submitting both flows posts to `POST /api/surveys/` with `status: 'active'` and the question list; survey appears in the list view.
- [ ] Each survey card has a 3-dot ActionMenu (manager-only):
  - **Extend** → opens FormModal with new close-date DatePicker; submits `PATCH closes_at` + re-opens if closed.
  - **Close** (active only) → `PATCH status=closed`, card moves to Closed filter.
  - **Archive** (anything except already-archived) → `PATCH status=archived`.
  - **Delete** → destructive ConfirmDialog → `DELETE /api/surveys/:id/`.
- [ ] Clicking a survey card (manager) → "Survey results — coming soon" sentinel ConfirmDialog with response count.
- [ ] Toggling the **Dashboard** pill at the top hides the "All Surveys" list and shows a 4-card status breakdown (Active / Closed / Drafts / Archived) with percent-of-total, plus a footer line with total responses + avg rate.
- [ ] "Back Home" button now actually navigates to dashboard (was previously dead).

#### As team member:
- [ ] Quick Survey / Advanced Survey buttons are hidden.
- [ ] Per-card 3-dot ActionMenu is hidden.
- [ ] Clicking a survey card (team member) → "Take this survey — coming soon" sentinel.
- [ ] Drafts filter still shows nothing (backend hides non-active surveys from non-managers).

### `/team-quick-links` (TeamQuickLinks)

#### As manager:
- [ ] "+ Add Quick Link" button opens **Add Quick Link** FormModal with TextField label + TextField URL (must start with http:// or https://) + TextField icon/emoji (default 🔗) + SelectField category.
- [ ] Submitting creates the link; it appears in the grid with the category's color as the border.
- [ ] Each link card has a 3-dot ActionMenu → **Edit** (same FormModal pre-filled) + **Delete** (ConfirmDialog).
- [ ] "Manage Categories" button opens **Manage Categories** FormModal listing every category with its color swatch + name + ActionMenu (Edit / Delete).
- [ ] Inside Manage Categories, "+ Add Category" opens an inline Add/Edit FormModal with Name TextField + Color SelectField (7 preset palette).
- [ ] Submitting create/edit refreshes the categories list.
- [ ] Delete Category → ConfirmDialog warning that existing links lose their colored border but keep their URL.

#### As team member:
- [ ] "+ Add Quick Link" and "Manage Categories" buttons are hidden.
- [ ] Per-link ActionMenu is hidden.
- [ ] Empty-state CTA is hidden (copy reads "Your manager has not added any quick links yet").
- [ ] All link cards remain clickable and open the URL in a new tab.

### Backend regression
- [ ] `PATCH /api/surveys/:id/` accepts `{ status, closes_at }` (manager-only).
- [ ] `PATCH /api/team/quick-links/:id/` and `PATCH /api/team/quick-links/categories/:id/` accept partial updates (manager-only).
- [ ] `DELETE /api/team/quick-links/categories/:id/` archives the category (sets `archived_at`) instead of hard-deleting.

---

## UI Phase 17 — FOH + Cleaning polish _(2026-05-15)_

> Replaces 4 dead controls (FOH initials toggle, TaskHistory date picker, two of CleaningMaintenance's header buttons) and extends the FOH history endpoint to accept arbitrary date ranges.

### `/foh-tasks` (FOHTasks)

#### As `admin@gmail.com / admin` (manager):
- [ ] Open Settings (top-right gear) → "Require Team Member Initials" toggle reflects the current `StoreSettings.foh_require_initials` value on load.
- [ ] Flipping the toggle calls `PATCH /api/stores/me/settings/` and persists across page reloads.
- [ ] With toggle ON, tapping a task checkbox opens an **Enter Your Initials** FormModal pre-filled with the user's first+last initial.
- [ ] Submitting valid initials (≤4 letters) marks the task complete and stores initials on `FOHTaskCompletion`.
- [ ] Cancelling the modal leaves the task unchecked.
- [ ] With toggle OFF, checkboxes complete immediately (no modal).

#### As `demouser@gmail.com / demouser` (team member):
- [ ] Toggle in the Settings modal is disabled (cannot change), but still reflects the current store value.
- [ ] If toggle is ON store-wide, team member sees the same initials modal before each completion.

### `/foh-tasks` → History (TaskHistory)

#### As any user:
- [ ] 7d / 14d / 30d preset pills still work as before.
- [ ] A new **Custom** pill (and the previously-dead date label button) both open a **Pick a Date Range** FormModal with two DatePicker fields.
- [ ] Submitting a valid range triggers `GET /api/foh/tasks/history/?start=…&end=…` and the day cards render that span.
- [ ] Start > end is rejected client-side with an inline error.
- [ ] Range >365 days is rejected client-side; the backend also enforces this cap.
- [ ] After applying a custom range, the Custom pill stays active and the date-label button shows the resolved span.
- [ ] Clicking a preset pill exits Custom mode.

### `/cleaning` (CleaningMaintenance)

#### As any user:
- [ ] Header no longer has the dead duplicate calendar-icon button — only History (clock) + Settings (gear) + Add (manager).
- [ ] Clock button opens a **Cleaning History** drawer listing the last 30 days of completions (task name + frequency + who + when).
- [ ] Empty state copy reads "No completions recorded in the last 30 days."
- [ ] Gear button opens a "Cleaning settings — coming soon" sentinel ConfirmDialog.

### Backend regression
- [ ] `GET /api/foh/tasks/history/?range=7d` still returns the 7-day rollup (unchanged behaviour).
- [ ] `GET /api/foh/tasks/history/?start=2026-04-01&end=2026-04-30` returns the rollup for that window.
- [ ] `GET /api/foh/tasks/history/?start=…&end=…` with start > end auto-swaps the two dates.
- [ ] `GET /api/foh/tasks/history/?start=…&end=…` with a span > 365 days returns a 400 validation error.
- [ ] `PATCH /api/stores/me/settings/` with `{foh_require_initials: true}` persists the change (manager-only).

---

## Bugs / oddities log

> Use this section as you test. Format:
>
> - **Page** — _short description_ — date
> - e.g. "Settings → Store Info — phone number field accepts letters, should be numeric-only — May 14"

- [ ]

---

## UI/UX wish list

> Things that aren't "broken" but you wish were better.

- [ ]
