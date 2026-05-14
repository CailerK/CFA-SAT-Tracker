import React, { useState, useEffect, useCallback } from 'react';
import surveysService from '../services/surveys';
import './TeamSurveys.css';

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

const TeamSurveys = ({ onNavigate }) => {
  const [activeView, setActiveView] = useState('all-surveys');
  const [activeFilter, setActiveFilter] = useState('all');
  const [STATS, setSTATS] = useState({ visible: 0, active: 0, responses: 0, avgRate: 0 });
  const [surveys, setSurveys] = useState([]);
  const [TOTAL_SURVEYS, setTOTAL_SURVEYS] = useState(0);

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

  const handleCreateSurvey = async (mode) => {
    const title = window.prompt(mode === 'advanced' ? 'Advanced survey title' : 'Quick survey title');
    if (!title?.trim()) return;
    const questionText = window.prompt('First survey question');
    if (!questionText?.trim()) return;
    const closesAt = window.prompt('Close date (YYYY-MM-DD)', new Date().toISOString().slice(0, 10));
    if (!closesAt?.trim()) return;
    try {
      await surveysService.create({
        title: title.trim(),
        status: 'active',
        opens_at: new Date().toISOString(),
        closes_at: `${closesAt.trim()}T23:59:00`,
        is_anonymous: true,
        questions: [
          {
            text: questionText.trim(),
            kind: mode === 'advanced' ? 'rating' : 'text',
            required: true,
            options: [],
          },
        ],
      });
      await refresh();
    } catch (err) {
      console.error('Failed to create survey:', err);
    }
  };

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
            <div className="tsy-main-actions">
              <button type="button" className="tsy-view-btn primary" onClick={() => handleCreateSurvey('quick')}>
                <IconPlus className="tsy-btn-icon" />
                <span>Quick Survey</span>
              </button>
              <button type="button" className="tsy-view-btn outline" onClick={() => handleCreateSurvey('advanced')}>
                <IconSettings className="tsy-btn-icon" />
                <span>Advanced Survey</span>
              </button>
            </div>
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

          {/* Survey management inner card */}
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
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 16,
                        padding: '16px 18px',
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, color: '#111827' }}>{survey.title}</h4>
                          <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280' }}>
                            {survey.questions?.length || 0} question{survey.questions?.length === 1 ? '' : 's'} · {survey.response_count || 0} responses
                          </p>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize', color: '#E51636' }}>
                          {survey.status.replace('_', ' ')}
                        </span>
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
        </div>
      </div>
    </div>
  );
};

export default TeamSurveys;
