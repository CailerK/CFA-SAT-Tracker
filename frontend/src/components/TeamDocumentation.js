import React, { useState, useEffect, useCallback } from 'react';
import teamService from '../services/team';
import { isManagerOrAbove } from '../utils/access';
import { ConfirmDialog } from './ui';
import EmployeeRecordsDrawer from './EmployeeRecordsDrawer';
import './SetupSheetTemplates.css'; // shared red hero banner
import './TeamDocumentation.css';

// ===== Icons =====
const IconSearch = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>);
const IconSettings = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'disciplinary', label: 'Disciplinary' },
  { id: 'pip',          label: 'PIP' },
  { id: 'admin',        label: 'Admin' },
];

const TeamDocumentation = ({ onNavigate, onBack, user }) => {
  const canManage = isManagerOrAbove(user);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState({ total: 0, disciplinary: 0, admin: 0, employeesWithDocs: 0 });
  // Drawer + confirm-delete modal state.
  const [drawerEmployee, setDrawerEmployee] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // { employee, recordId }
  const [notImplemented, setNotImplemented] = useState(null); // { title, message }

  const refresh = useCallback(async () => {
    try {
      const [rows, s] = await Promise.all([
        teamService.docEmployees({ filter: activeFilter, q: searchQuery.trim() || undefined }),
        teamService.docStats(),
      ]);
      const rawRows = Array.isArray(rows) ? rows : (rows.results || []);
      // Backend returns risk_level (snake_case); UI expects riskLevel.
      setEmployees(rawRows.map((r) => ({ ...r, riskLevel: r.risk_level || 'standard' })));
      setStats({
        total: s.total || 0,
        disciplinary: s.disciplinary || 0,
        admin: s.admin || 0,
        employeesWithDocs: s.employees_with_docs || 0,
      });
    } catch (err) {
      console.error('Failed to load team documentation:', err);
    }
  }, [activeFilter, searchQuery]);

  useEffect(() => { refresh(); }, [refresh]);

  // The backend already filters; this is a no-op pass-through.
  const filtered = employees;
  // Provide an alias so the existing STATS references below still work.
  const STATS = stats;

  const handleDeleteLatest = (employee) => {
    // Opens a ConfirmDialog instead of window.confirm. The actual call
    // happens in onConfirm so the dialog can show a spinner state.
    const latestId = employee?.latest?.id;
    if (!latestId) return;
    setConfirmDel({ employee, recordId: latestId });
  };

  const performDeleteLatest = async () => {
    if (!confirmDel) return;
    try {
      await teamService.deleteRecord(confirmDel.recordId);
      setConfirmDel(null);
      await refresh();
    } catch (err) {
      console.error('Failed to delete documentation record:', err);
      setConfirmDel(null);
    }
  };

  return (
    <div className="sst-page">
      <div className="sst-container td-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="td-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#td-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">🌤️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo User'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <div className="td-banner-subtitle-row">
                <p className="sst-banner-subtitle">Professional documentation system for tracking team member records</p>
                <div className="td-banner-actions">
                  <button
                    type="button"
                    className="td-banner-icon-btn"
                    aria-label="View Analytics"
                    title="View Analytics"
                    onClick={() => {
                      if (onNavigate) onNavigate('team-documentation-analytics');
                    }}
                  >
                    <IconBarChart className="td-banner-icon" />
                  </button>
                  <button
                    type="button"
                    className="td-banner-icon-btn"
                    aria-label="Documentation Preferences"
                    title="Documentation Preferences"
                    onClick={() => setNotImplemented({
                      title: 'Preferences — coming soon',
                      message: 'Documentation preferences (default record templates, escalation rules, retention policy) is on the roadmap.',
                    })}
                  >
                    <IconSettings className="td-banner-icon" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI cards - mobile compact */}
        <div className="td-kpis-mobile">
          <div className="td-kpi-compact td-kpi-red">
            <p className="td-kpi-compact-value">{STATS.total}</p>
            <p className="td-kpi-compact-label">Total</p>
          </div>
          <div className="td-kpi-compact td-kpi-red">
            <p className="td-kpi-compact-value">{STATS.disciplinary}</p>
            <p className="td-kpi-compact-label">Disciplinary</p>
          </div>
          <div className="td-kpi-compact td-kpi-blue">
            <p className="td-kpi-compact-value">{STATS.admin}</p>
            <p className="td-kpi-compact-label">Admin</p>
          </div>
        </div>

        {/* KPI cards - desktop */}
        <div className="td-kpis-desktop">
          <div className="td-kpi td-kpi-red">
            <p className="td-kpi-value">{STATS.total}</p>
            <p className="td-kpi-label">Total Documents</p>
            <p className="td-kpi-sub">Last 60 days</p>
          </div>
          <div className="td-kpi td-kpi-red-strong">
            <p className="td-kpi-value td-kpi-value-red">{STATS.disciplinary}</p>
            <p className="td-kpi-label">Disciplinary</p>
            <p className="td-kpi-sub">Last 60 days</p>
          </div>
          <div className="td-kpi td-kpi-blue">
            <p className="td-kpi-value td-kpi-value-blue">{STATS.admin}</p>
            <p className="td-kpi-label">Administrative</p>
            <p className="td-kpi-sub">Last 60 days</p>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="td-controls">
          <div className="td-search-wrap">
            <IconSearch className="td-search-icon" />
            <input
              type="text"
              className="td-search-input"
              placeholder="Search employees or documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="td-filter-row">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`td-filter-pill ${activeFilter === f.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section header */}
        <div className="td-section-head">
          <div>
            <h2 className="td-section-title">Team Members</h2>
            <p className="td-section-sub">{STATS.employeesWithDocs} employees with documentation</p>
          </div>
        </div>

        {/* Employee cards grid */}
        <div className="td-grid">
          {filtered.map((e) => (
            <article
              key={e.id}
              className={`td-card td-card-${e.riskLevel}`}
              role="button"
              tabIndex={0}
              onClick={() => setDrawerEmployee(e)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  setDrawerEmployee(e);
                }
              }}
            >
              <div className="td-card-head">
                <div className={`td-avatar td-avatar-${e.riskLevel}`}>{e.initials}</div>
                <div className="td-card-head-text">
                  <h3 className="td-name">{e.name}</h3>
                  <p className="td-role">{e.role}</p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="td-delete-btn"
                    title="Delete latest documentation record"
                    aria-label={`Delete latest documentation for ${e.name}`}
                    onClick={(ev) => { ev.stopPropagation(); handleDeleteLatest(e); }}
                  >
                    <IconTrash className="td-delete-icon" />
                  </button>
                )}
              </div>

              <div className="td-counts">
                <div className="td-count-cell">
                  <p className="td-count-value">{e.counts.disc}</p>
                  <p className="td-count-label">Disc</p>
                </div>
                <div className="td-count-cell td-count-cell-mid">
                  <p className="td-count-value">{e.counts.pip}</p>
                  <p className="td-count-label">PIP</p>
                </div>
                <div className="td-count-cell">
                  <p className="td-count-value">{e.counts.admin}</p>
                  <p className="td-count-label">Admin</p>
                </div>
              </div>

              <div className="td-latest">
                <div className={`td-latest-tile td-latest-tile-${e.latest.kind}`}>
                  <span className="td-latest-emoji" role="img" aria-hidden="true">
                    {e.latest.kind === 'warning' ? '⚠️' : '📄'}
                  </span>
                </div>
                <div className="td-latest-body">
                  <div className="td-latest-head">
                    <div>
                      <h4 className="td-latest-title">{e.latest.title}</h4>
                      <p className="td-latest-date">{e.latest.date}</p>
                    </div>
                    <span className={`td-status-pill td-status-${e.latest.status.toLowerCase()}`}>
                      {e.latest.status}
                    </span>
                  </div>
                  <p className="td-latest-text">{e.latest.text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="td-empty">
            <p>No employees match your search.</p>
          </div>
        )}
      </div>

      {/* Per-employee records drawer (click a card to open). */}
      <EmployeeRecordsDrawer
        isOpen={!!drawerEmployee}
        employee={drawerEmployee}
        canManage={canManage}
        onClose={() => setDrawerEmployee(null)}
        onChanged={refresh}
      />

      {/* Delete-latest confirmation (from card trash button). */}
      <ConfirmDialog
        isOpen={!!confirmDel}
        title="Delete latest documentation record?"
        message={confirmDel
          ? `The most recent record for ${confirmDel.employee.name} will be permanently removed.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteLatest}
        onClose={() => setConfirmDel(null)}
      />

      {/* Not-implemented sentinel for banner action icons. */}
      <ConfirmDialog
        isOpen={!!notImplemented}
        title={notImplemented?.title || ''}
        message={notImplemented?.message || ''}
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setNotImplemented(null)}
        onClose={() => setNotImplemented(null)}
      />
    </div>
  );
};

export default TeamDocumentation;
