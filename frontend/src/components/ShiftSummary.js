import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import './SetupSheetTemplates.css'; // reuse banner + tabs
import './ShiftSummary.css';
import shiftSummaryService from '../services/shiftSummary';

// ===== Icons =====
const IconLayoutDashboard = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1"/>
    <rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/>
    <rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);
const IconPlus = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);
const IconCalendar = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
  </svg>
);
const IconFileText = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>
  </svg>
);
const IconHistory = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);
const IconClipboardList = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </svg>
);
const IconStar = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconChevronDown = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);
const IconEye = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);
const IconBadgeCheck = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
const IconTrendingUp = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
  </svg>
);
const IconMessageWarning = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M12 7v2"/><path d="M12 13h.01"/>
  </svg>
);
const IconAlertTriangle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
    <path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const getDateInputValue = () => new Date().toISOString().slice(0, 10);

// Note: WIN_OPTIONS / CHALLENGE_OPTIONS used to be hardcoded here. They're
// now loaded from /api/shift-summaries/tags/ so admins can edit them.
const SHIFT_TYPES = ['Opening', 'Mid', 'Closing'];
const SHIFT_STATUSES = ['Normal', 'Busy', 'Slow', 'Incident'];

// Convert UI labels to the backend's lowercase enum values.
const toBackendShiftType = (label) => (label || '').toLowerCase();
const toUiShiftType = (val) =>
  ({ opening: 'Opening', mid: 'Mid', closing: 'Closing' }[val] || 'Closing');
const toBackendShiftStatus = (label) => (label || '').toLowerCase();
const toUiShiftStatus = (val) =>
  ({ normal: 'Normal', busy: 'Busy', slow: 'Slow', incident: 'Incident' }[val] || 'Normal');

const toneForStatus = (status) => {
  switch (status) {
    case 'Busy': return 'Busy shift with strong volume';
    case 'Slow': return 'Slow shift with opportunities to coach';
    case 'Incident': return 'Incident on the shift that needs follow-up';
    default: return 'Normal shift with a few watch items';
  }
};

const ShiftSummary = ({ onNavigate, user }) => {
  const [activeTab] = useState('summary');
  const [shiftLead, setShiftLead] = useState(user?.firstName ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 'demo User');
  const [shiftDate, setShiftDate] = useState(getDateInputValue());
  const [shiftType, setShiftType] = useState('Closing');
  const [shiftStatus, setShiftStatus] = useState('Normal');
  const [rating, setRating] = useState(4);
  const [hoveredRating, setHoveredRating] = useState(0);
  // wins/challenges are now Set<Number> of ShiftTag IDs (was Set<String>).
  const [wins, setWins] = useState(new Set());
  const [challenges, setChallenges] = useState(new Set());
  const [recap, setRecap] = useState('');
  const [salesNote, setSalesNote] = useState('');
  const [laborPercent, setLaborPercent] = useState('');
  const [sosNote, setSosNote] = useState('');
  const [handoffNote, setHandoffNote] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Tag catalog loaded from the backend.
  const [winTags, setWinTags] = useState([]);             // [{id, label, ...}]
  const [challengeTags, setChallengeTags] = useState([]); // [{id, label, ...}]
  const [draftId, setDraftId] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);     // 'saving'|'saved'|'error'|null
  const [isLoading, setIsLoading] = useState(true);
  const autosaveTimer = useRef(null);

  // ---------- Initial load: tags + any existing draft ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tags, draft] = await Promise.all([
          shiftSummaryService.listTags(),
          shiftSummaryService.getDraftToday(),
        ]);
        if (cancelled) return;
        const tagsArray = tags.results || tags || [];
        setWinTags(tagsArray.filter(t => t.kind === 'win'));
        setChallengeTags(tagsArray.filter(t => t.kind === 'challenge'));
        if (draft && draft.id) {
          setDraftId(draft.id);
          setShiftDate(draft.shift_date);
          setShiftType(toUiShiftType(draft.shift_type));
          setShiftStatus(toUiShiftStatus(draft.shift_status));
          setRating(draft.rating || 4);
          setRecap(draft.recap || '');
          setSalesNote(draft.sales_note || '');
          setLaborPercent(draft.labor_percent || '');
          setSosNote(draft.sos_note || '');
          setHandoffNote(draft.handoff_note || '');
          setNeedsFollowUp(Boolean(draft.needs_follow_up));
          const tagIds = (draft.tags || []).map(t => t.id);
          setWins(new Set(tagsArray
            .filter(t => t.kind === 'win' && tagIds.includes(t.id))
            .map(t => t.id)));
          setChallenges(new Set(tagsArray
            .filter(t => t.kind === 'challenge' && tagIds.includes(t.id))
            .map(t => t.id)));
        }
      } catch (err) {
        console.error('Failed to load shift summary state:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Debounced autosave to /draft/today/ ----------
  const buildPayload = useCallback(() => ({
    shift_date: shiftDate,
    shift_type: toBackendShiftType(shiftType),
    shift_status: toBackendShiftStatus(shiftStatus),
    rating: rating || 0,
    recap, sales_note: salesNote,
    labor_percent: laborPercent ? Number(laborPercent) : null,
    sos_note: sosNote, handoff_note: handoffNote,
    needs_follow_up: needsFollowUp,
    tag_ids: [...wins, ...challenges],
  }), [shiftDate, shiftType, shiftStatus, rating, recap, salesNote,
       laborPercent, sosNote, handoffNote, needsFollowUp, wins, challenges]);

  useEffect(() => {
    if (isLoading) return; // don't autosave before first load completes
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const saved = await shiftSummaryService.saveDraft(buildPayload());
        if (saved && saved.id) setDraftId(saved.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 1500);
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 800);
    return () => autosaveTimer.current && clearTimeout(autosaveTimer.current);
  }, [buildPayload, isLoading]);

  const tabs = [
    { id: 'templates', label: 'Templates', Icon: IconLayoutDashboard },
    { id: 'new', label: 'New', Icon: IconPlus },
    { id: 'saved', label: 'Saved', Icon: IconCalendar },
    { id: 'summary', label: 'Summary', Icon: IconFileText },
    { id: 'history', label: 'History', Icon: IconHistory },
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'templates') onNavigate && onNavigate('setup-sheet-templates');
    else if (tabId === 'new') onNavigate && onNavigate('setup-sheet-builder');
    else if (tabId === 'saved') onNavigate && onNavigate('saved-setups');
    else if (tabId === 'history') onNavigate && onNavigate('shift-summary-history');
  };

  const toggleSetItem = (setter, current) => (item) => {
    const next = new Set(current);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setter(next);
  };
  const toggleWin = toggleSetItem(setWins, wins);
  const toggleChallenge = toggleSetItem(setChallenges, challenges);

  const clearForm = async () => {
    setShiftLead('');
    setShiftDate(getDateInputValue());
    setShiftType('Closing');
    setShiftStatus('Normal');
    setRating(0);
    setWins(new Set());
    setChallenges(new Set());
    setRecap('');
    setSalesNote('');
    setLaborPercent('');
    setSosNote('');
    setHandoffNote('');
    setNeedsFollowUp(false);
    // Also discard the server-side draft so we start fresh on next visit.
    try { await shiftSummaryService.discardDraft(); }
    catch (err) { console.warn('Discard draft failed:', err); }
    setDraftId(null);
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      // Cancel any pending autosave so we don't race with the submit.
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      await shiftSummaryService.submit(buildPayload());
      setSaveStatus('saved');
      setDraftId(null);
      setTimeout(() => setSaveStatus(null), 2000);
      // Optional: navigate to history so the user sees their submission.
      if (onNavigate) onNavigate('shift-summary-history');
    } catch (err) {
      console.error('Submit failed:', err);
      setSaveStatus('error');
    }
  };

  const tone = useMemo(() => toneForStatus(shiftStatus), [shiftStatus]);

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((n) => {
      const active = n <= (hoveredRating || rating);
      return (
        <button
          key={n}
          type="button"
          className="ss-star-btn"
          onClick={() => setRating(n)}
          onMouseEnter={() => setHoveredRating(n)}
          onMouseLeave={() => setHoveredRating(0)}
          aria-label={`Rate ${n} of 5`}
        >
          <IconStar
            className="ss-star-icon"
            style={{
              fill: active ? '#facc15' : '#e5e7eb',
              color: active ? '#facc15' : '#e5e7eb',
            }}
          />
        </button>
      );
    });
  };

  return (
    <div className="sst-page">
      <div className="sst-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ssum-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ssum-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">☀️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo User'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <p className="sst-banner-subtitle">Capture how the shift felt, what mattered, and what the next team should know</p>
            </div>
          </div>
        </div>

        {/* Sub-nav */}
        <nav className="sst-tabs">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`sst-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => handleTabClick(id)}
            >
              <Icon className="sst-tab-icon" />
              <span className="sst-tab-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* History callout */}
        <div className="ssum-history-card">
          <div className="ssum-history-text">
            <div className="ssum-history-header">
              <span className="ssum-history-pill">History enabled</span>
              <span className="ssum-history-subtitle">Each saved summary is stored for weekly review</span>
            </div>
            <p className="ssum-history-description">
              Save the shift, then use history to look back across the week, spot patterns, and review follow-up items.
            </p>
          </div>
          <button
            type="button"
            className="ssum-history-btn"
            onClick={() => onNavigate && onNavigate('shift-summary-history')}
          >
            View History
          </button>
        </div>

        {/* Two-column grid */}
        <div className="ssum-grid">
          {/* LEFT: Form */}
          <section className="ssum-card">
            <div className="ssum-card-head">
              <h3 className="ssum-card-title">
                <IconClipboardList className="ssum-card-title-icon" />
                Shift Summary
              </h3>
              <p className="ssum-card-desc">
                A lightweight end-of-shift form with structure for ratings, wins, challenges, sales, labor, speed of service, and handoff notes.
              </p>
            </div>

            <div className="ssum-card-body">
              {/* Shift lead + date */}
              <div className="ssum-row-2">
                <div className="ssum-field">
                  <label htmlFor="shiftLead" className="ssum-label">Shift lead</label>
                  <input
                    id="shiftLead"
                    className="ssum-input"
                    placeholder="Who ran the shift?"
                    value={shiftLead}
                    onChange={(e) => setShiftLead(e.target.value)}
                  />
                </div>
                <div className="ssum-field">
                  <label htmlFor="shiftDate" className="ssum-label">Shift date</label>
                  <input
                    id="shiftDate"
                    type="date"
                    className="ssum-input"
                    value={shiftDate}
                    onChange={(e) => setShiftDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Shift type + status */}
              <div className="ssum-row-2">
                <div className="ssum-field">
                  <label className="ssum-label">Shift type</label>
                  <div className="ssum-select-wrap">
                    <select className="ssum-select" value={shiftType} onChange={(e) => setShiftType(e.target.value)}>
                      {SHIFT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <IconChevronDown className="ssum-select-chevron" />
                  </div>
                </div>
                <div className="ssum-field">
                  <label className="ssum-label">Overall shift status</label>
                  <div className="ssum-select-wrap">
                    <select className="ssum-select" value={shiftStatus} onChange={(e) => setShiftStatus(e.target.value)}>
                      {SHIFT_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <IconChevronDown className="ssum-select-chevron" />
                  </div>
                </div>
              </div>

              {/* Rate the shift */}
              <div className="ssum-field">
                <label className="ssum-label">Rate the shift</label>
                <div className="ssum-rate-box">
                  <div className="ssum-stars">{renderStars()}</div>
                  <span className="ssum-rate-label">{rating}/5</span>
                </div>
              </div>

              {/* What went well */}
              <div className="ssum-field">
                <label className="ssum-label">What went well?</label>
                <div className="ssum-chip-group">
                  {winTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={wins.has(tag.id)}
                      className={`ssum-chip ssum-chip-good ${wins.has(tag.id) ? 'active' : ''}`}
                      onClick={() => toggleWin(tag.id)}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Challenges */}
              <div className="ssum-field">
                <label className="ssum-label">What challenged the shift?</label>
                <div className="ssum-chip-group">
                  {challengeTags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={challenges.has(tag.id)}
                      className={`ssum-chip ssum-chip-warn ${challenges.has(tag.id) ? 'active' : ''}`}
                      onClick={() => toggleChallenge(tag.id)}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recap */}
              <div className="ssum-field">
                <label htmlFor="recap" className="ssum-label">Shift recap</label>
                <textarea
                  id="recap"
                  className="ssum-textarea"
                  placeholder="How did the shift run overall?"
                  value={recap}
                  onChange={(e) => setRecap(e.target.value)}
                />
              </div>

              {/* Sales note */}
              <div className="ssum-field">
                <label htmlFor="salesNote" className="ssum-label">Sales note</label>
                <textarea
                  id="salesNote"
                  className="ssum-textarea"
                  placeholder="Talk about sales pace, wins, misses, or category notes"
                  value={salesNote}
                  onChange={(e) => setSalesNote(e.target.value)}
                />
              </div>

              {/* Labor + SOS */}
              <div className="ssum-row-2">
                <div className="ssum-field">
                  <label htmlFor="laborPercent" className="ssum-label">Labor %</label>
                  <input
                    id="laborPercent"
                    className="ssum-input"
                    inputMode="decimal"
                    placeholder="Enter labor percentage"
                    value={laborPercent}
                    onChange={(e) => setLaborPercent(e.target.value)}
                  />
                </div>
                <div className="ssum-field">
                  <label htmlFor="sosNote" className="ssum-label">Speed of Service</label>
                  <textarea
                    id="sosNote"
                    className="ssum-textarea"
                    placeholder="How did speed of service run this shift?"
                    value={sosNote}
                    onChange={(e) => setSosNote(e.target.value)}
                  />
                </div>
              </div>

              {/* Handoff note */}
              <div className="ssum-field">
                <label htmlFor="handoffNote" className="ssum-label">Handoff note</label>
                <textarea
                  id="handoffNote"
                  className="ssum-textarea"
                  placeholder="What should the next shift know?"
                  value={handoffNote}
                  onChange={(e) => setHandoffNote(e.target.value)}
                />
              </div>

              {/* Follow-up toggle */}
              <div className="ssum-toggle-row">
                <div>
                  <p className="ssum-toggle-title">Needs manager follow-up</p>
                  <p className="ssum-toggle-desc">Flag shift summaries that should turn into action items.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={needsFollowUp}
                  className={`ssum-switch ${needsFollowUp ? 'checked' : ''}`}
                  onClick={() => setNeedsFollowUp((v) => !v)}
                >
                  <span className="ssum-switch-thumb"></span>
                </button>
              </div>

              {/* Actions */}
              <div className="ssum-actions">
                <button type="button" className="ssum-btn ssum-btn-secondary" onClick={clearForm}>
                  Clear form
                </button>
                <button
                  type="button"
                  className="ssum-btn ssum-btn-primary"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveStatus === 'saving' ? 'Saving…'
                    : saveStatus === 'saved' ? 'Saved ✓'
                    : saveStatus === 'error' ? 'Try again'
                    : 'Save shift summary'}
                </button>
              </div>
              {saveStatus && (
                <p
                  className="ssum-save-hint"
                  style={{ marginTop: 8, fontSize: 13, color: saveStatus === 'error' ? '#dc2626' : '#16a34a' }}
                >
                  {saveStatus === 'saving' && 'Saving draft…'}
                  {saveStatus === 'saved' && 'Saved'}
                  {saveStatus === 'error' && 'Could not save — try again.'}
                </p>
              )}
            </div>
          </section>

          {/* RIGHT: Live preview + Why this helps */}
          <aside className="ssum-side">
            {/* Mobile toggle for preview */}
            <button
              type="button"
              className="ssum-preview-toggle"
              onClick={() => setPreviewOpen((v) => !v)}
              aria-expanded={previewOpen}
            >
              <span className="ssum-preview-toggle-label">
                <IconEye className="ssum-preview-toggle-icon" />
                Live preview
              </span>
              <IconChevronDown className={`ssum-preview-toggle-chev ${previewOpen ? 'open' : ''}`} />
            </button>

            <section className={`ssum-card ssum-side-card ${previewOpen ? 'mobile-open' : ''}`}>
              <div className="ssum-card-head">
                <h3 className="ssum-card-title">
                  <IconFileText className="ssum-card-title-icon" />
                  Live preview
                </h3>
                <p className="ssum-card-desc">
                  Review the handoff before saving so you can tighten anything that feels unclear.
                </p>
              </div>
              <div className="ssum-card-body">
                <div className="ssum-preview-badges">
                  <span className="ssum-badge">{shiftType.toLowerCase()}</span>
                  <span className="ssum-badge">{shiftDate}</span>
                  <span className="ssum-badge">{rating}/5 rating</span>
                </div>

                <div className="ssum-preview-box">
                  <div>
                    <p className="ssum-preview-k">Shift lead</p>
                    <p className="ssum-preview-v">{shiftLead || '—'}</p>
                  </div>
                  <div>
                    <p className="ssum-preview-k">Tone</p>
                    <p className="ssum-preview-v-medium">{tone}</p>
                  </div>
                  <div>
                    <p className="ssum-preview-k">Recap</p>
                    <p className="ssum-preview-text">{recap.trim() || 'No recap added yet.'}</p>
                  </div>
                </div>

                <div className="ssum-preview-grid">
                  <div>
                    <p className="ssum-preview-h">Wins</p>
                    <div className="ssum-preview-tags">
                      {wins.size === 0 ? (
                        <span className="ssum-preview-muted">No wins selected yet.</span>
                      ) : (
                        Array.from(wins).map((w) => (
                          <span key={w} className="ssum-tag ssum-tag-good">{w}</span>
                        ))
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="ssum-preview-h">Challenges</p>
                    <div className="ssum-preview-tags">
                      {challenges.size === 0 ? (
                        <span className="ssum-preview-muted">No challenges selected yet.</span>
                      ) : (
                        Array.from(challenges).map((c) => (
                          <span key={c} className="ssum-tag ssum-tag-warn">{c}</span>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="ssum-preview-2col">
                    <div>
                      <p className="ssum-preview-h">Sales note</p>
                      <p className="ssum-preview-text">{salesNote.trim() || 'No sales note added yet.'}</p>
                    </div>
                    <div>
                      <p className="ssum-preview-h">Labor %</p>
                      <p className="ssum-preview-text">{laborPercent.trim() || 'No labor percentage added yet.'}</p>
                    </div>
                    <div>
                      <p className="ssum-preview-h">Speed of Service</p>
                      <p className="ssum-preview-text">{sosNote.trim() || 'No speed of service note added yet.'}</p>
                    </div>
                    <div>
                      <p className="ssum-preview-h">Handoff note</p>
                      <p className="ssum-preview-text">{handoffNote.trim() || 'No handoff note added yet.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Why this helps */}
            <section className="ssum-card ssum-side-card ssum-why-card">
              <div className="ssum-card-head">
                <h3 className="ssum-why-title">Why this workflow helps</h3>
              </div>
              <div className="ssum-card-body ssum-why-body">
                <div className="ssum-why-item">
                  <IconBadgeCheck className="ssum-why-icon ssum-why-icon-green" />
                  <div>
                    <p className="ssum-why-h">Fast enough to use</p>
                    <p className="ssum-why-p">Quick tags and short notes keep it lightweight for end-of-shift use.</p>
                  </div>
                </div>
                <div className="ssum-why-item">
                  <IconTrendingUp className="ssum-why-icon ssum-why-icon-blue" />
                  <div>
                    <p className="ssum-why-h">Structured for trends later</p>
                    <p className="ssum-why-p">Wins, challenges, ratings, and follow-up flags can become reporting filters later.</p>
                  </div>
                </div>
                <div className="ssum-why-item">
                  <IconMessageWarning className="ssum-why-icon ssum-why-icon-amber" />
                  <div>
                    <p className="ssum-why-h">Better shift handoff</p>
                    <p className="ssum-why-p">Sales, labor, speed of service, and handoff notes give the next leader a cleaner read on the day.</p>
                  </div>
                </div>
                <div className="ssum-why-item">
                  <IconAlertTriangle className="ssum-why-icon ssum-why-icon-red" />
                  <div>
                    <p className="ssum-why-h">Follow-up items stay visible</p>
                    <p className="ssum-why-p">History makes it easier to revisit challenging shifts and keep leadership action items from getting lost.</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ShiftSummary;
