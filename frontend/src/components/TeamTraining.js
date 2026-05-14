import React, { useMemo, useState, useEffect, useCallback } from 'react';
import teamService from '../services/team';
import './TeamTraining.css';

// Normalize a backend TraineeAssignment to the trainee row shape the UI uses.
const normalizeTrainee = (raw) => ({
  id: raw.id,
  name: raw.user_name,
  initials: raw.user_initials || '??',
  role: 'Team Member',
  dept: raw.department_name || '—',
  plan: raw.plan_name,
  progress: raw.progress_percent || 0,
  status: raw.status === 'in_progress' ? 'In Progress'
    : raw.status === 'completed' ? 'Completed' : 'Paused',
});

/* ----- Inline Lucide icons (stroke = currentColor) ----- */
const Icon = ({ d, size = 18, stroke = 2, children, viewBox = '0 0 24 24' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const IconBookOpen = (p) => (<Icon {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Icon>);
const IconClipboardList = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>);
const IconUsers = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
const IconFileCheck = (p) => (<Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></Icon>);
const IconGlobe = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Icon>);
const IconTrendUp = (p) => (<Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>);
const IconSearchPlus = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></Icon>);
const IconChartBar = (p) => (<Icon {...p}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></Icon>);
const IconClock = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>);
const IconSearch = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>);
const IconPlus = (p) => (<Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>);
const IconClipboardCheck = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></Icon>);
const IconTrash2 = (p) => (<Icon {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>);
const IconChevronRight = (p) => (<Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>);
const IconClockSm = IconClock;

/* ----- Tabs ----- */
const TABS = [
  { id: 'progress', label: 'Progress', short: 'Progress', Icon: IconChartBar },
  { id: 'plans', label: 'Training Plans', short: 'Plans', Icon: IconClipboardList },
  { id: 'new-hires', label: 'New Hires', short: 'New Hires', Icon: IconSearchPlus },
  { id: 'assessments', label: 'Assessments', short: 'Assess', Icon: IconFileCheck },
  { id: 'community', label: 'Community', short: 'Community', Icon: IconGlobe },
];

const DEPARTMENTS = [
  { name: 'Front of House', progress: 81, color: 'rgb(229, 22, 54)' },
  { name: 'Drive Thru', progress: 100, color: 'rgb(0, 79, 113)' },
  { name: 'Kitchen', progress: 16, color: 'rgb(217, 119, 6)' },
  { name: 'Management', progress: 90, color: 'rgb(5, 150, 105)' },
];

const TRAINEES = [
  { id: 1,  name: 'Benji McDonald',    initials: 'BM', role: 'Team Member', dept: 'Front Counter', plan: 'Foundations FOH', progress: 0,   status: 'In Progress' },
  { id: 2,  name: 'Joshua Ortiz',      initials: 'JO', role: 'Team Member', dept: 'Front Counter', plan: 'Foundations FOH', progress: 44,  status: 'In Progress' },
  { id: 3,  name: 'Samara Robles',     initials: 'SR', role: 'Team Member', dept: 'Kitchen',       plan: 'Foundations BOH', progress: 16,  status: 'In Progress' },
  { id: 4,  name: 'Carter Witte',      initials: 'CW', role: 'Team Member', dept: 'Drive Thru',    plan: 'Foundations FOH', progress: 72,  status: 'In Progress' },
  { id: 5,  name: 'Peyton Barbier',    initials: 'PB', role: 'Team Member', dept: 'Front Counter', plan: 'Foundations FOH', progress: 55,  status: 'In Progress' },
  { id: 6,  name: 'Kevin Santos',      initials: 'KS', role: 'Team Member', dept: 'Kitchen',       plan: 'Foundations BOH', progress: 28,  status: 'In Progress' },
  { id: 7,  name: 'Madison Ensley',    initials: 'ME', role: 'Team Member', dept: 'Drive Thru',    plan: 'Foundations FOH', progress: 90,  status: 'In Progress' },
  { id: 8,  name: 'Carson Duncan',     initials: 'CD', role: 'Team Member', dept: 'Front Counter', plan: 'Foundations FOH', progress: 12,  status: 'In Progress' },
  { id: 9,  name: 'Chase Gribble',     initials: 'CG', role: 'Team Member', dept: 'Kitchen',       plan: 'Foundations BOH', progress: 39,  status: 'In Progress' },
  { id: 10, name: 'Emma Liberatore',   initials: 'EL', role: 'Team Member', dept: 'Front Counter', plan: 'Foundations FOH', progress: 65,  status: 'In Progress' },
];

const TOTAL_TRAINEES = 25;
const PAGE_SIZE = 10;

const TeamTraining = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('progress');
  const [deptView, setDeptView] = useState('department');
  const [statusTab, setStatusTab] = useState('active');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [trainees, setTrainees] = useState([]);
  const [kpis, setKpis] = useState({
    active_trainees: 0, completion_rate: 0, new_hires: 0, active_plans: 0,
  });
  const [departments, setDepartments] = useState([]);
  const [totalTrainees, setTotalTrainees] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const apiStatus = statusTab === 'active' ? 'in_progress'
        : statusTab === 'completed' ? 'completed' : undefined;
      const [list, statsData, byDept] = await Promise.all([
        teamService.listTrainees({ status: apiStatus, q: query.trim() || undefined }),
        teamService.trainingStats(),
        teamService.progressByDepartment(),
      ]);
      const rows = list.results || list || [];
      setTrainees(rows.map(normalizeTrainee));
      setTotalTrainees(list.count || rows.length);
      setKpis(statsData);
      const palette = ['rgb(229, 22, 54)', 'rgb(0, 79, 113)', 'rgb(217, 119, 6)', 'rgb(5, 150, 105)', 'rgb(124, 58, 237)'];
      setDepartments(
        (byDept || []).map((d, i) => ({ ...d, color: palette[i % palette.length] }))
      );
    } catch (err) {
      console.error('Failed to load team training:', err);
    }
  }, [statusTab, query]);

  useEffect(() => { refresh(); }, [refresh]);

  // The backend already filters; expose the local list under the original name.
  const filtered = trainees;

  const PAGE_SIZE_LOCAL = 10;
  const totalPages = Math.max(1, Math.ceil(totalTrainees / PAGE_SIZE_LOCAL));
  const pageStart = totalTrainees ? (page - 1) * PAGE_SIZE_LOCAL + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE_LOCAL, totalTrainees);

  const displayName = user?.firstName || user?.name || 'Demo User';

  return (
    <div className="tt-page">
      {/* Hero banner */}
      <section className="tt-hero">
        <div className="tt-hero-glow" />
        <div className="tt-hero-inner">
          <div className="tt-hero-row">
            <span className="tt-hero-sun" aria-hidden>☀️</span>
            <div>
              <h1 className="tt-hero-greeting">
                Good morning, <span>{displayName}!</span>
              </h1>
              <p className="tt-hero-date">Wednesday, April 22</p>
            </div>
          </div>
          <div className="tt-hero-tag">
            <span className="tt-hero-divider" />
            <p>Empowering your team through exceptional training</p>
          </div>
        </div>
      </section>

      {/* Tab nav */}
      <nav className="tt-tabs" aria-label="Training sections">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              className={`tt-tab ${active ? 'is-active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <t.Icon size={16} />
              <span className="tt-tab-lg">{t.label}</span>
              <span className="tt-tab-sm">{t.short}</span>
            </button>
          );
        })}
      </nav>

      {/* KPI grid */}
      <section className="tt-kpis">
        <div className="tt-kpi">
          <div className="tt-kpi-info">
            <p className="tt-kpi-label">Active Trainees</p>
            <p className="tt-kpi-value">{kpis.active_trainees}</p>
            <p className="tt-kpi-sub">Currently in training</p>
          </div>
          <div className="tt-kpi-icon"><IconUsers size={22} /></div>
        </div>

        <div className="tt-kpi tt-kpi--featured">
          <div className="tt-kpi-info">
            <p className="tt-kpi-label">Completion Rate</p>
            <p className="tt-kpi-value">{kpis.completion_rate}%</p>
            <p className="tt-kpi-sub">Average progress</p>
          </div>
          <div className="tt-kpi-icon tt-kpi-icon--white"><IconTrendUp size={22} /></div>
        </div>

        <div className="tt-kpi">
          <div className="tt-kpi-info">
            <p className="tt-kpi-label">New Hires</p>
            <p className="tt-kpi-value">{kpis.new_hires}</p>
            <p className="tt-kpi-sub">Need training plans</p>
          </div>
          <div className="tt-kpi-icon"><IconSearchPlus size={22} /></div>
          <span className="tt-kpi-pulse" aria-hidden>
            <span className="tt-kpi-pulse-ring" />
            <span className="tt-kpi-pulse-dot" />
          </span>
        </div>

        <div className="tt-kpi">
          <div className="tt-kpi-info">
            <p className="tt-kpi-label">Active Plans</p>
            <p className="tt-kpi-value">{kpis.active_plans}</p>
            <p className="tt-kpi-sub">Plans in use</p>
          </div>
          <div className="tt-kpi-icon"><IconClipboardList size={22} /></div>
        </div>
      </section>

      {/* Department / Recent card */}
      <section className="tt-card">
        <div className="tt-seg">
          <button
            className={`tt-seg-btn ${deptView === 'department' ? 'is-active' : ''}`}
            onClick={() => setDeptView('department')}
          >
            <IconChartBar size={16} />
            <span>By Department</span>
          </button>
          <button
            className={`tt-seg-btn ${deptView === 'recent' ? 'is-active' : ''}`}
            onClick={() => setDeptView('recent')}
          >
            <IconClock size={16} />
            <span>Recent Activity</span>
          </button>
        </div>

        <div className="tt-card-body">
          {deptView === 'department' ? (
            <div className="tt-dept-list">
              {(departments.length ? departments : []).map((d) => (
                <div key={d.name} className="tt-dept-row">
                  <div className="tt-dept-head">
                    <span className="tt-dept-name">{d.name}</span>
                    <span className="tt-dept-pct" style={{ color: d.color }}>{d.progress}%</span>
                  </div>
                  <div className="tt-dept-bar">
                    <div
                      className="tt-dept-fill"
                      style={{ width: `${d.progress}%`, backgroundColor: d.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tt-empty-mini">
              <IconClock size={24} />
              <p>No recent activity yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Search + status + assign */}
      <section className="tt-card tt-search-card">
        <div className="tt-card-body tt-search-body">
          <input
            className="tt-search-input"
            placeholder="Search trainees..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="tt-search-row">
            <div className="tt-pill-group">
              <button
                className={`tt-pill ${statusTab === 'active' ? 'is-active' : ''}`}
                onClick={() => setStatusTab('active')}
              >Active</button>
              <button
                className={`tt-pill ${statusTab === 'completed' ? 'is-active' : ''}`}
                onClick={() => setStatusTab('completed')}
              >Completed</button>
            </div>
            <button className="tt-btn-assign" type="button">
              <IconPlus size={16} />
              <span>Assign Training</span>
            </button>
          </div>
        </div>
      </section>

      {/* Trainee list card */}
      <section className="tt-card tt-list-card">
        <div className="tt-list-head">
          <div>
            <h3 className="tt-list-title">Team Progress</h3>
            <p className="tt-list-sub">{TOTAL_TRAINEES} active trainees</p>
          </div>
          <span className="tt-list-head-icon"><IconUsers size={20} /></span>
        </div>
        <div className="tt-list-body">
          {filtered.map((t) => (
            <div key={t.id} role="button" tabIndex={0} className="tt-trainee">
              <div className="tt-trainee-left">
                <span className="tt-avatar">{t.initials}</span>
                <div className="tt-trainee-body">
                  <div className="tt-trainee-head">
                    <h4 className="tt-trainee-name">{t.name}</h4>
                    <div className="tt-trainee-meta">
                      <span className="tt-badge tt-badge--progress">
                        <IconClockSm size={12} />
                        In Progress
                      </span>
                      <button
                        type="button"
                        className="tt-icon-btn"
                        aria-label={`Delete training progress for ${t.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconTrash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="tt-trainee-role">{t.role} · {t.dept}</p>
                  <div className="tt-trainee-plan">
                    <div className="tt-trainee-plan-head">
                      <span className="tt-trainee-plan-label">
                        <IconClipboardCheck size={14} />
                        {t.plan}
                      </span>
                      <span className="tt-trainee-plan-pct">{t.progress}%</span>
                    </div>
                    <div className="tt-trainee-plan-bar">
                      <div
                        className="tt-trainee-plan-fill"
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <span className="tt-trainee-chevron"><IconChevronRight size={18} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* Pagination */}
      <section className="tt-paginator">
        <p className="tt-paginator-count">
          Showing {pageStart} to {pageEnd} of {TOTAL_TRAINEES}
        </p>
        <div className="tt-paginator-ctrls">
          <button
            className="tt-pg-btn"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >Previous</button>
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            return (
              <button
                key={n}
                className={`tt-pg-btn tt-pg-num ${page === n ? 'is-active' : ''}`}
                onClick={() => setPage(n)}
              >{n}</button>
            );
          })}
          <button
            className="tt-pg-btn"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >Next</button>
        </div>
      </section>
    </div>
  );
};

export default TeamTraining;
