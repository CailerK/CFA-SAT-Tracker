import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './CultureLeadershipPlanTemplate.css';

// ============================================================================
// 90-Day Culture Leadership Plan — fillable template page.
//
// Companion resource for the "90-Day Culture Leadership Plan" lesson inside
// the Restaurant Culture Builder dev plan. Mirrors the LD Growth template:
//   - Restaurant info
//   - Culture vision + 3 SMART goals
//   - 30-60-90 day action plan (modeling behaviors + reinforcing values)
//   - Cultural misalignment response framework
//   - Weekly culture metrics + monthly review questions
//   - Recognition & celebration plan
//   - Personal leadership commitments
//
// Persistence: every field auto-saves to localStorage under
// CULTURE_PLAN_KEY. The user can also Print, Reset, or load the
// Chick-fil-A demo example.
// ============================================================================

const CULTURE_PLAN_KEY = 'cfa-90day-culture-plan-v1';

// --- Default empty form state ------------------------------------------------
const emptyState = () => ({
  // Restaurant info
  restaurantName: '',
  location: '',
  managerName: '',
  startDate: '',
  cultureRating: '',

  // Vision + SMART goals
  vision: '',
  goals: [
    { specific: '', measurable: '', achievable: '', relevant: '', timebound: '' },
    { specific: '', measurable: '', achievable: '', relevant: '', timebound: '' },
    { specific: '', measurable: '', achievable: '', relevant: '', timebound: '' },
  ],

  // 30-60-90 day plan
  days_1_30:  { modeling: '', reinforcing: '' },
  days_31_60: { modeling: '', reinforcing: '' },
  days_61_90: { modeling: '', reinforcing: '' },

  // Cultural misalignment
  misalign_id: '',
  misalign_minor: '',
  misalign_major: '',
  misalign_prevention: '',

  // Measurement + accountability
  metrics: {
    morale:      { target: '', notes: '' },
    guest:       { target: '', notes: '' },
    engagement:  { target: '', notes: '' },
    behaviors:   { target: '', notes: '' },
  },
  monthly: ['', '', '', '', ''],

  // Recognition + celebration
  recog_daily: '',
  recog_weekly: '',
  recog_monthly: '',
  recog_90: '',

  // Personal leadership commitments
  pledge: '',
  daily_habits: '',
  weekly_dev: '',
});

// Demo content used by "Load example" — based on the prompt's mention of
// "how a completed plan looks for a Chick-fil-A restaurant".
const demoState = () => ({
  ...emptyState(),
  restaurantName: 'CFA I-410 & Rigsby',
  location: 'San Antonio, TX',
  managerName: 'Cailer K.',
  startDate: new Date().toISOString().slice(0, 10),
  cultureRating: '7',
  vision:
    'We are a team that genuinely cares for one another and our guests. '
    + 'Every shift, every guest, every team member feels seen, valued, and '
    + 'set up to win — because that is who we are, not just what we do.',
  goals: [
    {
      specific:   'Reduce 90-day team member turnover from 38% to 25%.',
      measurable: 'Track via monthly turnover report; target <= 25% by Day 90.',
      achievable: 'Combine weekly culture huddles, monthly 1:1s, and on-the-spot recognition.',
      relevant:   'High turnover is the #1 driver of guest experience inconsistency.',
      timebound:  '90 days, with check-ins at Day 30 and Day 60.',
    },
    {
      specific:   'Increase OSAT (overall guest satisfaction) by 4 points.',
      measurable: 'CEM weekly OSAT score; baseline 78, target 82 by Day 90.',
      achievable: 'Reinforce the 4 core behaviors at every pre-shift meeting.',
      relevant:   'Culture shows up in the guest experience first.',
      timebound:  'Achieve 82+ OSAT by end of Day 90.',
    },
    {
      specific:   'Have every team leader run their own pre-shift meeting independently.',
      measurable: '100% of team leaders observed running 5 successful pre-shifts.',
      achievable: 'Coach 1 leader per week; co-lead Weeks 1-4, hand off Weeks 5-12.',
      relevant:   'Builds the bench and frees the operator to focus on culture.',
      timebound:  'All leaders certified by Day 75.',
    },
  ],
  days_1_30: {
    modeling:
      '• Be on the floor during peak; greet every team member by name.\n'
      + '• Spend 5 min in each station per shift; ask "what is one thing I can do to make your job easier?"\n'
      + '• Lead pre-shift meetings personally for the first 30 days.',
    reinforcing:
      '• Recognize 3 team members in writing every shift.\n'
      + '• Tie every "thank you" to the specific behavior or value it modeled.\n'
      + '• Post weekly "Culture Wins" on the back-of-house board.',
  },
  days_31_60: {
    modeling:
      '• Co-lead pre-shifts with team leaders; give private debrief after each one.\n'
      + '• Walk the dining room mid-rush, chatting with 3 guests per visit.',
    reinforcing:
      '• Roll out the 4 core behaviors poster with examples in the team lounge.\n'
      + '• Bake recognition into every Friday huddle (everyone gets one shoutout).',
  },
  days_61_90: {
    modeling:
      '• Hand off pre-shifts entirely to team leaders; observe + coach only.\n'
      + '• Spend one full shift each week working a non-leadership station to stay close to the work.',
    reinforcing:
      '• Establish the "Culture Cup" — a monthly trophy voted on by team members.\n'
      + '• Begin training the next layer of leaders to run culture huddles themselves.',
  },
  misalign_id:
    'Watch for: side conversations during pre-shift, eye-rolls when standards are raised, '
    + 'gossip about teammates, and OSAT dips on specific shifts.',
  misalign_minor:
    'Pull the team member aside within 10 minutes. Restate the standard, ask what got '
    + 'in the way, and agree on one specific change for the next shift.',
  misalign_major:
    'Hold a private 1:1 the same day. Document what was discussed. Set a 7-day check-in '
    + 'and a clear "what good looks like" benchmark. Loop in the operator if patterns repeat.',
  misalign_prevention:
    'Make standards visible at every station. Re-teach them in every pre-shift. Hire for '
    + 'character first; technical skill we can train.',
  metrics: {
    morale:     { target: '8 / 10', notes: 'Anonymous 5-question pulse survey, weekly.' },
    guest:      { target: 'OSAT >= 82', notes: 'CEM weekly score; review every Monday.' },
    engagement: { target: '>= 90% on time + ready', notes: 'Pre-shift attendance + uniform check.' },
    behaviors:  { target: '5 specific behaviors observed/wk', notes: 'Tracked in shift recap.' },
  },
  monthly: [
    'Saw 6 team members hold each other accountable on the cleanliness standard without me having to step in.',
    'Marcus, Aaliyah, and Devin are consistently modeling "second-mile" guest service every shift.',
    'Hardest piece is keeping recognition fresh — it starts to feel rote by Week 6.',
    'I am getting better at private feedback; still working on slowing down before reacting.',
    'Need to involve team leaders earlier in pre-shift planning.',
  ],
  recog_daily:
    'Three written shoutouts per shift on the recognition board. Tie each one to a specific '
    + 'behavior or core value.',
  recog_weekly:
    'Friday "Culture Win of the Week" — voted by team leaders, $25 gift card + shoutout.',
  recog_monthly:
    'Culture Cup trophy passed monthly to the team member who most embodied our values, '
    + 'voted by peers.',
  recog_90:
    'Day-90 team meal off-site. Recap our wins, watch a slideshow of "before vs after," '
    + 'celebrate the team members who carried the culture forward.',
  pledge:
    'I will be the first one to live the standards I expect, even when no one is watching. '
    + 'I will own my mistakes openly and protect my team\'s dignity always.',
  daily_habits:
    '• Greet every team member by name at the start of their shift\n'
    + '• Walk every station at least once per peak\n'
    + '• Hand-write 3 recognitions before leaving for the day',
  weekly_dev:
    '• 30 min of leadership reading every Monday morning\n'
    + '• 1:1 coaching call with my team-leader bench every Wednesday\n'
    + '• Friday self-review: what did I model, what did I tolerate, what will I change?',
});

// --- localStorage helpers ----------------------------------------------------
const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(CULTURE_PLAN_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    // Shallow-merge to gracefully handle older shapes if we ever evolve the
    // schema. Nested objects fall back to the empty defaults.
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
};

const CultureLeadershipPlanTemplate = ({ onNavigate }) => {
  const [state, setState] = useState(() => loadFromStorage());
  const [savedAt, setSavedAt] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Auto-save (debounced) on every state change.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(CULTURE_PLAN_KEY, JSON.stringify(state));
        setSavedAt(new Date());
      } catch {
        // localStorage might be full or disabled (private mode). Fail silently.
      }
    }, 250);
    return () => clearTimeout(t);
  }, [state]);

  const update = useCallback((patch) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  // Helper to update one of the three SMART goals.
  const updateGoal = (idx, field, value) => {
    setState((s) => ({
      ...s,
      goals: s.goals.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  };

  // Helper to update a 30-60-90 day phase (days_1_30, days_31_60, days_61_90).
  const updatePhase = (phase, field, value) => {
    setState((s) => ({ ...s, [phase]: { ...s[phase], [field]: value } }));
  };

  // Helper to update one of the weekly metrics.
  const updateMetric = (key, field, value) => {
    setState((s) => ({
      ...s,
      metrics: { ...s.metrics, [key]: { ...s.metrics[key], [field]: value } },
    }));
  };

  const updateMonthly = (idx, value) => {
    setState((s) => ({
      ...s,
      monthly: s.monthly.map((m, i) => (i === idx ? value : m)),
    }));
  };

  const handlePrint = () => window.print();
  const handleLoadExample = () => setState(demoState());
  const handleReset = () => {
    setState(emptyState());
    setConfirmReset(false);
  };

  const savedLabel = useMemo(() => {
    if (!savedAt) return 'Auto-saves as you type';
    const now = new Date();
    const diff = Math.round((now - savedAt) / 1000);
    if (diff < 5) return 'Saved just now';
    if (diff < 60) return `Saved ${diff}s ago`;
    return `Saved at ${savedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  }, [savedAt]);

  return (
    <div className="clpt-page">
      <div className="clpt-shell">
        {/* ---- Header / actions ---- */}
        <button
          type="button"
          className="clpt-back"
          onClick={() => onNavigate && onNavigate('dev-plan-detail')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19-7-7 7-7"/>
            <path d="M19 12H5"/>
          </svg>
          Back to plan
        </button>

        <header className="clpt-hero">
          <div className="clpt-hero-tile" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="6"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
          </div>
          <div className="clpt-hero-text">
            <h1 className="clpt-title">90-Day Culture Leadership Plan</h1>
            <p className="clpt-sub">
              Transform your restaurant culture through intentional leadership.
              Fill in each section as you go — your progress saves automatically.
            </p>
          </div>
        </header>

        <div className="clpt-toolbar">
          <span className="clpt-savedchip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {savedLabel}
          </span>
          <div className="clpt-toolbar-actions">
            <button type="button" className="clpt-toolbtn" onClick={handleLoadExample}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              Load CFA example
            </button>
            <button type="button" className="clpt-toolbtn" onClick={handlePrint}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print
            </button>
            <button
              type="button"
              className="clpt-toolbtn clpt-toolbtn--danger"
              onClick={() => setConfirmReset(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
              </svg>
              Reset
            </button>
          </div>
        </div>

        {/* ====== Section 1 — Restaurant Information ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--blue" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Restaurant Information</h2>
              <p className="clpt-section-sub">Where this plan lives.</p>
            </div>
          </header>
          <div className="clpt-grid clpt-grid-2">
            <Field label="Restaurant name">
              <input
                type="text"
                value={state.restaurantName}
                onChange={(e) => update({ restaurantName: e.target.value })}
                placeholder="CFA I-410 & Rigsby"
              />
            </Field>
            <Field label="Location">
              <input
                type="text"
                value={state.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="San Antonio, TX"
              />
            </Field>
            <Field label="Manager / leader">
              <input
                type="text"
                value={state.managerName}
                onChange={(e) => update({ managerName: e.target.value })}
                placeholder="Your name"
              />
            </Field>
            <Field label="Plan start date">
              <input
                type="date"
                value={state.startDate}
                onChange={(e) => update({ startDate: e.target.value })}
              />
            </Field>
            <Field label="Current culture rating (1–10)" hint="Be honest — this is the baseline.">
              <input
                type="number"
                min="1"
                max="10"
                value={state.cultureRating}
                onChange={(e) => update({ cultureRating: e.target.value })}
                placeholder="7"
              />
            </Field>
          </div>
        </section>

        {/* ====== Section 2 — Culture Vision & SMART Goals ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--red" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Culture Vision &amp; Goals</h2>
              <p className="clpt-section-sub">
                Where you're headed and the SMART goals that will get you there.
              </p>
            </div>
          </header>

          <Field label="Our culture vision statement"
                 hint="A short paragraph describing the team you want to build.">
            <textarea
              rows={4}
              value={state.vision}
              onChange={(e) => update({ vision: e.target.value })}
              placeholder="We are a team that…"
            />
          </Field>

          <h3 className="clpt-subhead">90-day SMART goals</h3>
          <p className="clpt-subhead-help">
            Specific · Measurable · Achievable · Relevant · Time-bound.
          </p>

          {state.goals.map((goal, idx) => (
            <div key={idx} className="clpt-goal-card">
              <div className="clpt-goal-head">
                <span className="clpt-goal-number">SMART Goal #{idx + 1}</span>
              </div>
              <div className="clpt-grid clpt-grid-2">
                <Field label="Specific">
                  <textarea
                    rows={2}
                    value={goal.specific}
                    onChange={(e) => updateGoal(idx, 'specific', e.target.value)}
                    placeholder="What exactly are you trying to do?"
                  />
                </Field>
                <Field label="Measurable">
                  <textarea
                    rows={2}
                    value={goal.measurable}
                    onChange={(e) => updateGoal(idx, 'measurable', e.target.value)}
                    placeholder="How will you know you got there?"
                  />
                </Field>
                <Field label="Achievable">
                  <textarea
                    rows={2}
                    value={goal.achievable}
                    onChange={(e) => updateGoal(idx, 'achievable', e.target.value)}
                    placeholder="Why is this realistic?"
                  />
                </Field>
                <Field label="Relevant">
                  <textarea
                    rows={2}
                    value={goal.relevant}
                    onChange={(e) => updateGoal(idx, 'relevant', e.target.value)}
                    placeholder="Why does it matter right now?"
                  />
                </Field>
                <Field label="Time-bound" full>
                  <textarea
                    rows={2}
                    value={goal.timebound}
                    onChange={(e) => updateGoal(idx, 'timebound', e.target.value)}
                    placeholder="When will it be done?"
                  />
                </Field>
              </div>
            </div>
          ))}
        </section>

        {/* ====== Section 3 — 30-60-90 Day Action Plan ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--emerald" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2"/>
                <path d="M3 10h18"/>
                <path d="M8 2v4"/>
                <path d="M16 2v4"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">30-60-90 Day Action Plan</h2>
              <p className="clpt-section-sub">
                Build the foundation, gain momentum, then embed the culture.
              </p>
            </div>
          </header>

          <PhaseCard
            label="Days 1–30 · Foundation Building"
            phaseKey="days_1_30"
            data={state.days_1_30}
            onChange={updatePhase}
            tint="emerald"
          />
          <PhaseCard
            label="Days 31–60 · Momentum Building"
            phaseKey="days_31_60"
            data={state.days_31_60}
            onChange={updatePhase}
            tint="amber"
          />
          <PhaseCard
            label="Days 61–90 · Culture Embedding"
            phaseKey="days_61_90"
            data={state.days_61_90}
            onChange={updatePhase}
            tint="red"
          />
        </section>

        {/* ====== Section 4 — Addressing Cultural Misalignment ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--amber" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" x2="12" y1="9" y2="13"/>
                <line x1="12" x2="12.01" y1="17" y2="17"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Addressing Cultural Misalignment</h2>
              <p className="clpt-section-sub">
                Spot it early, respond fairly, prevent it from coming back.
              </p>
            </div>
          </header>

          <Field label="Identification strategy"
                 hint="What signals tell you culture is drifting?">
            <textarea
              rows={3}
              value={state.misalign_id}
              onChange={(e) => update({ misalign_id: e.target.value })}
              placeholder="Watch for…"
            />
          </Field>

          <h3 className="clpt-subhead">Response framework</h3>
          <div className="clpt-grid clpt-grid-2">
            <Field label="Minor misalignment">
              <textarea
                rows={4}
                value={state.misalign_minor}
                onChange={(e) => update({ misalign_minor: e.target.value })}
                placeholder="One-off small behavior — how do you respond?"
              />
            </Field>
            <Field label="Major misalignment">
              <textarea
                rows={4}
                value={state.misalign_major}
                onChange={(e) => update({ misalign_major: e.target.value })}
                placeholder="Repeat or serious behavior — how do you respond?"
              />
            </Field>
          </div>

          <Field label="Prevention measures">
            <textarea
              rows={3}
              value={state.misalign_prevention}
              onChange={(e) => update({ misalign_prevention: e.target.value })}
              placeholder="Hiring, onboarding, visibility of standards…"
            />
          </Field>
        </section>

        {/* ====== Section 5 — Measurement & Accountability ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--violet" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="M18 17V9"/>
                <path d="M13 17V5"/>
                <path d="M8 17v-3"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Measurement &amp; Accountability</h2>
              <p className="clpt-section-sub">
                Track the culture so it stays real, not aspirational.
              </p>
            </div>
          </header>

          <h3 className="clpt-subhead">Weekly culture metrics</h3>
          <div className="clpt-metrics">
            {[
              { key: 'morale',     label: 'Team morale' },
              { key: 'guest',      label: 'Guest feedback' },
              { key: 'engagement', label: 'Team engagement' },
              { key: 'behaviors',  label: 'Culture behaviors' },
            ].map(({ key, label }) => (
              <div key={key} className="clpt-metric-card">
                <span className="clpt-metric-label">{label}</span>
                <Field label="Target">
                  <input
                    type="text"
                    value={state.metrics[key].target}
                    onChange={(e) => updateMetric(key, 'target', e.target.value)}
                    placeholder="e.g. 8 / 10"
                  />
                </Field>
                <Field label="Notes">
                  <input
                    type="text"
                    value={state.metrics[key].notes}
                    onChange={(e) => updateMetric(key, 'notes', e.target.value)}
                    placeholder="How will you measure it?"
                  />
                </Field>
              </div>
            ))}
          </div>

          <h3 className="clpt-subhead">Monthly review questions</h3>
          {[
            'What cultural improvements have I observed?',
            'Which team members are exemplifying our values?',
            'What challenges am I facing in culture development?',
            'How am I growing as a culture leader?',
            'What adjustments need to be made to my approach?',
          ].map((question, idx) => (
            <Field key={idx} label={question}>
              <textarea
                rows={2}
                value={state.monthly[idx]}
                onChange={(e) => updateMonthly(idx, e.target.value)}
              />
            </Field>
          ))}
        </section>

        {/* ====== Section 6 — Recognition & Celebration ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--red" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Recognition &amp; Celebration Plan</h2>
              <p className="clpt-section-sub">
                Culture is reinforced by what you celebrate.
              </p>
            </div>
          </header>
          <div className="clpt-grid clpt-grid-2">
            <Field label="Daily recognition">
              <textarea
                rows={3}
                value={state.recog_daily}
                onChange={(e) => update({ recog_daily: e.target.value })}
              />
            </Field>
            <Field label="Weekly celebrations">
              <textarea
                rows={3}
                value={state.recog_weekly}
                onChange={(e) => update({ recog_weekly: e.target.value })}
              />
            </Field>
            <Field label="Monthly culture awards">
              <textarea
                rows={3}
                value={state.recog_monthly}
                onChange={(e) => update({ recog_monthly: e.target.value })}
              />
            </Field>
            <Field label="90-day success celebration">
              <textarea
                rows={3}
                value={state.recog_90}
                onChange={(e) => update({ recog_90: e.target.value })}
              />
            </Field>
          </div>
        </section>

        {/* ====== Section 7 — Personal Leadership Commitments ====== */}
        <section className="clpt-section">
          <header className="clpt-section-head">
            <span className="clpt-section-icon clpt-icon--violet" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" x2="8" y1="13" y2="13"/>
                <line x1="16" x2="8" y1="17" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </span>
            <div>
              <h2 className="clpt-section-title">Personal Leadership Commitments</h2>
              <p className="clpt-section-sub">What you will do, every day.</p>
            </div>
          </header>

          <Field label="My leadership pledge">
            <textarea
              rows={3}
              value={state.pledge}
              onChange={(e) => update({ pledge: e.target.value })}
              placeholder="I will…"
            />
          </Field>
          <Field label="Daily leadership habits"
                 hint="One per line — keep them small and repeatable.">
            <textarea
              rows={4}
              value={state.daily_habits}
              onChange={(e) => update({ daily_habits: e.target.value })}
            />
          </Field>
          <Field label="Weekly leadership development">
            <textarea
              rows={4}
              value={state.weekly_dev}
              onChange={(e) => update({ weekly_dev: e.target.value })}
            />
          </Field>
        </section>

        {/* ---- Footer cue ---- */}
        <p className="clpt-footnote">
          🌟 Remember: culture is built through consistent daily actions, not grand gestures.
          Your leadership sets the tone for everything that happens in your restaurant.
        </p>
      </div>

      {/* ---- Reset confirm dialog ---- */}
      {confirmReset && (
        <div className="clpt-modal-overlay" onClick={() => setConfirmReset(false)}>
          <div
            className="clpt-modal"
            role="dialog"
            aria-labelledby="clpt-reset-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="clpt-modal-title" id="clpt-reset-title">Reset this plan?</h2>
            <p className="clpt-modal-body">
              This will clear every field and remove the saved copy on this device.
              You can't undo it.
            </p>
            <div className="clpt-modal-actions">
              <button
                type="button"
                className="clpt-modal-cancel"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="clpt-modal-destructive"
                onClick={handleReset}
              >
                Reset plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Tiny field wrapper ------------------------------------------------------
const Field = ({ label, hint, full, children }) => (
  <label className={`clpt-field ${full ? 'is-full' : ''}`}>
    <span className="clpt-field-label">{label}</span>
    {children}
    {hint && <span className="clpt-field-hint">{hint}</span>}
  </label>
);

// --- Phase card (Days 1-30, 31-60, 61-90) ------------------------------------
const PhaseCard = ({ label, phaseKey, data, onChange, tint }) => (
  <div className={`clpt-phase-card clpt-phase--${tint}`}>
    <h3 className="clpt-phase-title">{label}</h3>
    <Field label="Modeling behaviors"
           hint="What will the team see you doing?">
      <textarea
        rows={4}
        value={data.modeling}
        onChange={(e) => onChange(phaseKey, 'modeling', e.target.value)}
        placeholder="• …"
      />
    </Field>
    <Field label="Reinforcing values"
           hint="How will you make the values impossible to miss?">
      <textarea
        rows={4}
        value={data.reinforcing}
        onChange={(e) => onChange(phaseKey, 'reinforcing', e.target.value)}
        placeholder="• …"
      />
    </Field>
  </div>
);

export default CultureLeadershipPlanTemplate;
