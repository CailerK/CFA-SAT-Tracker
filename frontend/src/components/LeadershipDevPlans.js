import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './LeadershipDevPlans.css';
import leadershipService from '../services/leadership';
import { ConfirmDialog, FormModal, SelectField, DatePicker, UserPicker } from './ui';

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
//
// `resourceUrl` is optional — when present the detail page renders an
// "Open Resource" button inside the expanded lesson body. Leave null until
// the actual LD Growth URLs are provided.
const L = (idx, type, title, time, desc, resourceUrl = null) => ({
  key: String(idx).padStart(2, '0'),
  index: idx,
  type, // 'Activity' | 'Reading' | 'Reflection' | 'Assessment' | 'Video'
  title,
  time,
  description: desc,
  resourceUrl,
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
        'Read "The Heart of Leadership" by Mark Miller (available free at local library). This week, read the Introduction and Chapter 1 "Think Others First" (approximately 30 pages).\n\n📖 **Reading Focus:**\n• The difference between leadership capacity and character\n• Why people follow leaders because of who they are\n• What it means to put others first as a leader\n• Practical ways to demonstrate servant leadership\n\n📝 **Completion Requirement:** Write a reflection on what character-based leadership means in your restaurant role and identify 3 specific ways you can put your team first this week.',
        'https://www.amazon.com/Heart-Leadership-Becoming-People-Follow/dp/1609949641'),
      L(5, 'Reading', 'The Heart of Leadership - Week 2: "Expect the Best" + "Respond with Courage"',
        '50 minutes reading + 20 minutes planning',
        'Continue reading Chapters 2-3: "Expect the Best" and "Respond with Courage" (approximately 35 pages).\n\n📖 **Reading Focus:**\n• How your expectations affect team performance\n• The importance of believing in your team members\n• What courageous leadership looks like in daily situations\n• How to have difficult conversations with care\n\n📝 **Completion Requirement:** Identify one team member who would benefit from higher expectations and plan a courageous conversation you need to have.',
        'https://www.amazon.com/Heart-Leadership-Becoming-People-Follow/dp/1609949641'),
      L(6, 'Reading', 'The Heart of Leadership - Week 3: "Think Long-term" + "Display Humility"',
        '45 minutes reading + 25 minutes planning',
        'Complete the book with Chapters 4-5: "Think Long-term" and "Display Humility" (approximately 30 pages).\n\n📖 **Reading Focus:**\n• Balancing immediate needs with long-term development\n• How to invest in people for future success\n• The power of humility in leadership\n• Learning from mistakes and failures\n\n📝 **Completion Requirement:** Create a 90-day development plan for one team member and identify one area where you need to show more humility.',
        'https://www.amazon.com/Heart-Leadership-Becoming-People-Follow/dp/1609949641'),
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
        'Complete the Purdue leadership self-assessment worksheet to identify your strengths and areas for growth. Review your scores across all leadership dimensions and identify one specific leadership trait you want to develop further. Create a specific plan for how you will develop this trait over the next 30 days.',
        'https://www.purdue.edu/meercat/ldp/wp-content/uploads/sites/2/2018/08/LSA.pdf'),
      L(15, 'Activity', 'Active Listening Practice',
        '1 hour (across multiple shifts)',
        'During your next three shifts, practice these active listening techniques with at least two team members per shift: 1) Maintain eye contact, 2) Ask clarifying questions, 3) Paraphrase what you heard, 4) Avoid interrupting. Record your observations and learnings in a journal.'),
      L(16, 'Activity', 'Servant Leadership in Action',
        '1-2 hours',
        'Identify one operational challenge your team is facing. Instead of directing a solution, gather input from team members who are closest to the issue. Implement their ideas and document the results. Reflect on how this approach differs from a top-down approach.'),
      L(17, 'Video', 'The Power of Vulnerability in Leadership',
        '30 minutes',
        "Watch Brené Brown's TED Talk on vulnerability and reflect on how showing appropriate vulnerability can strengthen your leadership. Write down 2-3 ways you can be more authentic with your team.",
        'https://www.ted.com/talks/brene_brown_the_power_of_vulnerability'),
      L(18, 'Reflection', 'Leadership Legacy Statement',
        '45 minutes',
        "Write a 1-page statement describing the impact you want to have as a leader. What do you want team members to say about your leadership when you're not in the room? How do you want to be remembered as a leader?"),
      L(19, 'Activity', 'Team Feedback Session',
        '1 hour for sessions + 30 minutes action planning',
        'Ask your team for honest feedback on how you can better serve them as a leader. Create a safe environment for honest feedback and show appreciation for their input.\n\n📝 **Completion Requirement:** Conduct feedback sessions with at least 3 team members, document their feedback, and create an action plan based on their suggestions.'),
    ],
  },
  // ============================================================================
  // Restaurant Culture Builder — 19 lessons sourced from LD Growth.
  // Mix of Activity + Reading lessons, focused on building & reinforcing
  // a healthy restaurant culture.
  // ============================================================================
  {
    key: 'restaurant-culture-builder',
    name: 'Restaurant Culture Builder',
    tagline: 'Build a healthy, high-performing restaurant culture',
    description:
      'A practical 19-lesson plan for setting clear standards, reinforcing them daily, '
      + 'and building team unity through huddles, traditions, and recognition.',
    category: 'Culture',
    icon: '🏛️',
    accent: 'red',
    estimated_hours: null,
    lessons: [
      L(1, 'Activity', '90-Day Culture Leadership Plan',
        '1 hour',
        "Create a comprehensive 90-day culture leadership plan using the downloadable template. Include specific actions, timelines, and success metrics for strengthening your restaurant's culture.\n\n📋 Use the blank template to create your own plan\n👀 View the example to see how a completed plan looks for a Chick-fil-A restaurant"),
      L(2, 'Activity', 'Create Simple, Visual Standards for Each Station',
        '2 hours',
        'Use the free visual standards template from Google Docs to create clear, visual standards for each station in your restaurant. Make them simple, specific, and easy to understand.\n\n📝 **Completion Requirement:** Create visual standards for 5 key stations, test them with team members, and refine based on feedback.'),
      L(3, 'Activity', 'Implement Team Huddles During Shifts',
        '3 weeks of practice + 30 minutes documentation',
        'Use the free team huddle template from Google Sheets to implement regular team huddles during shifts that build connection and alignment.\n\n📝 **Completion Requirement:** Conduct 12 team huddles over 3 weeks, documenting team engagement and unity improvements.'),
      L(4, 'Activity', 'Create Culture Scorecards and Metrics',
        '1 hour setup + 2 weeks tracking',
        'Use the free culture scorecard template from Google Docs to create measurable culture metrics that help you track and reinforce your desired culture.\n\n📝 **Completion Requirement:** Create culture scorecard with 5 key metrics and track for 2 weeks, making adjustments based on results.'),
      L(5, 'Activity', 'Conduct Daily Pre-Shift Meetings with Clear Goals',
        '2 weeks of practice + 30 minutes documentation',
        'Use the free pre-shift meeting checklist (downloadable PDF) to conduct focused daily meetings that set clear expectations and goals for each shift.\n\n📝 **Completion Requirement:** Conduct 10 pre-shift meetings using the checklist, documenting team engagement and goal achievement.'),
      L(6, 'Activity', 'Create Cross-Training Opportunities',
        '3 weeks of implementation + 20 minutes documentation',
        "Use the free cross-training tracker (Excel template) to create opportunities for team members to learn different positions and build understanding of each other's roles.\n\n📝 **Completion Requirement:** Cross-train 5 team members in new positions and document how this improved team unity."),
      L(7, 'Activity', 'Implement Regular Culture Check-ins',
        '2 weeks of check-ins + 30 minutes documentation',
        'Schedule and conduct regular culture check-ins with team members to assess culture health and identify areas for improvement.\n\n📝 **Completion Requirement:** Conduct culture check-ins with 8 team members over 2 weeks, documenting insights and action items.'),
      L(8, 'Activity', 'Provide Immediate, Specific Feedback',
        '2 weeks of practice + 25 minutes documentation',
        "Practice giving immediate, specific feedback when you observe behaviors that meet or don't meet your established standards. Focus on being timely and constructive.\n\n📝 **Completion Requirement:** Document 15 feedback instances over 2 weeks, including the standard referenced and team member response."),
      L(9, 'Activity', 'Address Culture Violations Immediately',
        '2 weeks of practice + 25 minutes documentation',
        "Practice addressing behaviors that don't align with your culture values immediately and constructively, reinforcing the importance of cultural standards.\n\n📝 **Completion Requirement:** Document 5 culture violation conversations, including the approach used and outcomes achieved."),
      L(10, 'Activity', 'Develop Accountability Systems for Standards',
        '1.5 hours setup + 2 weeks tracking',
        'Create simple accountability systems that help team members self-monitor and maintain standards without constant supervision.\n\n📝 **Completion Requirement:** Implement accountability systems for 3 key areas and track compliance for 2 weeks.'),
      L(11, 'Activity', 'Train Team Leaders on Expectation Setting',
        '2 hours training + 1 week practice',
        'Watch "The 5 Levels of Leadership" by John Maxwell on YouTube and train your team leaders on how to set and maintain clear expectations with their team members.\n\n📝 **Completion Requirement:** Train 3 team leaders and have them practice expectation setting with documentation of their progress.',
        'https://www.youtube.com/results?search_query=5+levels+of+leadership+john+maxwell'),
      L(12, 'Reading', 'The Culture Map - Understanding Team Dynamics',
        '1 hour reading + 20 minutes reflection',
        'Read "The Culture Map" by Erin Meyer (available free at local library). Focus on understanding how different cultural backgrounds affect communication and teamwork in restaurants, and how to build bridges across differences.\n\n📝 **Completion Requirement:** Identify 3 cultural differences in your team and write strategies for leveraging these as strengths.',
        'https://www.amazon.com/Culture-Map-Breaking-Invisible-Boundaries/dp/1610392760'),
      L(13, 'Reading', 'Delivering Happiness - Culture Reinforcement Systems',
        '45 minutes reading + 15 minutes planning',
        'Read "Delivering Happiness" by Tony Hsieh (free PDF online). Focus on how Zappos built and reinforced their culture through systems, hiring, and daily practices.\n\n📝 **Completion Requirement:** Identify 5 culture reinforcement strategies from the book and adapt 3 for your restaurant.',
        'https://www.amazon.com/Delivering-Happiness-Profits-Passion-Purpose/dp/0446576220'),
      L(14, 'Activity', 'Celebrate Team Wins Consistently',
        '3 weeks of practice + 20 minutes documentation',
        'Implement a system for consistently celebrating both individual and team achievements. Make celebrations meaningful and aligned with your values.\n\n📝 **Completion Requirement:** Celebrate 10 team wins over 3 weeks, documenting the celebrations and team response.'),
      L(15, 'Activity', 'Establish Team Traditions and Rituals',
        '1 hour planning + 3 weeks implementation',
        'Watch "How Great Leaders Inspire Action" by Simon Sinek (TED Talk) and create meaningful team traditions that reinforce unity and shared purpose.\n\n📝 **Completion Requirement:** Establish 3 team traditions and practice them for 3 weeks, documenting team engagement.',
        'https://www.ted.com/talks/simon_sinek_how_great_leaders_inspire_action'),
      L(16, 'Activity', 'Reward Culture Champions Publicly',
        '2 weeks of practice + 20 minutes documentation',
        'Listen to "Culture by Design" episodes (free on Apple Podcasts) and implement systems to publicly recognize team members who exemplify your culture values.\n\n📝 **Completion Requirement:** Publicly recognize 8 culture champions over 2 weeks, documenting the recognition method and team response.'),
      L(17, 'Activity', 'Foster Peer-to-Peer Recognition Programs',
        '1 hour setup + 3 weeks tracking',
        "Create a system where team members can recognize and appreciate each other's contributions, building stronger relationships and team unity.\n\n📝 **Completion Requirement:** Implement peer recognition system and document 20 peer recognitions over 3 weeks."),
      L(18, 'Activity', 'Integrate Culture into Hiring and Training',
        '2 hours setup + 2 training sessions',
        'Use the free culture interview questions (downloadable PDF) to integrate culture assessment into your hiring process and culture development into training programs.\n\n📝 **Completion Requirement:** Update hiring process with culture questions and conduct 2 culture-focused training sessions, documenting improvements.'),
      L(19, 'Reading', 'The Five Dysfunctions of a Team - Building Cohesion',
        '1 hour listening + 30 minutes assessment',
        'Read "The Five Dysfunctions of a Team" by Patrick Lencioni (free audiobook on Spotify). Focus on the five dysfunctions and how to build trust, healthy conflict, commitment, accountability, and results focus.\n\n📝 **Completion Requirement:** Assess your team on each dysfunction and create action plans to address the top 2 issues.',
        'https://www.amazon.com/Five-Dysfunctions-Team-Leadership-Fable/dp/0787960756'),
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

// ============================================================================
// TeamProgressPanel — manager/admin tool listing every dev-plan enrollment
// for users strictly below the requester in the role hierarchy. Backend
// enforces the actual visibility rules (see UserDevelopmentPlanViewSet
// .team_progress); this panel is purely a presentational wrapper.
// ============================================================================
const TeamProgressPanel = ({
  rows, loading, error, query, onQueryChange, onClose, onRefresh,
}) => {
  // Build lookup of plan-key -> name so we can render readable plan titles
  // without needing the backend to denormalize them.
  const planNameByKey = useMemo(() => {
    const m = {};
    for (const p of DEV_PLANS) m[p.key] = p.name;
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = (query || '').trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = (r.user_name || '').toLowerCase();
      const plan = (planNameByKey[r.plan_key] || r.plan_key || '').toLowerCase();
      return name.includes(q) || plan.includes(q);
    });
  }, [rows, query, planNameByKey]);

  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    } catch { return ''; }
  };
  const isOverdue = (iso) => {
    if (!iso) return false;
    try {
      const d = new Date(iso);
      d.setHours(23, 59, 59, 999);
      return d.getTime() < Date.now();
    } catch { return false; }
  };

  return (
    <section className="ldp-team-panel" aria-label="Team development progress">
      <header className="ldp-team-head">
        <div>
          <h2 className="ldp-team-title">Team Progress</h2>
          <p className="ldp-team-sub">
            Plan progress for everyone below you in the org chart, scoped to
            your store.
          </p>
        </div>
        <div className="ldp-team-actions">
          <button
            type="button"
            className="ldp-team-refresh"
            onClick={onRefresh}
            disabled={loading}
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-15-6.7L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"/>
              <path d="M21 21v-5h-5"/>
            </svg>
            Refresh
          </button>
          <button
            type="button"
            className="ldp-team-close"
            onClick={onClose}
            aria-label="Close team progress panel"
          >
            ×
          </button>
        </div>
      </header>

      <div className="ldp-team-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.3-4.3"/>
        </svg>
        <input
          type="search"
          placeholder="Search by name or plan…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>

      {error ? (
        <div className="ldp-team-error">{error}</div>
      ) : loading ? (
        <div className="ldp-team-empty">Loading team progress…</div>
      ) : filtered.length === 0 ? (
        <div className="ldp-team-empty">
          {rows.length === 0
            ? 'Nobody on your team has started a development plan yet.'
            : 'No matches for that search.'}
        </div>
      ) : (
        <ul className="ldp-team-list">
          {filtered.map((row) => {
            const overdue = (
              row.status !== 'completed'
              && isOverdue(row.deadline)
            );
            return (
              <li key={row.id} className="ldp-team-row">
                <div className="ldp-team-row-main">
                  <div className="ldp-team-row-head">
                    <span className="ldp-team-row-name">
                      {row.user_name || 'Unknown user'}
                    </span>
                    <span className={`ldp-team-row-status ldp-status--${row.status}`}>
                      {row.status === 'active' && 'Active'}
                      {row.status === 'paused' && 'Paused'}
                      {row.status === 'completed' && 'Completed'}
                    </span>
                  </div>
                  <div className="ldp-team-row-plan">
                    {planNameByKey[row.plan_key] || row.plan_key}
                  </div>
                  <div className="ldp-team-row-progress">
                    <div className="ldp-team-row-progress-track">
                      <div
                        className="ldp-team-row-progress-fill"
                        style={{ width: `${row.progress_percent || 0}%` }}
                      />
                    </div>
                    <span className="ldp-team-row-progress-text">
                      {row.progress_percent || 0}%
                    </span>
                  </div>
                </div>
                <div className="ldp-team-row-meta">
                  {row.deadline && (
                    <span className={`ldp-team-row-deadline ${overdue ? 'is-overdue' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="0"/>
                        <path d="M3 10h18"/>
                      </svg>
                      {overdue ? 'Overdue · ' : 'Due '}{fmtDate(row.deadline)}
                    </span>
                  )}
                  {row.assigned_by_name && (
                    <span className="ldp-team-row-assigner">
                      Assigned by {row.assigned_by_name}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
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
  // Pause-and-switch ConfirmDialog payload — set when the user tries to
  // Start / Restart / Resume a plan while another plan is already active.
  //   { plan, action: 'start' | 'resume' | 'restart', enrollment? }
  const [confirmSwitch, setConfirmSwitch] = useState(null);
  // Filter pills.
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'paused' | 'completed' | 'available'

  // ----- Assign flow (manager+ only) -----
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTargetUserId, setAssignTargetUserId] = useState(null);
  const [assignTargetUserName, setAssignTargetUserName] = useState('');
  const [assignPlanKey, setAssignPlanKey] = useState(DEV_PLANS[0]?.key || '');
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignError, setAssignError] = useState(null);

  // ----- Team progress (manager+ only) -----
  // Toggled by the "Team Progress" button in the header. When open, we fetch
  // every dev-plan enrollment owned by a user strictly below this manager
  // in the role hierarchy (and in the same store).
  const [teamProgressOpen, setTeamProgressOpen] = useState(false);
  const [teamProgressRows, setTeamProgressRows] = useState([]);
  const [teamProgressLoading, setTeamProgressLoading] = useState(false);
  const [teamProgressError, setTeamProgressError] = useState(null);
  // Free-text filter so a director with 30 reports can find one quickly.
  const [teamProgressQuery, setTeamProgressQuery] = useState('');

  // Mirror the backend's `is_manager_or_above` rule.
  const isManagerOrAbove = !!(
    user?.isSuperuser
    || user?.isAdmin
    || (user?.role && ['manager', 'shift_lead', 'shift_leader',
                       'director', 'admin'].includes(user.role))
  );

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

  // Fetch subordinate enrollments when the panel opens. Cheap to re-fetch
  // every open since the panel is a manager tool and not the default view.
  const refreshTeamProgress = useCallback(async () => {
    setTeamProgressLoading(true);
    setTeamProgressError(null);
    try {
      const res = await leadershipService.listTeamDevPlans();
      setTeamProgressRows(res.results || res || []);
    } catch (err) {
      console.error('Failed to load team progress:', err);
      // 403 means the requester has no subordinates — treat as empty list
      // rather than an error banner.
      if (err?.status === 403) {
        setTeamProgressRows([]);
      } else {
        setTeamProgressError(
          err?.data?.detail || err?.message
          || 'Could not load team progress. Please try again.'
        );
      }
    } finally {
      setTeamProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (teamProgressOpen) refreshTeamProgress();
  }, [teamProgressOpen, refreshTeamProgress]);

  // ----- Mutations -----

  // Helper: find the user's currently-active enrollment, or null.
  const findActiveEnrollment = (excludeKey = null) => {
    for (const k in enrollmentsByKey) {
      if (k === excludeKey) continue;
      const e = enrollmentsByKey[k];
      if (e?.status === 'active') return e;
    }
    return null;
  };

  // Raw "start" — creates a new enrollment. No 1-active check here; callers
  // must clear the active slot first (or use handleStart which does it).
  const startEnrollment = async (plan) => {
    setError(null);
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
      onNavigate && onNavigate('dev-plan-detail', { planKey: plan.key });
    } catch (err) {
      console.error('Enroll failed:', err);
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

  const handleStart = (plan) => {
    // If another plan is active, ask the user if they want to pause it and
    // switch to the new plan. Otherwise just start straight away.
    const active = findActiveEnrollment(plan.key);
    if (active) {
      setConfirmSwitch({ plan, action: 'start' });
    } else {
      startEnrollment(plan);
    }
  };

  // Resume a paused enrollment back to active. If another plan is active,
  // offer to pause-and-switch (mirror of handleStart).
  const handleResume = async (enrollment) => {
    const plan = DEV_PLANS.find((p) => p.key === enrollment.plan_key);
    if (!plan) return;
    const active = findActiveEnrollment(plan.key);
    if (active) {
      setConfirmSwitch({ plan, enrollment, action: 'resume' });
      return;
    }
    await resumeEnrollment(enrollment);
  };

  // Pause an active enrollment in place. Preserves every lesson completion
  // so the user can Resume later and pick up where they left off. This is
  // what the previous "Remove on Active" button now does — destructive
  // delete is only available from the Paused or Completed states.
  const pauseEnrollment = async (enrollment) => {
    setError(null);
    const prev = enrollment;
    setEnrollmentsByKey((m) => ({
      ...m,
      [enrollment.plan_key]: { ...enrollment, status: 'paused' },
    }));
    try {
      const updated = await leadershipService.updateDevPlan(enrollment.id, {
        status: 'paused',
      });
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: updated }));
    } catch (err) {
      console.error('Pause failed:', err);
      const msg = err?.data?.detail || err?.message
        || 'Could not pause this plan.';
      setError(msg);
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: prev }));
    }
  };

  const resumeEnrollment = async (enrollment) => {
    setError(null);
    const prev = enrollment;
    setEnrollmentsByKey((m) => ({
      ...m,
      [enrollment.plan_key]: { ...enrollment, status: 'active' },
    }));
    try {
      const updated = await leadershipService.updateDevPlan(enrollment.id, {
        status: 'active',
      });
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: updated }));
      onNavigate && onNavigate('dev-plan-detail', { planKey: enrollment.plan_key });
    } catch (err) {
      console.error('Resume failed:', err);
      const msg = err?.data?.detail || err?.message
        || 'Could not resume this plan.';
      setError(msg);
      setEnrollmentsByKey((m) => ({ ...m, [enrollment.plan_key]: prev }));
    }
  };

  // Raw "restart" — flips a completed enrollment back to active with 0 steps.
  const restartEnrollment = async (enrollment) => {
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

  const performReactivate = async () => {
    const enrollment = confirmReactivate;
    setConfirmReactivate(null);
    if (!enrollment) return;
    const plan = DEV_PLANS.find((p) => p.key === enrollment.plan_key);
    // If another plan is active, offer pause-and-switch instead of blocking.
    const active = findActiveEnrollment(enrollment.plan_key);
    if (active && plan) {
      setConfirmSwitch({ plan, enrollment, action: 'restart' });
      return;
    }
    await restartEnrollment(enrollment);
  };

  // Pause the currently-active plan, then run the queued action (start /
  // resume / restart). Used by the "Pause current plan and switch?" dialog.
  const performSwitch = async () => {
    const job = confirmSwitch;
    setConfirmSwitch(null);
    if (!job) return;
    const active = findActiveEnrollment(job.plan.key);
    if (!active) {
      // Active plan disappeared while the dialog was open — just run the
      // action directly without pausing.
      if (job.action === 'start') return startEnrollment(job.plan);
      if (job.action === 'resume' && job.enrollment) return resumeEnrollment(job.enrollment);
      if (job.action === 'restart' && job.enrollment) return restartEnrollment(job.enrollment);
      return;
    }
    setError(null);
    // Optimistic: flip the current active to paused.
    const prevActive = active;
    setEnrollmentsByKey((m) => ({
      ...m,
      [active.plan_key]: { ...active, status: 'paused' },
    }));
    try {
      const paused = await leadershipService.updateDevPlan(active.id, {
        status: 'paused',
      });
      setEnrollmentsByKey((m) => ({ ...m, [active.plan_key]: paused }));
      // Now perform the queued action with the active slot freed.
      if (job.action === 'start') {
        await startEnrollment(job.plan);
      } else if (job.action === 'resume' && job.enrollment) {
        await resumeEnrollment(job.enrollment);
      } else if (job.action === 'restart' && job.enrollment) {
        await restartEnrollment(job.enrollment);
      }
    } catch (err) {
      console.error('Pause-and-switch failed:', err);
      setEnrollmentsByKey((m) => ({ ...m, [active.plan_key]: prevActive }));
      const msg = err?.data?.detail || err?.message
        || 'Could not switch plans. Please try again.';
      setError(msg);
    }
  };

  // ----- Manager-only: assign a plan to another team member -----

  const openAssignModal = () => {
    setAssignTargetUserId(null);
    setAssignTargetUserName('');
    setAssignPlanKey(DEV_PLANS[0]?.key || '');
    setAssignDeadline('');
    setAssignError(null);
    setAssignOpen(true);
  };

  const submitAssign = async () => {
    setAssignError(null);
    if (!assignTargetUserId) {
      setAssignError('Pick a team member first.');
      return;
    }
    if (!assignPlanKey) {
      setAssignError('Pick a plan.');
      return;
    }
    const plan = DEV_PLANS.find((p) => p.key === assignPlanKey);
    try {
      await leadershipService.assignDevPlanToUser({
        user_id: assignTargetUserId,
        plan_key: assignPlanKey,
        total_steps: plan?.total_steps || 0,
        deadline: assignDeadline || null,
      });
      setAssignOpen(false);
      // Toast-style status — re-use the page error banner with success copy.
      const who = assignTargetUserName || 'the team member';
      setError(null);
      // eslint-disable-next-line no-alert
      // (Skip a real toast for now — manager will see the success implicitly.)
      // We don't refresh the local list since this assignment is for someone
      // else and the manager's own list shouldn't change.
      window.alert(`Assigned "${plan?.name || assignPlanKey}" to ${who}.`);
    } catch (err) {
      console.error('Assign failed:', err);
      const msg = err?.data?.detail
        || err?.data?.user?.[0]
        || err?.message
        || 'Could not assign this plan. Please try again.';
      setAssignError(msg);
      throw err; // let FormModal stay open on failure
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
    let active = 0, paused = 0, completed = 0, available = 0;
    for (const plan of DEV_PLANS) {
      const enrollment = enrollmentsByKey[plan.key];
      if (!enrollment) available += 1;
      else if (enrollment.status === 'completed') completed += 1;
      else if (enrollment.status === 'paused') paused += 1;
      else active += 1;
    }
    return { all: DEV_PLANS.length, active, paused, completed, available };
  }, [enrollmentsByKey]);

  // Business rule (mirrored on the backend): a user can only have ONE active
  // plan at a time. Paused plans are NOT counted here.
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
      if (filter === 'paused') return enrollment && enrollment.status === 'paused';
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
          {isManagerOrAbove && (
            <div className="ldp-header-mgr-actions">
              <button
                type="button"
                className={`ldp-assign-btn ${teamProgressOpen ? 'is-active' : ''}`}
                onClick={() => setTeamProgressOpen((v) => !v)}
                title="See plan progress for everyone below you in the org"
                aria-pressed={teamProgressOpen}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Team Progress
              </button>
              <button
                type="button"
                className="ldp-assign-btn"
                onClick={openAssignModal}
                title="Assign a plan to a team member with an optional deadline"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M3 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/>
                  <line x1="19" x2="19" y1="8" y2="14"/>
                  <line x1="22" x2="16" y1="11" y2="11"/>
                </svg>
                Assign to team member
              </button>
            </div>
          )}
        </div>

        {/* ---- Team Progress panel (manager+ only) ---- */}
        {isManagerOrAbove && teamProgressOpen && (
          <TeamProgressPanel
            rows={teamProgressRows}
            loading={teamProgressLoading}
            error={teamProgressError}
            query={teamProgressQuery}
            onQueryChange={setTeamProgressQuery}
            onClose={() => setTeamProgressOpen(false)}
            onRefresh={refreshTeamProgress}
          />
        )}

        {/* ---- KPI strip ---- */}
        <div className="ldp-kpis">
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Active</div>
            <div className="ldp-kpi-value ldp-kpi-value--purple">{counts.active}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Paused</div>
            <div className="ldp-kpi-value ldp-kpi-value--amber">{counts.paused}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Completed</div>
            <div className="ldp-kpi-value ldp-kpi-value--emerald">{counts.completed}</div>
          </div>
          <div className="ldp-kpi">
            <div className="ldp-kpi-label">Available</div>
            <div className="ldp-kpi-value">{counts.available}</div>
          </div>
        </div>

        {/* ---- Filter pills ---- */}
        <div className="ldp-filters">
          {[
            { id: 'all',       label: `All (${counts.all})` },
            { id: 'active',    label: `Active (${counts.active})` },
            { id: 'paused',    label: `Paused (${counts.paused})` },
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
                      status === 'paused'    ? 'ldp-tile-badge--paused' :
                      status === 'completed' ? 'ldp-tile-badge--completed' :
                                               'ldp-tile-badge--available'
                    }`}>
                      {status === 'active'    && 'Active'}
                      {status === 'paused'    && 'Paused'}
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
                    {/* Assignment + deadline metadata, present only when the
                        current row is an enrollment that came from a manager. */}
                    {enrollment?.deadline && (() => {
                      const d = new Date(enrollment.deadline + 'T00:00:00');
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const overdue = d < today && status !== 'completed';
                      const label = d.toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                      });
                      return (
                        <span
                          className={`ldp-deadline-pill ${overdue ? 'is-overdue' : ''}`}
                          title={overdue ? 'Overdue' : 'Deadline'}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2"/>
                            <path d="M3 10h18"/>
                            <path d="M8 2v4"/>
                            <path d="M16 2v4"/>
                          </svg>
                          Due {label}
                        </span>
                      );
                    })()}
                    {enrollment?.assigned_by_name && (
                      <span className="ldp-assigned-pill" title="Assigned by your manager">
                        Assigned by {enrollment.assigned_by_name}
                      </span>
                    )}
                  </div>

                  {(status === 'active' || status === 'paused') && plan.total_steps > 0 && (
                    <div className="ldp-tile-progress">
                      <div className="ldp-tile-progress-track">
                        <div
                          className={`ldp-tile-progress-fill ${status === 'paused' ? 'is-paused' : ''}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="ldp-tile-progress-text">{progress}%</span>
                    </div>
                  )}

                  <footer className="ldp-tile-actions">
                    {status === 'available' && (() => {
                      // If another plan is already active, the click will
                      // prompt the user to pause-and-switch (handleStart
                      // shows a ConfirmDialog instead of starting straight away).
                      const willSwitch = !!activeEnrollmentKey
                        && activeEnrollmentKey !== plan.key;
                      return (
                        <button
                          type="button"
                          className="ldp-btn ldp-btn--primary"
                          onClick={() => handleStart(plan)}
                          title={willSwitch
                            ? 'Pause your active plan and switch to this one'
                            : 'Start this plan'}
                        >
                          {willSwitch ? 'Pause & switch' : 'Start plan'}
                        </button>
                      );
                    })()}
                    {status === 'active' && (
                      <>
                        <button
                          type="button"
                          className="ldp-btn ldp-btn--ghost"
                          onClick={() => pauseEnrollment(enrollment)}
                          title="Pause this plan — your progress is kept so you can resume later"
                        >
                          Pause
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
                    {status === 'paused' && (() => {
                      const willSwitch = !!activeEnrollmentKey
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
                            className="ldp-btn ldp-btn--primary"
                            onClick={() => handleResume(enrollment)}
                            title={willSwitch
                              ? 'Pause your active plan and resume this one'
                              : 'Resume this plan'}
                          >
                            {willSwitch ? 'Pause & resume' : 'Resume'}
                          </button>
                        </>
                      );
                    })()}
                    {status === 'completed' && (() => {
                      const willSwitch = !!activeEnrollmentKey
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
                            className="ldp-btn ldp-btn--secondary"
                            onClick={() => setConfirmReactivate(enrollment)}
                            title={willSwitch
                              ? 'Pause your active plan and restart this one'
                              : 'Restart this plan'}
                          >
                            {willSwitch ? 'Pause & restart' : 'Restart'}
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

      {/* ---- Assign plan to a team member (manager+ only) ---- */}
      <FormModal
        isOpen={assignOpen}
        title="Assign a development plan"
        submitLabel="Assign plan"
        onClose={() => setAssignOpen(false)}
        onSubmit={submitAssign}
      >
        <p className="ldp-assign-help">
          Pick a team member, choose a plan, and optionally set a deadline.
          The plan will appear on their Leadership dashboard immediately.
        </p>
        <UserPicker
          label="Team member"
          value={assignTargetUserId}
          onChange={(id, u) => {
            setAssignTargetUserId(id);
            setAssignTargetUserName(u?.name || u?.email || '');
          }}
          placeholder="Search by name or email…"
          required
        />
        <SelectField
          label="Plan"
          value={assignPlanKey}
          onChange={setAssignPlanKey}
          options={DEV_PLANS.map((p) => ({ value: p.key, label: p.name }))}
          required
        />
        <DatePicker
          label="Deadline (optional)"
          value={assignDeadline}
          onChange={setAssignDeadline}
          help="Leave blank for no deadline."
        />
        {assignError && (
          <div className="ldp-error" style={{ marginTop: 8 }}>{assignError}</div>
        )}
      </FormModal>

      {/* ---- Confirm: pause-and-switch ---- */}
      <ConfirmDialog
        isOpen={!!confirmSwitch}
        title="Pause your active plan and switch?"
        message={(() => {
          if (!confirmSwitch) return '';
          const active = findActiveEnrollment(confirmSwitch.plan.key);
          const activeName = active
            ? (DEV_PLANS.find((p) => p.key === active.plan_key)?.name || active.plan_key)
            : 'your active plan';
          const verb = confirmSwitch.action === 'start' ? 'start'
                     : confirmSwitch.action === 'resume' ? 'resume'
                     : 'restart';
          return `"${activeName}" will be paused (progress kept) so you can ${verb} "${confirmSwitch.plan.name}". You can come back to it any time.`;
        })()}
        confirmLabel={
          confirmSwitch?.action === 'start' ? 'Pause & start'
          : confirmSwitch?.action === 'resume' ? 'Pause & resume'
          : 'Pause & restart'
        }
        onConfirm={performSwitch}
        onClose={() => setConfirmSwitch(null)}
      />

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
            ? `"${DEV_PLANS.find((p) => p.key === confirmRemove.plan_key)?.name || confirmRemove.plan_key}" will be removed and ALL of your lesson progress will be permanently deleted. If you just want to free up your active slot, use Pause instead.`
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
