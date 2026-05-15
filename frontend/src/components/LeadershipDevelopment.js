import React, { useState, useEffect, useMemo } from 'react';
import './LeadershipDevelopment.css';
import leadershipService from '../services/leadership';
import { ConfirmDialog, HistoryDrawer, FormModal } from './ui';
import { DEV_PLANS } from './LeadershipDevPlans';

const LeadershipDevelopment = ({ user, onNavigate }) => {
  // Track which area_keys the current user has selected (persisted on backend).
  const [selectedAreaIds, setSelectedAreaIds] = useState(new Set());
  // Map area_key → backend record id so we can DELETE on toggle off.
  const [areaRecordIds, setAreaRecordIds] = useState({});
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  // The user's active development-plan enrollment (drives the Development
  // card on the dashboard). When no enrollment is active, the card flips to
  // a "Browse plans" CTA. The full library lives at the `dev-plans` route.
  const [activePlan, setActivePlan] = useState(null);
  // ---- UI state for Phase 14 wiring ----
  const [deleteNote, setDeleteNote] = useState(null); // note record
  const [showAllNotes, setShowAllNotes] = useState(false); // notes drawer
  // Manage Areas modal (the gear icon).
  const [areasModalOpen, setAreasModalOpen] = useState(false);
  // Local completion state for today's leadership tasks (UI-only for now).
  const [completedTaskIds, setCompletedTaskIds] = useState(() => new Set());
  // Show all today's tasks vs collapsed (5 + "+N more").
  const [tasksExpanded, setTasksExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [areaRes, noteRes, plansRes] = await Promise.all([
          leadershipService.listAreas(),
          leadershipService.listNotes(),
          // Per-user development-plan enrollments — drives the Development card.
          leadershipService.listMyDevPlans().catch(() => ({ results: [] })),
        ]);
        if (cancelled) return;
        const areaRows = areaRes.results || areaRes || [];
        setSelectedAreaIds(new Set(areaRows.map((a) => a.area_key)));
        const map = {};
        for (const a of areaRows) map[a.area_key] = a.id;
        setAreaRecordIds(map);
        setNotes(noteRes.results || noteRes || []);
        // Pick the first active enrollment as the "primary" plan to feature
        // on the Development card. Most-recent active wins because the API
        // returns by `-started_at`.
        const plans = plansRes.results || plansRes || [];
        const firstActive = plans.find((p) => p.status === 'active') || null;
        setActivePlan(firstActive);
      } catch (err) {
        console.error('Failed to load leadership dashboard data:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toggleArea = async (areaKey) => {
    const isSelected = selectedAreaIds.has(areaKey);
    // Optimistic update.
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(areaKey);
      else next.add(areaKey);
      return next;
    });
    try {
      if (isSelected) {
        const id = areaRecordIds[areaKey];
        if (id) await leadershipService.deleteArea(id);
        setAreaRecordIds((m) => { const c = { ...m }; delete c[areaKey]; return c; });
      } else {
        const created = await leadershipService.createArea({ area_key: areaKey });
        if (created?.id) {
          setAreaRecordIds((m) => ({ ...m, [areaKey]: created.id }));
        }
      }
    } catch (err) {
      console.error('Toggle area failed:', err);
      // Roll back.
      setSelectedAreaIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.add(areaKey);
        else next.delete(areaKey);
        return next;
      });
    }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const created = await leadershipService.createNote({ text: noteText.trim() });
      setNotes((n) => [created, ...n]);
      setNoteText('');
    } catch (err) {
      console.error('Save note failed:', err);
    }
  };

  const performDeleteNote = async () => {
    if (!deleteNote) return;
    try {
      await leadershipService.deleteNote(deleteNote.id);
      setNotes((n) => n.filter((x) => x.id !== deleteNote.id));
      setDeleteNote(null);
    } catch (err) {
      console.error('Delete note failed:', err);
      setDeleteNote(null);
    }
  };

  // ============================================================================
  // AREA DEFINITIONS — drives My Numbers tiles and Today's Tasks per area.
  //
  // FAKE_DATA: these metric labels/targets and task names are hardcoded
  // pending real backend models for LeadershipKpi (per-store, per-area
  // metric definitions + values + targets) and LeadershipTask (per-area
  // task templates with completion records). Until then this matches the
  // LD Growth /leadership/dashboard layout 1:1 visually with stub data.
  // Values render as "—" so we don't fake numeric data.
  // ============================================================================
  const AREA_DEFS = useMemo(() => ({
    'kitchen': {
      name: 'Kitchen',
      icon: '🍳',
      metrics: [
        { id: 'taste',        label: 'Taste Score',       target: 85 },
        { id: 'food-cost',    label: 'Food Cost Gap',     target: 1 },
        { id: 'waste',        label: 'Waste $',           target: 200 },
        { id: 'food-safety',  label: 'Food Safety Score', target: 95 },
      ],
      tasks: [
        'Enter weekly Kitchen scorecard (Taste, Waste $, Food Cost Gap, Food Safety)',
        'Review Waste & Food Cost variance vs target',
        'Complete daily Kitchen food safety walkthrough',
        'Review broken equipment list and resolve open items',
        'Verify fryer oil quality & filter schedule completed',
        'Audit prep board and waste log for accuracy',
        'Review temp logs and refrigeration alerts',
        'Coach team on speed-with-purpose kitchen standards',
        "Plan tomorrow's prep based on forecast",
      ],
    },
    'drive-thru': {
      name: 'Drive Thru',
      icon: '🚗',
      metrics: [
        { id: 'sos',           label: 'Speed of Service', target: 180 },
        { id: 'order-acc',     label: 'Order Accuracy %', target: 98 },
        { id: 'cars-per-hour', label: 'Cars Per Hour',    target: 90 },
        { id: 'kindness',      label: 'Kindness Score',   target: 95 },
      ],
      tasks: [
        'Review Drive Thru speed-of-service report from yesterday',
        'Walk Drive Thru and check timing-board accuracy',
        'Coach Drive Thru team on 2nd-mile service moments',
        'Audit headset condition and battery rotation',
        'Verify outside team is on station for peak',
      ],
    },
    'front-counter': {
      name: 'Front Counter',
      icon: '👤',
      metrics: [
        { id: 'guest-exp',    label: 'Guest Experience', target: 90 },
        { id: 'fc-speed',     label: 'FC Speed',         target: 60 },
        { id: 'mobile-ord',   label: 'Mobile Order Time', target: 90 },
        { id: 'cleanliness',  label: 'Lobby Cleanliness', target: 95 },
      ],
      tasks: [
        'Walk lobby and check cleanliness standards',
        'Verify mobile order pickup is on station',
        'Coach Front Counter team on greeting standards',
        'Audit POS accuracy and refund log',
      ],
    },
    'food-safety': {
      name: 'Food Safety',
      icon: '🛡️',
      metrics: [
        { id: 'safety-score',  label: 'Safety Score',     target: 95 },
        { id: 'temp-checks',   label: 'Temp Check %',     target: 100 },
        { id: 'open-issues',   label: 'Open Issues',      target: 0 },
        { id: 'audit-score',   label: 'Audit Score',      target: 95 },
      ],
      tasks: [
        'Review yesterday\'s temperature logs',
        'Spot-check hand-washing compliance',
        'Verify allergen protocol training',
        'Confirm sanitizer concentrations across stations',
      ],
    },
    'hospitality': {
      name: 'Hospitality',
      icon: '❤️',
      metrics: [
        { id: 'cem',          label: 'CEM Score',        target: 80 },
        { id: 'taste-of-care', label: 'Taste of Care',   target: 80 },
        { id: 'recovery',     label: 'Recovery Time',    target: 5 },
        { id: 'survey-resp',  label: 'Survey Responses', target: 50 },
      ],
      tasks: [
        'Review CEM scores from yesterday',
        'Recognize a team member with a Care Card',
        'Walk the dining room and engage with guests',
        'Follow up on any open guest recovery cases',
      ],
    },
    'talent': {
      name: 'Talent',
      icon: '🎓',
      metrics: [
        { id: 'turnover',      label: 'Turnover %',     target: 80 },
        { id: 'open-roles',    label: 'Open Roles',     target: 0 },
        { id: 'training-comp', label: 'Training Compl.', target: 90 },
        { id: 'eval-on-time',  label: 'Evals On-Time',  target: 100 },
      ],
      tasks: [
        'Review open roles and recruiting funnel',
        'Conduct one stay-interview today',
        'Approve training plan for new hire(s)',
        'Submit pending evaluations',
      ],
    },
    'ops-director': {
      name: 'Ops Director',
      icon: '📊',
      metrics: [
        { id: 'sales',        label: 'Sales vs Plan',  target: 100 },
        { id: 'labor',        label: 'Labor %',        target: 24 },
        { id: 'operator-walk', label: 'Operator Walks', target: 5 },
        { id: 'leader-1on1s', label: 'Leader 1:1s',    target: 3 },
      ],
      tasks: [
        'Review sales pacing vs plan',
        'Walk store with at least one leader',
        'Hold one 1:1 with a direct report',
        'Review weekly P&L variance',
      ],
    },
    'catering': {
      name: 'Catering',
      icon: '🎉',
      metrics: [
        { id: 'cat-sales',     label: 'Catering Sales',   target: 5000 },
        { id: 'cat-orders',    label: 'Orders This Week', target: 25 },
        { id: 'cat-on-time',   label: 'On-Time Delivery', target: 98 },
        { id: 'repeat-rate',   label: 'Repeat Rate',      target: 60 },
      ],
      tasks: [
        'Confirm tomorrow\'s catering orders',
        'Make 5 catering outreach calls',
        'Verify catering vehicle stocked and clean',
        'Follow up with last week\'s repeat clients',
      ],
    },
    'facilities': {
      name: 'Facilities',
      icon: '🏢',
      metrics: [
        { id: 'open-tickets', label: 'Open Tickets', target: 0 },
        { id: 'preventive',   label: 'PM Compl. %',  target: 95 },
        { id: 'energy',       label: 'Energy vs PY', target: 95 },
        { id: 'curb-appeal',  label: 'Curb Appeal',  target: 90 },
      ],
      tasks: [
        'Walk exterior and check curb appeal',
        'Review open maintenance tickets',
        'Verify scheduled PMs completed this week',
        'Audit recent vendor invoices',
      ],
    },
    'inventory': {
      name: 'Inventory',
      icon: '📦',
      metrics: [
        { id: 'food-cost-pct', label: 'Food Cost %', target: 30 },
        { id: 'variance',      label: 'Variance',    target: 1 },
        { id: 'on-hand',       label: 'Days On Hand', target: 3 },
        { id: 'shrink',        label: 'Shrink %',    target: 1 },
      ],
      tasks: [
        'Complete weekly inventory count',
        'Review variance report and investigate top items',
        'Place order for shortage items',
        'Audit storeroom for FIFO compliance',
      ],
    },
    'marketing': {
      name: 'Marketing',
      icon: '📣',
      metrics: [
        { id: 'app-signups',   label: 'App Signups',    target: 25 },
        { id: 'social-engage', label: 'Social Engage',  target: 100 },
        { id: 'lto-attach',    label: 'LTO Attach %',   target: 20 },
        { id: 'community',     label: 'Community Hrs',  target: 10 },
      ],
      tasks: [
        'Post today\'s LTO highlight to social',
        'Review app-signup conversions',
        'Plan next community engagement event',
        'Audit in-store marketing materials',
      ],
    },
    'custom-area': {
      name: 'Custom Area',
      icon: '✏️',
      metrics: [
        { id: 'metric-1', label: 'Metric 1', target: 100 },
        { id: 'metric-2', label: 'Metric 2', target: 100 },
        { id: 'metric-3', label: 'Metric 3', target: 100 },
        { id: 'metric-4', label: 'Metric 4', target: 100 },
      ],
      tasks: [
        'Define this area in Settings',
      ],
    },
  }), []);

  // Ordered list of selected areas (preserves AREA_DEFS order).
  const selectedAreas = useMemo(() => {
    return Object.keys(AREA_DEFS)
      .filter((key) => selectedAreaIds.has(key))
      .map((key) => ({ key, ...AREA_DEFS[key] }));
  }, [selectedAreaIds, AREA_DEFS]);

  // Today's Tasks: roll up tasks from all selected areas.
  // Each task gets a stable id of the form `${areaKey}::${index}`.
  const todaysTasks = useMemo(() => {
    const out = [];
    for (const area of selectedAreas) {
      area.tasks.forEach((text, i) => {
        out.push({
          id: `${area.key}::${i}`,
          areaKey: area.key,
          areaName: area.name,
          text,
        });
      });
    }
    return out;
  }, [selectedAreas]);

  const completedCount = useMemo(
    () => todaysTasks.filter((t) => completedTaskIds.has(t.id)).length,
    [todaysTasks, completedTaskIds],
  );
  const taskProgressPct = todaysTasks.length === 0
    ? 0
    : Math.round((completedCount / todaysTasks.length) * 100);

  const toggleTask = (id) => {
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ----- Date in LD Growth's "Friday, May 15" format -----
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // All 12 areas — used inside the Manage Areas modal grid.
  const ALL_AREAS = Object.keys(AREA_DEFS).map((key) => ({
    id: key,
    name: AREA_DEFS[key].name,
    icon: AREA_DEFS[key].icon,
  }));

  // Show first 5 tasks in collapsed mode (LD Growth shows 5 + "+N more").
  const visibleTasks = tasksExpanded ? todaysTasks : todaysTasks.slice(0, 5);
  const remainingTaskCount = Math.max(0, todaysTasks.length - 5);

  return (
    <div className="ld-page">
      <div className="ld-shell">
        {/* ============== Header (Hey, name + date + gear) ============== */}
        <div className="ld-header">
          <div>
            <h1 className="ld-greeting">
              Hey, {user?.firstName?.toLowerCase() || 'there'}
            </h1>
            <p className="ld-date">{todayLabel}</p>
          </div>
          <button
            type="button"
            className="ld-gear"
            aria-label="Manage areas"
            onClick={() => setAreasModalOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        {/* ============== My Numbers (per-area scorecards) ============== */}
        <div className="ld-card">
          <div className="ld-card-head">
            <h2 className="ld-card-title">My Numbers</h2>
          </div>

          {selectedAreas.length === 0 ? (
            <div className="ld-empty">
              <p>You haven't picked any areas yet.</p>
              <button
                type="button"
                className="ld-empty-cta"
                onClick={() => setAreasModalOpen(true)}
              >
                Choose your areas
              </button>
            </div>
          ) : (
            selectedAreas.map((area) => (
              <div key={area.key} className="ld-numbers-section">
                <div className="ld-numbers-area-label">
                  <span className="ld-numbers-area-emoji" aria-hidden="true">{area.icon}</span>
                  <span>{area.name}</span>
                </div>
                <div className="ld-metrics-grid">
                  {area.metrics.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="ld-metric-tile"
                      aria-label={`Edit ${m.label}`}
                    >
                      <div className="ld-metric-row">
                        <div className="ld-metric-label-wrap">
                          <span className="ld-metric-dot" aria-hidden="true" />
                          <span className="ld-metric-label">{m.label}</span>
                        </div>
                        <svg className="ld-metric-edit" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                          <path d="m15 5 4 4"/>
                        </svg>
                      </div>
                      <div className="ld-metric-value-row">
                        <span className="ld-metric-value">—</span>
                        <span className="ld-metric-target">/ {m.target}</span>
                        <svg className="ld-metric-trend" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"/>
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ============== Today's Tasks ============== */}
        {selectedAreas.length > 0 && (
          <div className="ld-card">
            <div className="ld-card-head">
              <h2 className="ld-card-title">Today's Tasks</h2>
              <span className="ld-task-count">{completedCount} of {todaysTasks.length}</span>
            </div>

            <div className="ld-task-progress-wrap">
              <div className="ld-task-progress-track">
                <div
                  className="ld-task-progress-fill"
                  style={{ width: `${taskProgressPct}%` }}
                />
              </div>
            </div>

            <div className="ld-task-list">
              {visibleTasks.map((task) => {
                const done = completedTaskIds.has(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    className={`ld-task-row ${done ? 'is-done' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    <span className="ld-task-check">
                      {done ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      )}
                    </span>
                    <span className="ld-task-text">{task.text}</span>
                    <span className="ld-task-area">{task.areaName}</span>
                  </button>
                );
              })}
            </div>

            {remainingTaskCount > 0 && !tasksExpanded && (
              <button
                type="button"
                className="ld-task-more"
                onClick={() => setTasksExpanded(true)}
              >
                +{remainingTaskCount} more task{remainingTaskCount === 1 ? '' : 's'}
              </button>
            )}
            {tasksExpanded && todaysTasks.length > 5 && (
              <button
                type="button"
                className="ld-task-more"
                onClick={() => setTasksExpanded(false)}
              >
                Show less
              </button>
            )}
          </div>
        )}

        {/* ============== Development Card ==============
            Same card-size in both states (active vs available). Clicking
            either flips you to the Development Plans library. */}
        {(() => {
          const activePlanMeta = activePlan
            ? DEV_PLANS.find((p) => p.key === activePlan.plan_key)
            : null;
          const planName = activePlanMeta?.name || activePlan?.plan_key || '';
          const planTagline = activePlanMeta?.tagline || 'In progress';
          const progressPct = activePlan?.progress_percent ?? 0;
          return (
            <button
              type="button"
              className="ld-dev-card"
              onClick={() => {
                if (!onNavigate) return;
                // If a plan is active, jump straight into its detail page;
                // otherwise show the library so the user can pick one.
                if (activePlan) {
                  onNavigate('dev-plan-detail', { planKey: activePlan.plan_key });
                } else {
                  onNavigate('dev-plans');
                }
              }}
            >
              <div className="ld-dev-card-inner">
                <div className="ld-dev-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
                    <path d="M22 10v6"/>
                    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
                  </svg>
                </div>
                {activePlan ? (
                  <div className="ld-dev-text">
                    <h3 className="ld-dev-title">Development</h3>
                    <p className="ld-dev-sub">{planName || planTagline}</p>
                    <div className="ld-dev-progress-row">
                      <div className="ld-dev-progress-track">
                        <div
                          className="ld-dev-progress-fill"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="ld-dev-progress-text">{progressPct}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="ld-dev-text">
                    <h3 className="ld-dev-title">Development</h3>
                    <p className="ld-dev-sub">Browse plans to start your growth journey</p>
                    <span className="ld-dev-cta-pill">+ Choose a plan</span>
                  </div>
                )}
              </div>
              <svg className="ld-dev-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          );
        })()}

        {/* ============== Notes ============== */}
        <div className="ld-card">
          <div className="ld-card-head">
            <h2 className="ld-card-title">Notes</h2>
            <button
              type="button"
              className="ld-see-all"
              onClick={() => setShowAllNotes(true)}
            >
              See all →
            </button>
          </div>
          <div className="ld-notes-body">
            <div className="ld-note-input">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/>
                <path d="M15 3v4a2 2 0 0 0 2 2h4"/>
              </svg>
              <input
                type="text"
                placeholder="Jot a quick note..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveNote();
                  }
                }}
              />
              <button
                type="button"
                className="ld-note-save"
                onClick={saveNote}
                disabled={!noteText.trim()}
              >
                Save
              </button>
            </div>

            {notes.length > 0 && (
              <div className="ld-note-list">
                {notes.slice(0, 3).map((note) => (
                  <div key={note.id} className="ld-note-item">
                    <span className="ld-note-text">{note.text}</span>
                    <button
                      type="button"
                      className="ld-note-delete"
                      aria-label="Delete note"
                      onClick={() => setDeleteNote(note)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Notes drawer (See all) ---- */}
      <HistoryDrawer
        isOpen={showAllNotes}
        title="All Notes"
        subtitle={`${notes.length} note${notes.length === 1 ? '' : 's'}`}
        emptyMessage="No notes yet. Use the input above to add your first."
        onClose={() => setShowAllNotes(false)}
        rows={notes.map((n) => ({
          id: n.id,
          primary: n.text,
          timestamp: n.created_at
            ? new Date(n.created_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit',
              })
            : '',
        }))}
      />

      {/* ---- Delete note confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteNote}
        title="Delete this note?"
        message="This note will be permanently removed."
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteNote}
        onClose={() => setDeleteNote(null)}
      />

      {/* ---- Manage Areas modal (gear icon) ---- */}
      <FormModal
        isOpen={areasModalOpen}
        title="Manage Areas"
        size="lg"
        submitLabel="Done"
        cancelLabel="Close"
        onSubmit={async () => { setAreasModalOpen(false); }}
        onClose={() => setAreasModalOpen(false)}
      >
        <p className="ld-modal-hint">
          Pick the areas of the business you own. Each area adds its own
          scorecard and tasks to your dashboard.
        </p>
        <div className="ld-modal-areas-grid">
          {ALL_AREAS.map((area) => {
            const isSelected = selectedAreaIds.has(area.id);
            return (
              <button
                key={area.id}
                type="button"
                className={`ld-modal-area-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggleArea(area.id)}
              >
                <span className="ld-modal-area-icon">{area.icon}</span>
                <span className="ld-modal-area-name">{area.name}</span>
                {isSelected && (
                  <span className="ld-modal-area-check" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </FormModal>
    </div>
  );
};

export default LeadershipDevelopment;
