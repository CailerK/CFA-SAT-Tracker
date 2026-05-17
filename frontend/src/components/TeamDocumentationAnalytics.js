import React, { useState, useEffect, useCallback } from 'react';
import teamService from '../services/team';
import EmployeeRecordsDrawer from './EmployeeRecordsDrawer';
import './SetupSheetTemplates.css'; // shared red hero banner
import './TeamDocumentationAnalytics.css';

// ===== Icons =====
const IconArrowLeft = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>);
const IconUsers = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconAlertTriangle = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>);
const IconFileText = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/></svg>);
const IconShieldAlert = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric',
});

// Tabs across the page (matches LD Growth's Overview / Attention / All).
const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'attention', label: 'Attention Needed' },
  { id: 'all',       label: 'All Employees' },
];

// Pastel palette per risk bucket — used by both the chart bars and the
// per-employee risk pills.
const RISK_COLORS = {
  final_warning: { bar: '#7f1d1d', tint: '#fef2f2', ink: '#7f1d1d' },
  excessive:     { bar: '#b91c1c', tint: '#fef2f2', ink: '#b91c1c' },
  critical:      { bar: '#dc2626', tint: '#fee2e2', ink: '#b91c1c' },
  high:          { bar: '#ea580c', tint: '#ffedd5', ink: '#9a3412' },
  medium:        { bar: '#d97706', tint: '#fef3c7', ink: '#92400e' },
  low:           { bar: '#65a30d', tint: '#ecfccb', ink: '#3f6212' },
  none:          { bar: '#6b7280', tint: '#f3f4f6', ink: '#374151' },
};

const RISK_LABELS = {
  final_warning: 'Final Warning',
  excessive:     'Excessive (>3 docs)',
  critical:      'Critical',
  high:          'High',
  medium:        'Medium',
  low:           'Low',
  none:          'None',
};

const TeamDocumentationAnalytics = ({ user, onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [drawerEmployee, setDrawerEmployee] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const body = await teamService.docAnalytics();
      setData(body);
    } catch (err) {
      console.error('Failed to load documentation analytics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const totals = data?.totals || {
    total_employees: 0,
    employees_with_incidents: 0,
    total_incidents: 0,
    need_attention: 0,
  };
  const distribution = data?.risk_distribution || [];
  const employees = data?.employees || [];

  // Max bar width is driven by the largest bucket so the chart self-scales.
  const maxBucket = Math.max(1, ...distribution.map((b) => b.count));

  const handleBack = () => {
    if (onNavigate) onNavigate('team-documentation');
    else if (onBack) onBack();
  };

  // Click an employee row to open the per-employee records drawer (same one
  // used by the main Documentation page).
  const openDrawer = (e) => {
    setDrawerEmployee({
      id: e.id,
      name: e.name,
      initials: e.initials,
      role: e.role,
      riskLevel: e.risk_level,
    });
  };

  // The Attention Needed tab filters out the safe buckets.
  const attentionRows = employees.filter((e) => (
    e.risk_level !== 'none' && e.risk_level !== 'low'
  ));

  // Used in mobile/desktop tab counters.
  const counts = {
    overview: totals.total_employees,
    attention: totals.need_attention,
    all: totals.total_employees,
  };

  return (
    <div className="sst-page">
      <div className="sst-container tda-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="tda-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#tda-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="chart">📊</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo User'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <div className="tda-banner-subtitle-row">
                <p className="sst-banner-subtitle">
                  Discipline Analytics — track progressive discipline and team performance
                </p>
                <button
                  type="button"
                  className="tda-banner-back-btn"
                  onClick={handleBack}
                  aria-label="Back to Documentation"
                >
                  <IconArrowLeft className="tda-banner-back-icon" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page tabs (Overview / Attention Needed / All Employees) */}
        <div className="tda-tabs-wrap">
          <div className="tda-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`tda-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="tda-tab-label">{t.label}</span>
                <span className="tda-tab-count">{counts[t.id]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading sentinel */}
        {isLoading && (
          <div className="tda-loading">Loading analytics…</div>
        )}

        {/* ============ Overview tab ============ */}
        {!isLoading && activeTab === 'overview' && (
          <>
            {/* KPI strip — 4 cards */}
            <div className="tda-kpi-grid">
              <div className="tda-kpi tda-kpi-blue">
                <div className="tda-kpi-icon-tile" aria-hidden="true">
                  <IconUsers className="tda-kpi-icon" />
                </div>
                <div className="tda-kpi-body">
                  <p className="tda-kpi-value">{totals.total_employees}</p>
                  <p className="tda-kpi-label">Total Employees</p>
                  <p className="tda-kpi-sub">Active team members</p>
                </div>
              </div>

              <div className="tda-kpi tda-kpi-amber">
                <div className="tda-kpi-icon-tile" aria-hidden="true">
                  <IconFileText className="tda-kpi-icon" />
                </div>
                <div className="tda-kpi-body">
                  <p className="tda-kpi-value">{totals.employees_with_incidents}</p>
                  <p className="tda-kpi-label">With Incidents</p>
                  <p className="tda-kpi-sub">Documented employees</p>
                </div>
              </div>

              <div className="tda-kpi tda-kpi-violet">
                <div className="tda-kpi-icon-tile" aria-hidden="true">
                  <IconBarChart className="tda-kpi-icon" />
                </div>
                <div className="tda-kpi-body">
                  <p className="tda-kpi-value">{totals.total_incidents}</p>
                  <p className="tda-kpi-label">Total Incidents</p>
                  <p className="tda-kpi-sub">All time</p>
                </div>
              </div>

              <div className="tda-kpi tda-kpi-red">
                <div className="tda-kpi-icon-tile" aria-hidden="true">
                  <IconAlertTriangle className="tda-kpi-icon" />
                </div>
                <div className="tda-kpi-body">
                  <p className="tda-kpi-value">{totals.need_attention}</p>
                  <p className="tda-kpi-label">Need Attention</p>
                  <p className="tda-kpi-sub">Action required</p>
                </div>
              </div>
            </div>

            {/* Risk Level Distribution */}
            <section className="tda-section">
              <header className="tda-section-head">
                <div>
                  <h2 className="tda-section-title">Risk Level Distribution</h2>
                  <p className="tda-section-sub">Employee risk breakdown by category</p>
                </div>
              </header>

              <div className="tda-chart">
                {distribution.map((b) => {
                  const color = RISK_COLORS[b.key] || RISK_COLORS.none;
                  const widthPct = Math.max(2, (b.count / maxBucket) * 100);
                  return (
                    <div key={b.key} className="tda-bar-row">
                      <div className="tda-bar-label">
                        <span
                          className="tda-bar-dot"
                          style={{ background: color.bar }}
                          aria-hidden="true"
                        />
                        <span className="tda-bar-name">{b.label}</span>
                      </div>
                      <div className="tda-bar-track">
                        <div
                          className="tda-bar-fill"
                          style={{
                            width: `${widthPct}%`,
                            background: color.bar,
                          }}
                        />
                      </div>
                      <div className="tda-bar-meta">
                        <span className="tda-bar-count">{b.count}</span>
                        <span className="tda-bar-pct">({b.percentage}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ============ Attention Needed tab ============ */}
        {!isLoading && activeTab === 'attention' && (
          <section className="tda-section">
            <header className="tda-section-head">
              <div>
                <h2 className="tda-section-title">Attention Needed</h2>
                <p className="tda-section-sub">
                  {attentionRows.length} employees in elevated risk categories
                </p>
              </div>
              <span className="tda-section-pill tda-pill-red">
                <IconShieldAlert className="tda-pill-icon" />
                {attentionRows.length}
              </span>
            </header>

            <EmployeeRiskList rows={attentionRows} onOpen={openDrawer} />
          </section>
        )}

        {/* ============ All Employees tab ============ */}
        {!isLoading && activeTab === 'all' && (
          <section className="tda-section">
            <header className="tda-section-head">
              <div>
                <h2 className="tda-section-title">All Employees</h2>
                <p className="tda-section-sub">
                  {employees.length} active team members
                </p>
              </div>
            </header>

            <EmployeeRiskList rows={employees} onOpen={openDrawer} />
          </section>
        )}
      </div>

      {/* Per-employee records drawer — opens when a row is clicked. */}
      <EmployeeRecordsDrawer
        isOpen={!!drawerEmployee}
        employee={drawerEmployee}
        canManage={false}
        onClose={() => setDrawerEmployee(null)}
        onChanged={refresh}
      />
    </div>
  );
};

// Shared list used by both Attention Needed and All Employees tabs.
const EmployeeRiskList = ({ rows, onOpen }) => {
  if (rows.length === 0) {
    return (
      <div className="tda-empty">
        <p>No employees match this view.</p>
      </div>
    );
  }
  return (
    <div className="tda-emp-list">
      {rows.map((e) => {
        const color = RISK_COLORS[e.risk_level] || RISK_COLORS.none;
        const label = RISK_LABELS[e.risk_level] || 'None';
        return (
          <button
            key={e.id}
            type="button"
            className="tda-emp-row"
            onClick={() => onOpen(e)}
          >
            <span
              className="tda-emp-avatar"
              style={{ background: color.tint, color: color.ink }}
            >
              {e.initials}
            </span>
            <div className="tda-emp-text">
              <p className="tda-emp-name">{e.name}</p>
              <p className="tda-emp-meta">
                {(e.role || 'team_member').replace(/_/g, ' ')}
                {e.latest && ` • Latest: ${e.latest.title}`}
              </p>
            </div>
            <div className="tda-emp-counts">
              <span className="tda-emp-count" title="Disciplinary">{e.counts?.disc ?? 0}</span>
              <span className="tda-emp-count" title="PIP">{e.counts?.pip ?? 0}</span>
              <span className="tda-emp-count" title="Admin">{e.counts?.admin ?? 0}</span>
            </div>
            <span
              className="tda-emp-pill"
              style={{ background: color.tint, color: color.ink }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default TeamDocumentationAnalytics;
