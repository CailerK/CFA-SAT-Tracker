import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './LeadershipPlanDetail.css';
import leadershipService from '../services/leadership';
import { ConfirmDialog } from './ui';
import { findPlan } from './LeadershipDevPlans';

// ============================================================================
// LD Growth lesson-type icon + accent map.
// Activity   → emerald target
// Reading    → blue book-open
// Reflection → amber lightbulb
// Assessment → purple clipboard-check
// Video      → red play-circle
// ============================================================================
const TYPE_META = {
  Activity:   { className: 'lpd-type--emerald' },
  Reading:    { className: 'lpd-type--blue' },
  Reflection: { className: 'lpd-type--amber' },
  Assessment: { className: 'lpd-type--purple' },
  Video:      { className: 'lpd-type--red' },
};

const TypeIcon = ({ type }) => {
  switch (type) {
    case 'Reading':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      );
    case 'Reflection':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
          <path d="M9 18h6"/>
          <path d="M10 22h4"/>
        </svg>
      );
    case 'Assessment':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
      );
    case 'Video':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8"/>
        </svg>
      );
    case 'Activity':
    default:
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      );
  }
};

// Tiny renderer for the lesson body, which uses **bold**, • bullets, and
// emoji-prefixed section headings ("📖 **Reading Focus:**"). We split on
// newlines and render bullets / paragraphs separately. Bold tokens are
// rendered with a <strong>.
const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split(/\n+/);
  const out = [];
  let bulletBuf = [];
  const flushBullets = () => {
    if (bulletBuf.length) {
      out.push(
        <ul className="lpd-md-list" key={`ul-${out.length}`}>
          {bulletBuf.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>
      );
      bulletBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('•')) {
      bulletBuf.push(line.replace(/^•\s*/, ''));
    } else {
      flushBullets();
      out.push(
        <p className="lpd-md-p" key={`p-${out.length}`}>{renderInline(line)}</p>
      );
    }
  }
  flushBullets();
  return out;
};

// Replace **bold** runs with <strong> elements.
const renderInline = (text) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
};

const LeadershipPlanDetail = ({ planKey, onNavigate }) => {
  const plan = useMemo(() => findPlan(planKey), [planKey]);

  const [enrollment, setEnrollment] = useState(null);
  // Map of lesson_key → completion record { id, completed_at, … }.
  // Using a ref-like object so we can flip completed state without re-fetching.
  const [completionsByKey, setCompletionsByKey] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which lesson card is expanded. Only one at a time, like the LD Growth UI.
  const [expandedKey, setExpandedKey] = useState(null);
  // Pending toggle keys to debounce double-clicks.
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  // Confirm "Unenroll" dialog.
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);

  // ---------------------------------------------------------------
  // Initial load: fetch my enrollments, find the matching one, then
  // pull its lesson completions. If no enrollment exists for this
  // plan, route back to the library.
  // ---------------------------------------------------------------
  const loadEnrollment = useCallback(async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const res = await leadershipService.listMyDevPlans();
      const rows = res.results || res || [];
      const match = rows.find((r) => r.plan_key === plan.key);
      if (!match) {
        setEnrollment(null);
        setCompletionsByKey({});
        setError('You are not enrolled in this plan.');
        setLoading(false);
        return;
      }
      setEnrollment(match);
      // Load this enrollment's completions.
      const compRes = await leadershipService.listLessonCompletions(match.id);
      const comps = compRes.results || compRes || [];
      const map = {};
      for (const c of comps) map[c.lesson_key] = c;
      setCompletionsByKey(map);
      setError(null);
    } catch (err) {
      console.error('Failed to load plan detail:', err);
      setError('Could not load this plan. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => { loadEnrollment(); }, [loadEnrollment]);

  // ---------------------------------------------------------------
  // Derived numbers for the header
  // ---------------------------------------------------------------
  const totalLessons = plan?.lessons?.length || 0;
  const completedCount = Object.keys(completionsByKey).length;
  const progressPct = totalLessons
    ? Math.round((completedCount / totalLessons) * 100)
    : 0;

  // ---------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------
  const toggleLesson = async (lesson) => {
    if (!enrollment) return;
    if (pendingKeys.has(lesson.key)) return;
    const existing = completionsByKey[lesson.key];

    setPendingKeys((s) => new Set(s).add(lesson.key));
    if (existing) {
      // Optimistic uncomplete.
      setCompletionsByKey((m) => {
        const c = { ...m };
        delete c[lesson.key];
        return c;
      });
      try {
        await leadershipService.uncompleteLesson(existing.id);
        // Refresh enrollment so status/current_step stay in sync.
        await loadEnrollment();
      } catch (err) {
        console.error('Uncomplete failed:', err);
        setCompletionsByKey((m) => ({ ...m, [lesson.key]: existing }));
      } finally {
        setPendingKeys((s) => {
          const c = new Set(s);
          c.delete(lesson.key);
          return c;
        });
      }
    } else {
      // Optimistic complete with a placeholder.
      const placeholder = {
        id: `tmp-${lesson.key}`,
        enrollment: enrollment.id,
        lesson_key: lesson.key,
        completed_at: new Date().toISOString(),
        notes: '',
      };
      setCompletionsByKey((m) => ({ ...m, [lesson.key]: placeholder }));
      try {
        const created = await leadershipService.completeLesson({
          enrollmentId: enrollment.id,
          lessonKey: lesson.key,
        });
        setCompletionsByKey((m) => ({ ...m, [lesson.key]: created }));
        // Refresh enrollment so auto-flip to completed propagates.
        await loadEnrollment();
      } catch (err) {
        console.error('Complete failed:', err);
        setCompletionsByKey((m) => {
          const c = { ...m };
          delete c[lesson.key];
          return c;
        });
      } finally {
        setPendingKeys((s) => {
          const c = new Set(s);
          c.delete(lesson.key);
          return c;
        });
      }
    }
  };

  const performUnenroll = async () => {
    setConfirmUnenroll(false);
    if (!enrollment) return;
    try {
      await leadershipService.deleteDevPlan(enrollment.id);
      onNavigate && onNavigate('dev-plans');
    } catch (err) {
      console.error('Unenroll failed:', err);
      setError('Could not unenroll from this plan. Please try again.');
    }
  };

  // ---------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------
  if (!plan) {
    return (
      <div className="lpd-page">
        <div className="lpd-shell">
          <div className="lpd-error">Plan not found.</div>
          <button
            type="button"
            className="lpd-back-inline"
            onClick={() => onNavigate && onNavigate('dev-plans')}
          >
            ← Back to Development Plans
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lpd-page">
      <div className="lpd-shell">
        {/* ---- Header: back arrow + title + percent + Unenroll ---- */}
        <div className="lpd-header">
          <div className="lpd-header-left">
            <button
              type="button"
              className="lpd-back-btn"
              onClick={() => onNavigate && onNavigate('dev-plans')}
              aria-label="Back to Development Plans"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
            </button>
            <div className="lpd-header-titles">
              <h1 className="lpd-title">{plan.name}</h1>
              <p className="lpd-sub">
                {progressPct}% complete · {completedCount} of {totalLessons} lesson{totalLessons === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          {enrollment && (
            <button
              type="button"
              className="lpd-unenroll"
              onClick={() => setConfirmUnenroll(true)}
            >
              Unenroll
            </button>
          )}
        </div>

        {/* ---- Purple progress bar ---- */}
        <div className="lpd-progress-track">
          <div
            className="lpd-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {error && <div className="lpd-error">{error}</div>}

        {/* ---- Lessons list ---- */}
        {loading ? (
          <div className="lpd-loading">Loading lessons…</div>
        ) : (
          <div className="lpd-lessons">
            {plan.lessons.map((lesson) => {
              const isCompleted = !!completionsByKey[lesson.key];
              const isExpanded = expandedKey === lesson.key;
              const isPending = pendingKeys.has(lesson.key);
              const typeClass = TYPE_META[lesson.type]?.className || 'lpd-type--gray';
              return (
                <article
                  key={lesson.key}
                  className={`lpd-lesson ${isCompleted ? 'is-completed' : ''}`}
                >
                  <button
                    type="button"
                    className="lpd-lesson-row"
                    onClick={() => setExpandedKey(isExpanded ? null : lesson.key)}
                    aria-expanded={isExpanded}
                  >
                    <span className={`lpd-type-icon ${typeClass}`} aria-hidden="true">
                      <TypeIcon type={lesson.type} />
                    </span>
                    <span className="lpd-lesson-titles">
                      <span className="lpd-lesson-title">{lesson.title}</span>
                      <span className="lpd-lesson-meta">
                        <span>{lesson.type}</span>
                        <span className="lpd-meta-dot">·</span>
                        <span className="lpd-meta-time">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                          {lesson.time}
                        </span>
                      </span>
                    </span>
                    {/* Checkbox lives inside the row, but stops propagation so
                        clicking the check doesn't also toggle expansion. */}
                    <span
                      role="checkbox"
                      aria-checked={isCompleted}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLesson(lesson);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleLesson(lesson);
                        }
                      }}
                      className={`lpd-check ${isCompleted ? 'is-checked' : ''} ${isPending ? 'is-pending' : ''}`}
                      title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                    >
                      {isCompleted && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="lpd-lesson-body">
                      {renderMarkdown(lesson.description)}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmUnenroll}
        title="Unenroll from this plan?"
        message={`"${plan.name}" and all your lesson progress will be removed.`}
        confirmLabel="Unenroll"
        destructive
        onConfirm={performUnenroll}
        onClose={() => setConfirmUnenroll(false)}
      />
    </div>
  );
};

export default LeadershipPlanDetail;
