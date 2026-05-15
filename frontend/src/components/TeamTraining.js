import React, { useState, useEffect, useCallback, useMemo } from 'react';
import teamService from '../services/team';
import './TeamTraining.css';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal,
  TextField, TextArea, NumberField, SelectField,
} from './ui';

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

const IconClipboardList = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>);
const IconUsers = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
const IconFileCheck = (p) => (<Icon {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="m9 15 2 2 4-4"/></Icon>);
const IconGlobe = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></Icon>);
const IconTrendUp = (p) => (<Icon {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></Icon>);
const IconSearchPlus = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></Icon>);
const IconChartBar = (p) => (<Icon {...p}><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></Icon>);
const IconClock = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>);
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

const TeamTraining = ({ user }) => {
  const canManage = isManagerOrAbove(user);
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
  const [plans, setPlans] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // ---- Modal state ----
  const [assignModal, setAssignModal] = useState(null); // { user, plan }
  const [assignError, setAssignError] = useState('');
  const [deleteTrainee, setDeleteTrainee] = useState(null); // trainee row
  const [planModal, setPlanModal] = useState(null); // { id?, name, description, total_steps }
  const [planError, setPlanError] = useState('');
  const [deletePlan, setDeletePlan] = useState(null); // plan record
  // traineeSentinel: { title, message } | null — deferred Trainee Detail drawer.
  const [traineeSentinel, setTraineeSentinel] = useState(null);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plansRes, membersRes] = await Promise.all([
          teamService.listPlans(),
          teamService.listMembers({ status: 'active' }),
        ]);
        if (cancelled) return;
        setPlans(plansRes.results || plansRes || []);
        setTeamMembers(membersRes.results || membersRes || []);
      } catch (err) {
        console.error('Failed to load training reference data:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // The backend already filters; expose the local list under the original name.
  const filtered = trainees;

  const PAGE_SIZE_LOCAL = 10;
  const totalPages = Math.max(1, Math.ceil(totalTrainees / PAGE_SIZE_LOCAL));
  const pageStart = totalTrainees ? (page - 1) * PAGE_SIZE_LOCAL + 1 : 0;
  const pageEnd = Math.min(page * PAGE_SIZE_LOCAL, totalTrainees);

  const displayName = user?.firstName || user?.name || 'Demo User';

  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Assign Training modal (replaces 2 chained window.prompts) ----
  const openAssignTraining = () => {
    if (!canManage) return;
    setAssignError('');
    setAssignModal({ user: '', plan: '' });
  };

  const submitAssign = async () => {
    if (!assignModal) return;
    const { user: memberId, plan: planId } = assignModal;
    if (!memberId || !planId) {
      setAssignError('Pick both a team member and a training plan.');
      throw new Error('Missing fields');
    }
    try {
      await teamService.assignTraining({ user: memberId, plan: planId });
      setAssignModal(null);
      await refresh();
    } catch (err) {
      setAssignError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Delete trainee (replaces window.confirm) ----
  const performDeleteTrainee = async () => {
    if (!deleteTrainee) return;
    try {
      await teamService.deleteTrainee(deleteTrainee.id);
      setDeleteTrainee(null);
      await refresh();
    } catch (err) {
      console.error('Failed to delete trainee assignment:', err);
      setDeleteTrainee(null);
    }
  };

  // ---- Create / Edit Training Plan modal ----
  const openCreatePlan = () => {
    if (!canManage) return;
    setPlanError('');
    setPlanModal({ name: '', description: '', total_steps: 5 });
  };

  const openEditPlan = (plan) => {
    if (!canManage) return;
    setPlanError('');
    setPlanModal({
      id: plan.id,
      name: plan.name || '',
      description: plan.description || '',
      total_steps: plan.total_steps ?? 0,
    });
  };

  const submitPlan = async () => {
    if (!planModal) return;
    const { id, name, description, total_steps } = planModal;
    if (!name.trim()) {
      setPlanError('Plan name is required.');
      throw new Error('Missing name');
    }
    try {
      const payload = {
        name: name.trim(),
        description: (description || '').trim(),
        total_steps: Number(total_steps) || 0,
      };
      const created = id
        ? await teamService.updatePlan(id, payload)
        : await teamService.createPlan(payload);
      setPlanModal(null);
      // Refresh plans list inline.
      setPlans((prev) => {
        if (id) return prev.map((p) => (p.id === id ? { ...p, ...created } : p));
        return [...prev, created];
      });
    } catch (err) {
      setPlanError(buildErrorDetail(err));
      throw err;
    }
  };

  const performDeletePlan = async () => {
    if (!deletePlan) return;
    try {
      await teamService.deletePlan(deletePlan.id);
      setPlans((prev) => prev.filter((p) => p.id !== deletePlan.id));
      setDeletePlan(null);
    } catch (err) {
      console.error('Failed to delete training plan:', err);
      setDeletePlan(null);
    }
  };

  // ---- Trainee row click (deferred detail drawer) ----
  const handleTraineeClick = (trainee) => {
    setTraineeSentinel({
      title: 'Trainee detail — coming soon',
      message:
        `${trainee.name}’s detailed progress, step-by-step status, and "Mark Complete / Pause" `
        + `controls will live here. Backend ("updateTrainee") is already live.`,
    });
  };

  // New-Hires tab: members created in the last 30 days.
  const newHires = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (teamMembers || [])
      .filter((m) => m.created_at && new Date(m.created_at).getTime() >= cutoff)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [teamMembers]);

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

      {/* ----- Tab-conditional content ----- */}
      {activeTab === 'progress' && (
      <>
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
            {canManage && (
              <button className="tt-btn-assign" type="button" onClick={openAssignTraining}>
                <IconPlus size={16} />
                <span>Assign Training</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Trainee list card */}
      <section className="tt-card tt-list-card">
        <div className="tt-list-head">
          <div>
            <h3 className="tt-list-title">Team Progress</h3>
            <p className="tt-list-sub">{totalTrainees} active trainees</p>
          </div>
          <span className="tt-list-head-icon"><IconUsers size={20} /></span>
        </div>
        <div className="tt-list-body">
          {filtered.map((t) => (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              className="tt-trainee"
              onClick={() => handleTraineeClick(t)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  handleTraineeClick(t);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="tt-trainee-left">
                <span className="tt-avatar">{t.initials}</span>
                <div className="tt-trainee-body">
                  <div className="tt-trainee-head">
                    <h4 className="tt-trainee-name">{t.name}</h4>
                    <div className="tt-trainee-meta">
                      <span className="tt-badge tt-badge--progress">
                        <IconClockSm size={12} />
                        {t.status}
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          className="tt-icon-btn"
                          aria-label={`Delete training progress for ${t.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTrainee(t);
                          }}
                        >
                          <IconTrash2 size={14} />
                        </button>
                      )}
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
          Showing {pageStart} to {pageEnd} of {totalTrainees}
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
      </>
      )}

      {/* ---- Training Plans tab ---- */}
      {activeTab === 'plans' && (
        <section className="tt-card tt-list-card">
          <div className="tt-list-head">
            <div>
              <h3 className="tt-list-title">Training Plans</h3>
              <p className="tt-list-sub">{plans.length} plan{plans.length === 1 ? '' : 's'} available</p>
            </div>
            {canManage && (
              <button className="tt-btn-assign" type="button" onClick={openCreatePlan}>
                <IconPlus size={16} />
                <span>New Plan</span>
              </button>
            )}
          </div>
          <div className="tt-list-body">
            {plans.length === 0 ? (
              <div className="tt-empty-mini">
                <IconClipboardList size={28} />
                <p>No training plans yet. Create your first to get started.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {plans.map((p) => (
                  <article
                    key={p.id}
                    className="tt-trainee"
                    style={canManage ? { cursor: 'pointer' } : undefined}
                    onClick={() => canManage && openEditPlan(p)}
                  >
                    <div className="tt-trainee-left">
                      <span className="tt-avatar"><IconClipboardList size={18} /></span>
                      <div className="tt-trainee-body">
                        <h4 className="tt-trainee-name">{p.name}</h4>
                        <p className="tt-trainee-role">
                          {p.description || 'No description'} · {p.total_steps || 0} step{p.total_steps === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    {canManage && (
                      <div onClick={(ev) => ev.stopPropagation()}>
                        <ActionMenu
                          align="right"
                          actions={[
                            { label: 'Edit', onClick: () => openEditPlan(p) },
                            { divider: true },
                            { label: 'Delete', destructive: true, onClick: () => setDeletePlan(p) },
                          ]}
                        />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- New Hires tab ---- */}
      {activeTab === 'new-hires' && (
        <section className="tt-card tt-list-card">
          <div className="tt-list-head">
            <div>
              <h3 className="tt-list-title">New Hires</h3>
              <p className="tt-list-sub">Members added in the last 30 days</p>
            </div>
            <span className="tt-list-head-icon"><IconSearchPlus size={20} /></span>
          </div>
          <div className="tt-list-body">
            {newHires.length === 0 ? (
              <div className="tt-empty-mini">
                <IconSearchPlus size={28} />
                <p>No new hires in the last 30 days.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {newHires.map((m) => {
                  const initials = (m.name || m.email || '?')
                    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
                  const hiredDate = m.created_at
                    ? new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : '—';
                  return (
                    <div key={m.id} className="tt-trainee">
                      <div className="tt-trainee-left">
                        <span className="tt-avatar">{initials}</span>
                        <div className="tt-trainee-body">
                          <h4 className="tt-trainee-name">{m.name || m.email}</h4>
                          <p className="tt-trainee-role">Hired {hiredDate} · {m.role || 'team_member'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---- Assessments / Community: deferred ---- */}
      {(activeTab === 'assessments' || activeTab === 'community') && (
        <section className="tt-card tt-list-card">
          <div className="tt-list-body">
            <div className="tt-empty-mini">
              {activeTab === 'assessments' ? <IconFileCheck size={32} /> : <IconGlobe size={32} />}
              <p style={{ fontWeight: 600, color: '#0f172a' }}>
                {activeTab === 'assessments' ? 'Assessments' : 'Community'} — coming soon
              </p>
              <p style={{ fontSize: 13, color: '#64748b', maxWidth: 460, textAlign: 'center' }}>
                {activeTab === 'assessments'
                  ? 'Per-step assessments and quiz results will live here.'
                  : 'A shared community feed for trainers and trainees is on the roadmap.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ---- Assign Training modal ---- */}
      <FormModal
        isOpen={!!assignModal}
        title="Assign Training"
        submitLabel="Assign"
        size="sm"
        onClose={() => setAssignModal(null)}
        onSubmit={submitAssign}
        submitDisabled={!assignModal?.user || !assignModal?.plan}
        errorMessage={assignError}
      >
        <SelectField
          label="Team Member"
          value={assignModal?.user || ''}
          onChange={(v) => setAssignModal((m) => m && ({ ...m, user: v }))}
          required
          options={[
            { value: '', label: '-- Select a team member --' },
            ...teamMembers.map((m) => ({
              value: String(m.id),
              label: m.name || m.email,
            })),
          ]}
        />
        <SelectField
          label="Training Plan"
          value={assignModal?.plan || ''}
          onChange={(v) => setAssignModal((m) => m && ({ ...m, plan: v }))}
          required
          options={[
            { value: '', label: '-- Select a plan --' },
            ...plans.map((p) => ({ value: String(p.id), label: p.name })),
          ]}
        />
      </FormModal>

      {/* ---- Create / Edit Training Plan modal ---- */}
      <FormModal
        isOpen={!!planModal}
        title={planModal?.id ? 'Edit Training Plan' : 'Create Training Plan'}
        submitLabel={planModal?.id ? 'Save Plan' : 'Create Plan'}
        size="sm"
        onClose={() => setPlanModal(null)}
        onSubmit={submitPlan}
        submitDisabled={!planModal?.name?.trim()}
        errorMessage={planError}
      >
        <TextField
          label="Plan Name"
          value={planModal?.name || ''}
          onChange={(v) => setPlanModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g. Foundations FOH"
          required
          autoFocus
        />
        <TextArea
          label="Description"
          value={planModal?.description || ''}
          onChange={(v) => setPlanModal((m) => m && ({ ...m, description: v }))}
          placeholder="What does this plan cover?"
          rows={3}
        />
        <NumberField
          label="Total Steps"
          value={planModal?.total_steps ?? ''}
          onChange={(v) => setPlanModal((m) => m && ({ ...m, total_steps: v }))}
          placeholder="e.g. 5"
          step="1"
        />
      </FormModal>

      {/* ---- Delete confirms ---- */}
      <ConfirmDialog
        isOpen={!!deleteTrainee}
        title="Remove this trainee assignment?"
        message={deleteTrainee
          ? `${deleteTrainee.name}’s progress on “${deleteTrainee.plan}” will be deleted.`
          : ''}
        confirmLabel="Remove"
        destructive
        onConfirm={performDeleteTrainee}
        onClose={() => setDeleteTrainee(null)}
      />
      <ConfirmDialog
        isOpen={!!deletePlan}
        title="Delete this training plan?"
        message={deletePlan
          ? `“${deletePlan.name}” will be archived. Existing trainee assignments stay intact.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeletePlan}
        onClose={() => setDeletePlan(null)}
      />
      <ConfirmDialog
        isOpen={!!traineeSentinel}
        title={traineeSentinel?.title || ''}
        message={traineeSentinel?.message || ''}
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setTraineeSentinel(null)}
        onClose={() => setTraineeSentinel(null)}
      />
    </div>
  );
};

export default TeamTraining;
