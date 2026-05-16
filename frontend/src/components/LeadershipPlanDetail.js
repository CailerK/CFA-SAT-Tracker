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
  // LD Growth opens every lesson by default and lets the user collapse them.
  // We track the *closed* set so the default state can be "everything open"
  // without needing to know the lesson list at construction time.
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());
  // Pending toggle keys to debounce double-clicks.
  const [pendingKeys, setPendingKeys] = useState(() => new Set());
  // Confirm "Unenroll" dialog.
  const [confirmUnenroll, setConfirmUnenroll] = useState(false);
  // True while a pause/resume request is in flight.
  const [pauseBusy, setPauseBusy] = useState(false);

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
  // True when this enrollment is paused — disables lesson toggles.
  const isPaused = enrollment?.status === 'paused';

  const handlePauseResume = async () => {
    if (!enrollment || pauseBusy) return;
    setPauseBusy(true);
    setError(null);
    const nextStatus = enrollment.status === 'paused' ? 'active' : 'paused';
    // Optimistic flip.
    const prev = enrollment;
    setEnrollment({ ...enrollment, status: nextStatus });
    try {
      const updated = await leadershipService.updateDevPlan(enrollment.id, {
        status: nextStatus,
      });
      setEnrollment(updated);
    } catch (err) {
      console.error('Pause/resume failed:', err);
      setEnrollment(prev);
      const msg = err?.data?.detail || err?.message
        || (nextStatus === 'paused'
          ? 'Could not pause this plan.'
          : 'Could not resume this plan.');
      setError(msg);
    } finally {
      setPauseBusy(false);
    }
  };

  const toggleLesson = async (lesson) => {
    if (!enrollment) return;
    // Paused plans are read-only — user must Resume first.
    if (enrollment.status === 'paused') return;
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
              {(enrollment?.deadline || enrollment?.assigned_by_name) && (
                <div className="lpd-assignment-row">
                  {enrollment?.deadline && (() => {
                    const d = new Date(enrollment.deadline + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const overdue = d < today && enrollment.status !== 'completed';
                    const label = d.toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    });
                    return (
                      <span className={`lpd-deadline-pill ${overdue ? 'is-overdue' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="18" height="18" x="3" y="4" rx="2"/>
                          <path d="M3 10h18"/>
                          <path d="M8 2v4"/>
                          <path d="M16 2v4"/>
                        </svg>
                        {overdue ? 'Overdue · ' : 'Due '} {label}
                      </span>
                    );
                  })()}
                  {enrollment?.assigned_by_name && (
                    <span className="lpd-assigned-pill">
                      Assigned by {enrollment.assigned_by_name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          {enrollment && (
            <div className="lpd-header-actions">
              <button
                type="button"
                className={`lpd-pause-btn ${isPaused ? 'is-resume' : ''}`}
                onClick={handlePauseResume}
                disabled={pauseBusy}
                title={isPaused
                  ? 'Resume this plan and continue tracking lessons'
                  : 'Pause this plan — your progress is kept'}
              >
                {isPaused ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="6 3 20 12 6 21 6 3"/>
                    </svg>
                    Resume
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16" rx="1"/>
                      <rect x="14" y="4" width="4" height="16" rx="1"/>
                    </svg>
                    Pause
                  </>
                )}
              </button>
              <button
                type="button"
                className="lpd-unenroll"
                onClick={() => setConfirmUnenroll(true)}
              >
                Unenroll
              </button>
            </div>
          )}
        </div>

        {/* ---- Paused banner ---- */}
        {isPaused && (
          <div className="lpd-paused-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
            <span>
              This plan is paused — your progress is saved. Click <strong>Resume</strong> to keep tracking lessons.
            </span>
          </div>
        )}

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
              const isExpanded = !collapsedKeys.has(lesson.key);
              const isPending = pendingKeys.has(lesson.key);
              const typeClass = TYPE_META[lesson.type]?.className || 'lpd-type--gray';
              const toggleCollapse = () => {
                setCollapsedKeys((s) => {
                  const c = new Set(s);
                  if (c.has(lesson.key)) c.delete(lesson.key);
                  else c.add(lesson.key);
                  return c;
                });
              };
              return (
                <article
                  key={lesson.key}
                  className={`lpd-lesson ${isCompleted ? 'is-completed' : ''}`}
                >
                  <button
                    type="button"
                    className="lpd-lesson-row"
                    onClick={toggleCollapse}
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
                    {/* Small chevron on the right indicates collapse state.
                        No longer used to mark complete — that lives in the
                        body now, matching LD Growth. */}
                    <svg
                      className={`lpd-row-chevron ${isExpanded ? 'is-open' : ''}`}
                      width="16" height="16" viewBox="0 0 24 24"
                      fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="lpd-lesson-body">
                      {renderMarkdown(lesson.description)}
                      <div className="lpd-lesson-actions">
                        {lesson.resourceUrl ? (
                          <a
                            className="lpd-resource-btn"
                            href={lesson.resourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                              <polyline points="15 3 21 3 21 9"/>
                              <line x1="10" x2="21" y1="14" y2="3"/>
                            </svg>
                            Open Resource
                          </a>
                        ) : (
                          /* Spacer so the Complete button stays on the right
                             once we add real URLs. Invisible & unfocusable. */
                          <span className="lpd-resource-placeholder" aria-hidden="true" />
                        )}
                        <button
                          type="button"
                          className={`lpd-complete-btn ${isCompleted ? 'is-done' : ''} ${isPending ? 'is-pending' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLesson(lesson);
                          }}
                          disabled={isPending || isPaused}
                          title={isPaused
                            ? 'Resume the plan to update lessons'
                            : isCompleted
                              ? 'Mark this lesson incomplete'
                              : 'Mark this lesson complete'}
                        >
                          {isCompleted ? (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                              Completed
                            </>
                          ) : (
                            <>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="9 12 11 14 15 10"/>
                              </svg>
                              Complete
                            </>
                          )}
                        </button>
                      </div>
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
