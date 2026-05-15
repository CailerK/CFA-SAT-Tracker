import React, { useState, useEffect, useCallback, useMemo } from 'react';
import surveysService from '../services/surveys';
import './TeamSurveys.css';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal,
  TextField, SelectField, DatePicker, Toggle,
} from './ui';

// ===== Icons =====
const IconMessageSquare = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>);
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconCalendar = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>);
const IconUsers = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>);
const IconPlus = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);
const IconSettings = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);

const STORE_NUMBER = '00727';

const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'active',   label: 'Active' },
  { id: 'closed',   label: 'Closed' },
  { id: 'drafts',   label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
];

// Question kinds the backend accepts on create.
const QUESTION_KIND_OPTIONS = [
  { value: 'text', label: 'Free text' },
  { value: 'rating', label: 'Rating (1–5)' },
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'multiple_choice', label: 'Multiple choice' },
];

// Default close date 14 days from now (YYYY-MM-DD).
const defaultClosesAt = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

const TeamSurveys = ({ onNavigate, user }) => {
  const canManage = isManagerOrAbove(user);
  const [activeView, setActiveView] = useState('all-surveys');
  const [activeFilter, setActiveFilter] = useState('all');
  const [STATS, setSTATS] = useState({ visible: 0, active: 0, responses: 0, avgRate: 0 });
  const [surveys, setSurveys] = useState([]);
  const [TOTAL_SURVEYS, setTOTAL_SURVEYS] = useState(0);

  // ---- Modal state ----
  // surveyModal: full create-survey form state (advanced mode allows multiple
  // questions). Quick mode pre-fills with 1 'text' question.
  const [surveyModal, setSurveyModal] = useState(null);
  const [surveyError, setSurveyError] = useState('');
  // extendModal: { id, title, closes_at } | null — PATCH closes_at flow.
  const [extendModal, setExtendModal] = useState(null);
  const [extendError, setExtendError] = useState('');
  // deleteSurvey: full survey row — ConfirmDialog opens when set.
  const [deleteSurvey, setDeleteSurvey] = useState(null);
  // sentinel: { title, message } | null — "coming soon" placeholders for
  // Take / Results flows that are deferred to a later phase.
  const [sentinel, setSentinel] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const apiStatus = activeFilter === 'active' ? 'active'
        : activeFilter === 'closed' ? 'closed'
        : activeFilter === 'drafts' ? 'draft'
        : activeFilter === 'archived' ? 'archived'
        : undefined;
      const [list, statsData] = await Promise.all([
        surveysService.list({ status: apiStatus }),
        surveysService.stats().catch(() => null),
      ]);
      const rows = list.results || list || [];
      setSurveys(rows);
      setTOTAL_SURVEYS(list.count || rows.length);
      if (statsData) {
        setSTATS({
          visible: statsData.visible || rows.length,
          active: statsData.active || rows.filter(r => r.status === 'active').length,
          responses: statsData.responses || 0,
          avgRate: statsData.avg_rate || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load surveys:', err);
    }
  }, [activeFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleBackHome = () => onNavigate && onNavigate('dashboard');

  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Open Create Survey FormModal ----
  const openCreateSurvey = (mode) => {
    if (!canManage) return;
    setSurveyError('');
    setSurveyModal({
      mode, // 'quick' | 'advanced'
      title: '',
      closes_at: defaultClosesAt(),
      is_anonymous: true,
      questions: [
        { text: '', kind: mode === 'advanced' ? 'rating' : 'text', required: true },
      ],
    });
  };

  // ---- Add / remove question rows (advanced mode only) ----
  const addQuestion = () => {
    setSurveyModal((m) => m && ({
      ...m,
      questions: [...m.questions, { text: '', kind: 'text', required: true }],
    }));
  };
  const removeQuestion = (idx) => {
    setSurveyModal((m) => m && ({
      ...m,
      questions: m.questions.filter((_, i) => i !== idx),
    }));
  };
  const updateQuestion = (idx, patch) => {
    setSurveyModal((m) => m && ({
      ...m,
      questions: m.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    }));
  };

  const submitSurvey = async () => {
    if (!surveyModal) return;
    const { title, closes_at, is_anonymous, questions } = surveyModal;
    if (!title.trim()) {
      setSurveyError('Survey title is required.');
      throw new Error('Missing title');
    }
    const cleanQuestions = (questions || [])
      .map((q) => ({
        text: (q.text || '').trim(),
        kind: q.kind || 'text',
        required: !!q.required,
        options: q.options || [],
      }))
      .filter((q) => q.text);
    if (cleanQuestions.length === 0) {
      setSurveyError('Add at least one question with text.');
      throw new Error('Missing questions');
    }
    if (!closes_at) {
      setSurveyError('Pick a close date.');
      throw new Error('Missing close date');
    }
    try {
      await surveysService.create({
        title: title.trim(),
        status: 'active',
        opens_at: new Date().toISOString(),
        closes_at: `${closes_at}T23:59:00`,
        is_anonymous: !!is_anonymous,
        questions: cleanQuestions,
      });
      setSurveyModal(null);
      await refresh();
    } catch (err) {
      setSurveyError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Per-card actions: Extend / Close / Archive / Delete ----
  const openExtend = (survey) => {
    if (!canManage) return;
    setExtendError('');
    // Pre-fill with current closes_at (or 14 days from today as fallback).
    const currentClose = survey.closes_at
      ? new Date(survey.closes_at).toISOString().slice(0, 10)
      : defaultClosesAt();
    setExtendModal({ id: survey.id, title: survey.title, closes_at: currentClose });
  };

  const submitExtend = async () => {
    if (!extendModal) return;
    const { id, closes_at } = extendModal;
    if (!closes_at) {
      setExtendError('Pick a new close date.');
      throw new Error('Missing close date');
    }
    try {
      await surveysService.update(id, {
        closes_at: `${closes_at}T23:59:00`,
        // Re-open if it was already closed.
        status: 'active',
      });
      setExtendModal(null);
      await refresh();
    } catch (err) {
      setExtendError(buildErrorDetail(err));
      throw err;
    }
  };

  const closeSurvey = async (survey) => {
    if (!canManage) return;
    try {
      await surveysService.update(survey.id, { status: 'closed' });
      await refresh();
    } catch (err) {
      console.error('Failed to close survey:', err);
    }
  };

  const archiveSurvey = async (survey) => {
    if (!canManage) return;
    try {
      await surveysService.update(survey.id, { status: 'archived' });
      await refresh();
    } catch (err) {
      console.error('Failed to archive survey:', err);
    }
  };

  const performDeleteSurvey = async () => {
    if (!deleteSurvey) return;
    try {
      await surveysService.remove(deleteSurvey.id);
      setDeleteSurvey(null);
      await refresh();
    } catch (err) {
      console.error('Failed to delete survey:', err);
      setDeleteSurvey(null);
    }
  };

  // ---- Survey card click — Take Survey or Results sentinel ----
  const handleSurveyClick = (survey) => {
    if (canManage) {
      setSentinel({
        title: 'Survey results — coming soon',
        message:
          `“${survey.title}” has ${survey.response_count || 0} response${(survey.response_count || 0) === 1 ? '' : 's'}. `
          + 'A response-rate breakdown + per-question chart will live here. '
          + '(Backend `getResults` is already live.)',
      });
    } else {
      setSentinel({
        title: 'Take this survey — coming soon',
        message:
          'A take-survey form (one screen per question, then submit) will live here. '
          + 'Backend `respond()` is already live.',
      });
    }
  };

  // ---- Dashboard view: status counts derived from current surveys list ----
  const statusCounts = useMemo(() => {
    const counts = { active: 0, closed: 0, draft: 0, archived: 0 };
    for (const s of surveys) {
      if (counts[s.status] !== undefined) counts[s.status] += 1;
    }
    return counts;
  }, [surveys]);

  return (
    <div className="tsy-page">
      <div className="tsy-container">
        {/* Custom red banner */}
        <header className="tsy-banner">
          <div className="tsy-banner-left">
            <div className="tsy-banner-icon-tile">
              <IconMessageSquare className="tsy-banner-icon" />
            </div>
            <div>
              <h1 className="tsy-banner-title">Team Experience Surveys</h1>
              <p className="tsy-banner-sub">CFA #{STORE_NUMBER} - Anonymous Team Feedback</p>
            </div>
          </div>
          <div className="tsy-banner-right">
            <button type="button" className="tsy-back-home-btn" onClick={handleBackHome}>
              <IconLayoutDashboard className="tsy-btn-icon" />
              <span>Back Home</span>
            </button>
          </div>
        </header>

        {/* Top-level view pill buttons */}
        <div className="tsy-view-row">
          <button
            type="button"
            className={`tsy-view-btn ${activeView === 'all-surveys' ? 'primary' : 'outline'}`}
            onClick={() => setActiveView('all-surveys')}
          >
            <IconList className="tsy-btn-icon" />
            <span>All Surveys</span>
          </button>
          <button
            type="button"
            className={`tsy-view-btn ${activeView === 'dashboard' ? 'primary' : 'outline'}`}
            onClick={() => setActiveView('dashboard')}
          >
            <IconLayoutDashboard className="tsy-btn-icon" />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Main card */}
        <div className="tsy-main-card">
          <div className="tsy-main-head">
            <div>
              <h2 className="tsy-main-title">
                <IconClipboardList className="tsy-main-title-icon" />
                <span>All Surveys</span>
              </h2>
              <p className="tsy-main-sub">
                Review every survey, filter by status, and extend active or recently closed surveys.
              </p>
            </div>
            {canManage && (
              <div className="tsy-main-actions">
                <button type="button" className="tsy-view-btn primary" onClick={() => openCreateSurvey('quick')}>
                  <IconPlus className="tsy-btn-icon" />
                  <span>Quick Survey</span>
                </button>
                <button type="button" className="tsy-view-btn outline" onClick={() => openCreateSurvey('advanced')}>
                  <IconSettings className="tsy-btn-icon" />
                  <span>Advanced Survey</span>
                </button>
              </div>
            )}
          </div>

          {/* 4 KPI cards */}
          <div className="tsy-kpis">
            <div className="tsy-kpi tsy-kpi-red">
              <div className="tsy-kpi-text">
                <p className="tsy-kpi-label">Visible Surveys</p>
                <p className="tsy-kpi-value">{STATS.visible}</p>
                <p className="tsy-kpi-sub">Across every status</p>
              </div>
              <div className="tsy-kpi-icon-tile tsy-kpi-icon-red">
                <IconClipboardList className="tsy-kpi-icon" />
              </div>
            </div>

            <div className="tsy-kpi tsy-kpi-blue">
              <div className="tsy-kpi-text">
                <p className="tsy-kpi-label">Active Surveys</p>
                <p className="tsy-kpi-value">{STATS.active}</p>
                <p className="tsy-kpi-sub">Currently collecting feedback</p>
              </div>
              <div className="tsy-kpi-icon-tile tsy-kpi-icon-blue">
                <IconCalendar className="tsy-kpi-icon" />
              </div>
            </div>

            <div className="tsy-kpi tsy-kpi-green">
              <div className="tsy-kpi-text">
                <p className="tsy-kpi-label">Total Responses</p>
                <p className="tsy-kpi-value">{STATS.responses}</p>
                <p className="tsy-kpi-sub">Across recent survey activity</p>
              </div>
              <div className="tsy-kpi-icon-tile tsy-kpi-icon-green">
                <IconUsers className="tsy-kpi-icon" />
              </div>
            </div>

            <div className="tsy-kpi tsy-kpi-purple">
              <div className="tsy-kpi-text">
                <p className="tsy-kpi-label">Avg Response Rate</p>
                <p className="tsy-kpi-value">{STATS.avgRate}%</p>
                <p className="tsy-kpi-sub">Store-wide average performance</p>
              </div>
              <div className="tsy-kpi-icon-tile tsy-kpi-icon-purple">
                <IconBarChart className="tsy-kpi-icon" />
              </div>
            </div>
          </div>

          {/* ---- Dashboard view (status breakdown) ---- */}
          {activeView === 'dashboard' && (
            <section className="tsy-manage-card">
              <header className="tsy-manage-head">
                <div>
                  <h3 className="tsy-manage-title">Survey activity</h3>
                  <p className="tsy-manage-sub">Status breakdown across the latest {surveys.length} surveys</p>
                </div>
              </header>
              <div className="tsy-manage-body">
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  {[
                    { key: 'active',   label: 'Active',   color: '#3b82f6' },
                    { key: 'closed',   label: 'Closed',   color: '#6b7280' },
                    { key: 'draft',    label: 'Drafts',   color: '#f59e0b' },
                    { key: 'archived', label: 'Archived', color: '#a855f7' },
                  ].map((b) => (
                    <div
                      key={b.key}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 14,
                        background: '#fff',
                      }}
                    >
                      <div style={{
                        display: 'inline-block',
                        background: b.color,
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        padding: '2px 8px',
                        borderRadius: 999,
                      }}>{b.label}</div>
                      <p style={{ margin: '8px 0 0', fontSize: 28, fontWeight: 700, color: '#111827' }}>
                        {statusCounts[b.key] || 0}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                        {(STATS.visible || 0) > 0
                          ? `${Math.round(((statusCounts[b.key] || 0) / STATS.visible) * 100)}% of total`
                          : '—'}
                      </p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 12, fontSize: 13, color: '#4b5563' }}>
                  <strong>{STATS.responses}</strong> total responses captured · average response rate <strong>{STATS.avgRate}%</strong>.
                </div>
              </div>
            </section>
          )}

          {/* ---- All Surveys list ---- */}
          {activeView === 'all-surveys' && (
          <section className="tsy-manage-card">
            <header className="tsy-manage-head">
              <div>
                <h3 className="tsy-manage-title">Survey management</h3>
                <p className="tsy-manage-sub">{TOTAL_SURVEYS} total surveys</p>
              </div>
              <div className="tsy-manage-filters">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={`tsy-chip ${activeFilter === f.id ? 'primary' : 'outline'}`}
                    onClick={() => setActiveFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </header>

            <div className="tsy-manage-body">
              {surveys.length === 0 ? (
                <div className="tsy-empty">
                  <IconClipboardList className="tsy-empty-icon" />
                  <h3 className="tsy-empty-title">No surveys found</h3>
                  <p className="tsy-empty-text">Create a survey to start collecting team feedback.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {surveys.map((survey) => (
                    <div
                      key={survey.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSurveyClick(survey)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          handleSurveyClick(survey);
                        }
                      }}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 16,
                        padding: '16px 18px',
                        background: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, color: '#111827' }}>{survey.title}</h4>
                          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
                            {survey.questions?.length || 0} question{survey.questions?.length === 1 ? '' : 's'} · {survey.response_count || 0} responses
                          </p>
                        </div>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: '#E51636' }}>
                            {survey.status.replace('_', ' ')}
                          </span>
                          {canManage && (
                            <ActionMenu
                              align="right"
                              actions={[
                                ...(survey.status === 'active' || survey.status === 'closed'
                                  ? [{ label: 'Extend', onClick: () => openExtend(survey) }]
                                  : []),
                                ...(survey.status === 'active'
                                  ? [{ label: 'Close', onClick: () => closeSurvey(survey) }]
                                  : []),
                                ...(survey.status !== 'archived'
                                  ? [{ label: 'Archive', onClick: () => archiveSurvey(survey) }]
                                  : []),
                                { divider: true },
                                { label: 'Delete', destructive: true, onClick: () => setDeleteSurvey(survey) },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                      <p style={{ margin: '12px 0 0', fontSize: 13, color: '#4b5563' }}>
                        Opens: {survey.opens_at ? new Date(survey.opens_at).toLocaleDateString('en-US') : 'Not scheduled'} · Closes: {survey.closes_at ? new Date(survey.closes_at).toLocaleDateString('en-US') : 'Not scheduled'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          )}
        </div>
      </div>

      {/* ---- Create Survey FormModal ---- */}
      <FormModal
        isOpen={!!surveyModal}
        title={surveyModal?.mode === 'advanced' ? 'Create Survey (Advanced)' : 'Quick Survey'}
        submitLabel="Create Survey"
        size={surveyModal?.mode === 'advanced' ? 'md' : 'sm'}
        onClose={() => setSurveyModal(null)}
        onSubmit={submitSurvey}
        submitDisabled={!surveyModal?.title?.trim()}
        errorMessage={surveyError}
      >
        <TextField
          label="Survey Title"
          value={surveyModal?.title || ''}
          onChange={(v) => setSurveyModal((m) => m && ({ ...m, title: v }))}
          placeholder="e.g. Q2 team experience pulse"
          required
          autoFocus
        />
        <DatePicker
          label="Closes On"
          value={surveyModal?.closes_at || ''}
          onChange={(v) => setSurveyModal((m) => m && ({ ...m, closes_at: v }))}
          required
          help="After this date, the survey stops accepting responses."
        />
        <Toggle
          label="Anonymous responses"
          value={!!surveyModal?.is_anonymous}
          onChange={(v) => setSurveyModal((m) => m && ({ ...m, is_anonymous: v }))}
          help="If on, the system will not record who answered."
        />

        <div style={{ marginTop: 8, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
              Questions ({surveyModal?.questions?.length || 0})
            </span>
            {surveyModal?.mode === 'advanced' && (
              <button
                type="button"
                onClick={addQuestion}
                className="ui-btn ui-btn-secondary"
                style={{ fontSize: 12, padding: '4px 10px' }}
              >
                + Add Question
              </button>
            )}
          </div>
          {(surveyModal?.questions || []).map((q, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 12,
                marginBottom: 10,
                background: '#fafafa',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  Question {idx + 1}
                </span>
                {surveyModal?.mode === 'advanced' && (surveyModal?.questions?.length || 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#dc2626',
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <TextField
                label="Question text"
                value={q.text || ''}
                onChange={(v) => updateQuestion(idx, { text: v })}
                placeholder="e.g. How was your shift this week?"
                required
              />
              {surveyModal?.mode === 'advanced' && (
                <SelectField
                  label="Answer type"
                  value={q.kind || 'text'}
                  onChange={(v) => updateQuestion(idx, { kind: v })}
                  options={QUESTION_KIND_OPTIONS}
                />
              )}
            </div>
          ))}
        </div>
      </FormModal>

      {/* ---- Extend FormModal (PATCH closes_at) ---- */}
      <FormModal
        isOpen={!!extendModal}
        title={extendModal ? `Extend “${extendModal.title}”` : 'Extend Survey'}
        submitLabel="Extend"
        size="sm"
        onClose={() => setExtendModal(null)}
        onSubmit={submitExtend}
        errorMessage={extendError}
      >
        <DatePicker
          label="New Close Date"
          value={extendModal?.closes_at || ''}
          onChange={(v) => setExtendModal((m) => m && ({ ...m, closes_at: v }))}
          required
          help="If the survey was already closed, this re-opens it."
        />
      </FormModal>

      {/* ---- Delete confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteSurvey}
        title="Delete this survey?"
        message={deleteSurvey
          ? `“${deleteSurvey.title}” and all of its responses will be permanently removed.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteSurvey}
        onClose={() => setDeleteSurvey(null)}
      />

      {/* ---- Take / Results sentinel ---- */}
      <ConfirmDialog
        isOpen={!!sentinel}
        title={sentinel?.title || ''}
        message={sentinel?.message || ''}
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setSentinel(null)}
        onClose={() => setSentinel(null)}
      />
    </div>
  );
};

export default TeamSurveys;
