import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './LeadershipDevPlans.css';
import leadershipService from '../services/leadership';
import { ConfirmDialog } from './ui';

// ============================================================================
// DEV_PLANS catalog — hardcoded while the user transcribes their LD Growth
// plans 1 by 1. Each new plan should be appended here. The backend only
// stores per-user enrollment in plans (see UserDevelopmentPlan model).
//
// Plan shape:
//   key:          slug — must match `plan_key` on UserDevelopmentPlan
//   name:         display title (e.g. "The Heart of Leadership")
//   tagline:      one-line subtitle
//   description:  longer paragraph for the card body
//   category:     "Foundation" | "Director Track" | "Specialty" | …
//   icon:         emoji or short text
//   accent:       'purple' | 'red' | 'blue' | 'emerald' | 'amber' (theme color)
//   total_steps:  number of steps in the curriculum (drives progress %)
//   estimated_hours: optional rough time commitment
// ============================================================================
// Helper to build a stable lesson key from its 1-indexed position. Backend
// stores these as the `lesson_key` on `LessonCompletion`.
const L = (idx, type, title, time, desc) => ({
  key: String(idx).padStart(2, '0'),
  index: idx,
  type, // 'Activity' | 'Reading' | 'Reflection' | 'Assessment' | 'Video'
  title,
  time,
  description: desc,
});

export const DEV_PLANS = [
  {
    key: 'heart-of-leadership',
    name: 'The Heart of Leadership',
    tagline: 'Foundations of servant leadership',
    description:
      'A foundational journey through the character traits that define great leaders. '
      + 'Built around CFA\'s leadership culture, this plan covers humility, hunger, and people smarts.',
    category: 'Foundation',
    icon: '❤️',
    accent: 'purple',
    estimated_hours: null,
    lessons: [
      L(1, 'Activity', 'Start Each Shift by Helping a Team Member',
        '1 week of practice + 20 minutes documentation',
        'For one week, begin every shift by identifying a team member who needs help and actively assist them with their tasks before focusing on your own responsibilities.\n\n📝 **Completion Requirement:** Document 5 instances where you helped team members first, including their reactions and how it affected the team dynamic.'),
      L(2, 'Activity', 'Practice Active Listening During Team Conversations',
        '1 week of practice + 5 minutes daily reflection',
        'Focus on truly listening to team members during conversations. Use the 5-minute daily reflection journal to track your listening skills and team member responses.\n\n📝 **Completion Requirement:** Complete 7 daily reflection entries documenting your active listening practice, including what you learned about your team members.'),
      L(3, 'Activity', 'Acknowledge Mistakes Openly and Take Responsibility',
        '2 weeks of practice + 30 minutes documentation',
        'Practice taking full responsibility for mistakes without making excuses or blaming others. Model the character trait of accountability for your team.\n\n📝 **Completion Requirement:** Document 3 situations where you acknowledged mistakes openly, including how you took responsibility and what you learned from each situation.'),
      L(4, 'Reading', 'The Heart of Leadership - Week 1: Introduction + "Think Others First"',
        '45 minutes reading + 15 minutes reflection',
        'Read "The Heart of Leadership" by Mark Miller (available free at local library). This week, read the Introduction and Chapter 1 "Think Others First" (approximately 30 pages).\n\n📖 **Reading Focus:**\n• The difference between leadership capacity and character\n• Why people follow leaders because of who they are\n• What it means to put others first as a leader\n• Practical ways to demonstrate servant leadership\n\n📝 **Completion Requirement:** Write a reflection on what character-based leadership means in your restaurant role and identify 3 specific ways you can put your team first this week.'),
      L(5, 'Reading', 'The Heart of Leadership - Week 2: "Expect the Best" + "Respond with Courage"',
        '50 minutes reading + 20 minutes planning',
        'Continue reading Chapters 2-3: "Expect the Best" and "Respond with Courage" (approximately 35 pages).\n\n📖 **Reading Focus:**\n• How your expectations affect team performance\n• The importance of believing in your team members\n• What courageous leadership looks like in daily situations\n• How to have difficult conversations with care\n\n📝 **Completion Requirement:** Identify one team member who would benefit from higher expectations and plan a courageous conversation you need to have.'),
      L(6, 'Reading', 'The Heart of Leadership - Week 3: "Think Long-term" + "Display Humility"',
        '45 minutes reading + 25 minutes planning',
        'Complete the book with Chapters 4-5: "Think Long-term" and "Display Humility" (approximately 30 pages).\n\n📖 **Reading Focus:**\n• Balancing immediate needs with long-term development\n• How to invest in people for future success\n• The power of humility in leadership\n• Learning from mistakes and failures\n\n📝 **Completion Requirement:** Create a 90-day development plan for one team member and identify one area where you need to show more humility.'),
      L(7, 'Activity', 'Integrate All Five Character Traits Daily',
        '2 weeks of practice + 30 minutes documentation',
        'Practice integrating all five character traits from the book (Think Others First, Expect the Best, Respond with Courage, Think Long-term, Display Humility) into your daily leadership routine.\n\n📝 **Completion Requirement:** Document 2 weeks of daily practice, showing how you applied each character trait and the impact on your team.'),
      L(8, 'Reflection', 'Character-Based Leadership Legacy Plan',
        '45 minutes',
        'Write your personal character-based leadership philosophy and create a plan for how you want to be remembered as a leader. Focus on the character traits that will define your leadership legacy.\n\n📝 **Completion Requirement:** Write a 1-page leadership legacy statement including your character-based leadership philosophy and 5 specific behaviors you will demonstrate consistently.'),
      L(9, 'Assessment', 'Character Self-Assessment',
        '30 minutes assessment + 15 minutes planning',
        'Complete a comprehensive assessment of your leadership character traits and identify one area to improve. Use this as your baseline for character development.\n\n📝 **Completion Requirement:** Complete the assessment and write a development plan for your identified improvement area with specific actions and timeline.'),
      L(10, 'Activity', 'Hold Weekly One-on-Ones with Team Members',
        '4 weeks of meetings + 30 minutes documentation',
        'Schedule and conduct weekly one-on-one meetings with your team members using the one-on-one meeting template. Focus on their development, challenges, and how you can support them.\n\n📝 **Completion Requirement:** Complete 4 one-on-one meetings with different team members, documenting key insights and follow-up actions for each.'),
      L(11, 'Activity', 'Recognize Team Member Contributions Publicly',
        '2 weeks of practice + 20 minutes documentation',
        'Use team recognition ideas to publicly acknowledge team member contributions during shifts, team meetings, or other gatherings. Make recognition specific and meaningful.\n\n📝 **Completion Requirement:** Document 10 instances of public recognition you gave, including the specific contributions you recognized and team member reactions.'),
      L(12, 'Activity', 'Ask "How Can I Help You Succeed Today?" Daily',
        '2 weeks of practice + 25 minutes documentation',
        'Make it a daily habit to ask team members how you can help them succeed. Follow through on their requests and track the impact on team performance and morale.\n\n📝 **Completion Requirement:** Document 10 days of asking this question, including team member responses and actions you took to help them succeed.'),
      L(13, 'Activity', 'Leadership Values Exercise',
        '45 minutes',
        'Identify your top 5 leadership values (e.g., integrity, service, excellence) and write a brief statement about how each value influences your leadership approach. Then, create one specific action for each value that you will implement in your next shift.'),
      L(14, 'Reflection', 'Leadership Self-Assessment',
        '30 minutes',
        'Complete the Purdue leadership self-assessment worksheet to identify your strengths and areas for growth. Review your scores across all leadership dimensions and identify one specific leadership trait you want to develop further. Create a specific plan for how you will develop this trait over the next 30 days.'),
      L(15, 'Activity', 'Active Listening Practice',
        '1 hour (across multiple shifts)',
        'During your next three shifts, practice these active listening techniques with at least two team members per shift: 1) Maintain eye contact, 2) Ask clarifying questions, 3) Paraphrase what you heard, 4) Avoid interrupting. Record your observations and learnings in a journal.'),
      L(16, 'Activity', 'Servant Leadership in Action',
        '1-2 hours',
        'Identify one operational challenge your team is facing. Instead of directing a solution, gather input from team members who are closest to the issue. Implement their ideas and document the results. Reflect on how this approach differs from a top-down approach.'),
      L(17, 'Video', 'The Power of Vulnerability in Leadership',
        '30 minutes',
        "Watch Brené Brown's TED Talk on vulnerability and reflect on how showing appropriate vulnerability can strengthen your leadership. Write down 2-3 ways you can be more authentic with your team."),
      L(18, 'Reflection', 'Leadership Legacy Statement',
        '45 minutes',
        "Write a 1-page statement describing the impact you want to have as a leader. What do you want team members to say about your leadership when you're not in the room? How do you want to be remembered as a leader?"),
      L(19, 'Activity', 'Team Feedback Session',
        '1 hour for sessions + 30 minutes action planning',
        'Ask your team for honest feedback on how you can better serve them as a leader. Create a safe environment for honest feedback and show appreciation for their input.\n\n📝 **Completion Requirement:** Conduct feedback sessions with at least 3 team members, document their feedback, and create an action plan based on their suggestions.'),
    ],
  },
  // ---- Add more plans here as the user transcribes them. ----
].map((p) => ({ ...p, total_steps: (p.lessons || []).length }));

// Helper for components to look up a plan by key with safe fallback.
export const findPlan = (key) => DEV_PLANS.find((p) => p.key === key) || null;

const ACCENT_CLASS = {
  purple:  { tile: 'ldp-tile--purple',  badge: 'ldp-badge--purple' },
  red:     { tile: 'ldp-tile--red',     badge: 'ldp-badge--red' },
  blue:    { tile: 'ldp-tile--blue',    badge: 'ldp-badge--blue' },
  emerald: { tile: 'ldp-tile--emerald', badge: 'ldp-badge--emerald' },
  amber:   { tile: 'ldp-tile--amber',   badge: 'ldp-badge--amber' },
};

const LeadershipDevPlans = ({ user, onNavigate }) => {
  // user enrollments keyed by plan_key for fast lookup.
  const [enrollmentsByKey, setEnrollmentsByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // ConfirmDialog targets. (Manual "mark complete" was removed when the
  // plan-detail page took over completion via per-lesson check-offs.)
  const [confirmReactivate, setConfirmReactivate] = useState(null); // enrollment record
  const [confirmRemove, setConfirmRemove] = useState(null);       // enrollment record
  // Filter pills.
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'completed' | 'available'

  const refresh = useCallback(async () => {
    try {
      const res = await leadershipService.listMyDevPlans();
      const rows = res.results || res || [];
      const byKey = {};
      for (const row of rows) byKey[row.plan_key] = row;
      setEnrollmentsByKey(byKey);
      setError(null);
    } catch (err) {
      console.error('Failed to load development plans:', err);
      setError('Could not load your plans. Please refresh.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  // ----- Mutations -----

  const handleStart = async (plan) => {
    // Client-side guard for the 1-active-plan-per-user rule. Backend also
    // enforces this — this just gives a faster, friendlier error.
    const hasOtherActive = Object.values(enrollmentsByKey).some(
      (e) => e?.status === 'active' && e.plan_key !== plan.key,
    );
    if (hasOtherActive) {
      setError(
        'You already have an active development plan. Complete or remove '
        + 'it before starting another.',
      );
      return;
    }
    setError(null);
    // Optimistic: insert a placeholder enrollment so the card flips to "Active"
    // immediately. Roll back on error.
    const placeholder = {
      id: `tmp-${plan.key}`,
      plan_key: plan.key,
      status: 'active',
      current_step: 0,
      total_steps: plan.total_steps || 0,
      progress_percent: 0,
      started_at: new Date().toISOString(),
      completed_at: null,
    };
    setEnrollmentsByKey((m) => ({ ...m, [plan.key]: placeholder }));
    try {
      const created = await leadershipService.enrollInDevPlan({
        plan_key: plan.key,
        total_steps: plan.total_steps || 0,
      });
      setEnrollmentsByKey((m) => ({ ...m, [plan.key]: created }));
      // Immediately deep-link into the plan detail so the user can start
      // checking off lessons.
      onNavigate && onNavigate('dev-plan-detail', { planKey: plan.key });
    } catch (err) {
      console.error('Enroll failed:', err);
      // Backend might also reject (race on another tab) — surface a message.
      const msg = err?.data?.detail || err?.message
        || 'Could not start this plan. Please try again.';
      setError(msg);
      setEnrollmentsByKey((m) => {
        const c = { ...m };
        delete c[plan.key];
        return c;
      });
    }
  };

  const performReactivate = async () => {
    const enrollment = confirmReactivate;
    setConfirmReactivate(null);
    if (!enrollment) return;
    // Same 1-active guard as Start.
    const hasOtherActive = Object.values(enrollmentsByKey).some(
      (e) => e?.status === 'active' && e.plan_key !== enrollment.plan_key,
    );
    if (hasOtherActive) {
      setError(
        'You already have an active development plan. Complete or remove '
        + 'it before restarting this one.',
      );
      return;
    }
    setError(null);
    const prev = enrollment;
    setEnrollmentsByKey((m) => ({
      ...m,
      [enrollment.plan_key]: {
        ...enrollment,
        status: 'active',
        completed_at: null,
        current_step: 0,
        progress_percent: 0,
      },
    }));
    try {
      const updated = await leadershipService.updateDevPlan(enrollment.id, {
        status: 'active',
        current_step: 0,
      });
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: updated }));
      onNavigate && onNavigate('dev-plan-detail', { planKey: enrollment.plan_key });
    } catch (err) {
      console.error('Reactivate failed:', err);
      const msg = err?.data?.detail || err?.message
        || 'Could not restart this plan.';
      setError(msg);
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: prev }));
    }
  };

  const performRemove = async () => {
    const enrollment = confirmRemove;
    setConfirmRemove(null);
    if (!enrollment) return;
    const prev = enrollment;
    // Optimistic: drop locally.
    setEnrollmentsByKey((m) => {
      const c = { ...m };
      delete c[enrollment.plan_key];
      return c;
    });
    try {
      await leadershipService.deleteDevPlan(enrollment.id);
    } catch (err) {
      console.error('Remove enrollment failed:', err);
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: prev }));
    }
  };

  // ----- Derived counts for the filter pills -----
  const counts = useMemo(() => {
    let active = 0, completed = 0, available = 0;
    for (const plan of DEV_PLANS) {
      const enrollment = enrollmentsByKey[plan.key];
      if (!enrollment) available += 1;
      else if (enrollment.status === 'completed') completed += 1;
      else active += 1;
    }
    return { all: DEV_PLANS.length, active, completed, available };
  }, [enrollmentsByKey]);

  // Business rule (mirrored on the backend): a user can only have ONE active
  // plan at a time. Find it once so we can disable Start / Restart on every
  // other card.
  const activeEnrollmentKey = useMemo(() => {
    for (const k in enrollmentsByKey) {
      if (enrollmentsByKey[k]?.status === 'active') return k;
    }
    return null;
  }, [enrollmentsByKey]);

  const visiblePlans = useMemo(() => {
    return DEV_PLANS.filter((plan) => {
      const enrollment = enrollmentsByKey[plan.key];
      if (filter === 'all') return true;
      if (filter === 'active') return enrollment && enrollment.status === 'active';
      if (filter === 'completed') return enrollment && enrollment.status === 'completed';
      if (filter === 'available') return !enrollment;
      return true;
    });
  }, [filter, enrollmentsByKey]);

  return (
    <div className="ldp-page">
      <div className="ldp-shell">
        {/* ---- Header ---- */}
        <div className="ldp-header">
          <button
            type="button"
            className="ldp-back"
            onClick={() => onNavigate && onNavigate('leadership')}
            aria-label="Back to Leadership"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            <span>Leadership</span>
          </button>
          <div className="ldp-header-titles">
            <h1 className="ldp-title">Development Plans</h1>
            <p className="ldp-subtitle">
              Pick the plans that fit your growth path. Your active plans show
              up on your Leadership dashboard.
            </p>
          </div>
        </div>

        {/* ---- KPI strip ---- */}
        <div className="ldp-kpis">
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Active</div>
            <div className="ldp-kpi-value ldp-kpi-value--purple">{counts.active}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Completed</div>
            <div className="ldp-kpi-value ldp-kpi-value--emerald">{counts.completed}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Available</div>
            <div className="ldp-kpi-value">{counts.available}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Total Plans</div>
            <div className="ldp-kpi-value">{counts.all}</div>
          </div>
        </div>

        {/* ---- Filter pills ---- */}
        <div className="ldp-filters">
          {[
            { id: 'all',       label: `All (${counts.all})` },
            { id: 'active',    label: `Active (${counts.active})` },
            { id: 'completed', label: `Completed (${counts.completed})` },
            { id: 'available', label: `Available (${counts.available})` },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ldp-pill ${filter === p.id ? 'is-active' : ''}`}
              onClick={() => setFilter(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {error && <div className="ldp-error">{error}</div>}

        {/* ---- Plans grid ---- */}
        {loading ? (
          <div className="ldp-loading">Loading…</div>
        ) : visiblePlans.length === 0 ? (
          <div className="ldp-empty">
            {filter === 'all'
              ? 'No development plans have been added yet.'
              : `No plans in the "${filter}" category.`}
          </div>
        ) : (
          <div className="ldp-grid">
            {visiblePlans.map((plan) => {
              const enrollment = enrollmentsByKey[plan.key];
              const status = enrollment?.status || 'available';
              const progress = enrollment?.progress_percent || 0;
              const accentTile = ACCENT_CLASS[plan.accent]?.tile || '';
              const accentBadge = ACCENT_CLASS[plan.accent]?.badge || '';
              return (
                <article
                  key={plan.key}
                  className={`ldp-tile ${accentTile} ${status === 'completed' ? 'is-completed' : ''}`}
                >
                  <header className="ldp-tile-head">
                    <div className="ldp-tile-icon" aria-hidden="true">{plan.icon}</div>
                    <div className="ldp-tile-headings">
                      <h2 className="ldp-tile-name">{plan.name}</h2>
                      {plan.tagline && (
                        <p className="ldp-tile-tagline">{plan.tagline}</p>
                      )}
                    </div>
                    <span className={`ldp-tile-badge ${
                      status === 'active'    ? 'ldp-tile-badge--active' :
                      status === 'completed' ? 'ldp-tile-badge--completed' :
                                               'ldp-tile-badge--available'
                    }`}>
                      {status === 'active'    && 'Active'}
                      {status === 'completed' && 'Completed'}
                      {status === 'available' && 'Available'}
                    </span>
                  </header>

                  <p className="ldp-tile-description">{plan.description}</p>

                  <div className="ldp-tile-meta">
                    <span className={`ldp-tile-category-badge ${accentBadge}`}>
                      {plan.category}
                    </span>
                    {plan.total_steps > 0 && (
                      <span className="ldp-tile-meta-item">
                        {plan.total_steps} step{plan.total_steps === 1 ? '' : 's'}
                      </span>
                    )}
                    {plan.estimated_hours != null && (
                      <span className="ldp-tile-meta-item">
                        ~{plan.estimated_hours}h
                      </span>
                    )}
                  </div>

                  {status === 'active' && plan.total_steps > 0 && (
                    <div className="ldp-tile-progress">
                      <div className="ldp-tile-progress-track">
                        <div
                          className="ldp-tile-progress-fill"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="ldp-tile-progress-text">{progress}%</span>
                    </div>
                  )}

                  <footer className="ldp-tile-actions">
                    {status === 'available' && (() => {
                      // Block "Start" when the user already has another
                      // active plan (1-active-per-user business rule).
                      const blocked = !!activeEnrollmentKey
                        && activeEnrollmentKey !== plan.key;
                      return (
                        <button
                          type="button"
                          className={`ldp-btn ldp-btn--primary ${blocked ? 'is-disabled' : ''}`}
                          onClick={() => handleStart(plan)}
                          disabled={blocked}
                          title={blocked
                            ? 'Finish or remove your active plan first'
                            : 'Start this plan'}
                        >
                          {blocked ? 'Active plan in progress' : 'Start plan'}
                        </button>
                      );
                    })()}
                    {status === 'active' && (
                      <>
                        <button
                          type="button"
                          className="ldp-btn ldp-btn--ghost"
                          onClick={() => setConfirmRemove(enrollment)}
                        >
                          Remove
                        </button>
                        <button
                          type="button"
                          className="ldp-btn ldp-btn--primary"
                          onClick={() => onNavigate && onNavigate(
                            'dev-plan-detail', { planKey: plan.key },
                          )}
                        >
                          View plan
                        </button>
                      </>
                    )}
                    {status === 'completed' && (() => {
                      const blocked = !!activeEnrollmentKey
                        && activeEnrollmentKey !== plan.key;
                      return (
                        <>
                          <button
                            type="button"
                            className="ldp-btn ldp-btn--ghost"
                            onClick={() => setConfirmRemove(enrollment)}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className={`ldp-btn ldp-btn--secondary ${blocked ? 'is-disabled' : ''}`}
                            onClick={() => setConfirmReactivate(enrollment)}
                            disabled={blocked}
                            title={blocked
                              ? 'Finish or remove your active plan first'
                              : 'Restart this plan'}
                          >
                            Restart
                          </button>
                        </>
                      );
                    })()}
                  </footer>
                </article>
              );
            })}
          </div>
        )}

        {/* Friendly hint while the catalog is small. */}
        {DEV_PLANS.length <= 1 && (
          <div className="ldp-hint">
            <strong>More plans coming soon.</strong> Your manager is still
            adding development plans to the library.
          </div>
        )}
      </div>

      {/* ---- Confirm: restart completed plan ---- */}
      <ConfirmDialog
        isOpen={!!confirmReactivate}
        title="Restart this plan?"
        message={
          confirmReactivate
            ? `Progress on "${DEV_PLANS.find((p) => p.key === confirmReactivate.plan_key)?.name || confirmReactivate.plan_key}" will be reset to 0%.`
            : ''
        }
        confirmLabel="Restart"
        destructive
        onConfirm={performReactivate}
        onClose={() => setConfirmReactivate(null)}
      />

      {/* ---- Confirm: remove enrollment ---- */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        title="Remove this plan?"
        message={
          confirmRemove
            ? `"${DEV_PLANS.find((p) => p.key === confirmRemove.plan_key)?.name || confirmRemove.plan_key}" and any progress will be removed from your dashboard.`
            : ''
        }
        confirmLabel="Remove"
        destructive
        onConfirm={performRemove}
        onClose={() => setConfirmRemove(null)}
      />
    </div>
  );
};

export default LeadershipDevPlans;
