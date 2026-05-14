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
_(To be added after Phase 4 ships.)_

---

## Phase 5 — Equipment & Food Safety
_(To be added.)_

---

## Phase 6 — Team (Members, Documentation, Training, Quick Links)
_(To be added.)_

---

## Phase 7 — Leadership
_(To be added — pause for user's program list first.)_

---

## Phase 8 — Calendar, Guest Recovery, Vendors, Team Chat, Surveys
_(To be added.)_

---

## Phase 9 — Polish (Notifications, Dashboard insights, Weekly Digest)
_(To be added.)_

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
