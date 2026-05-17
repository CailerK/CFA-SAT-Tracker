/**
 * Operator Overview — admin-only weekly summary.
 *
 * Pixel-aligned with LD Growth's `/operator-overview` page:
 *   - Red gradient hero ("Good evening, <name>! / <date> / Activity summary…")
 *   - Date-range pill + Last-N-days dropdown + Refresh / Remind buttons
 *   - 2-column body: Evaluations | Documentation
 *   - 2-column body: Training | Leadership Roadmaps
 *   - Full-width Team Overview footer
 *
 * Data source: GET /api/weekly-digest/?week=YYYY-MM-DD (admin-gated server-side).
 */

import React, { useState, useEffect, useCallback } from 'react';
import './WeeklyDigest.css';
import dashboardService from '../services/dashboard';

const fmtRangeShort = (startIso, endIso) => {
  if (!startIso || !endIso) return '';
  const opts = { month: 'short', day: 'numeric' };
  const s = new Date(`${startIso}T12:00:00`).toLocaleDateString('en-US', opts);
  const e = new Date(`${endIso}T12:00:00`).toLocaleDateString('en-US', opts);
  return `${s} — ${e}`;
};
const fmtLongDate = (iso) => iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  : '';
const fmtShortDate = (iso) => iso
  ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  : '';
const greetingFor = (d = new Date()) => {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

// ===== Lucide-style inline icons =====
const I = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconCalendar = (p) => <I {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></I>;
const IconRefresh  = (p) => <I {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/></I>;
const IconBell     = (p) => <I {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></I>;
const IconAlert    = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></I>;
const IconClipboardCheck = (p) => <I {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="9 14 11 16 15 12"/></I>;
const IconFileText = (p) => <I {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></I>;
const IconGraduation = (p) => <I {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 4 3 6 3s6-1.34 6-3v-5"/></I>;
const IconTarget   = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></I>;
const IconUsers    = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>;
const IconChevronR = (p) => <I {...p}><polyline points="9 18 15 12 9 6"/></I>;
const IconMoon     = (p) => <I {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></I>;
const IconCheckCircle = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></I>;
const IconTrendUp  = (p) => <I {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></I>;

const RANGE_OPTIONS = [
  { value: '7',  label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
];

const WeeklyDigest = ({ onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rangeDays, setRangeDays] = useState('7');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const days = parseInt(rangeDays, 10) || 7;
      const start = new Date();
      start.setDate(start.getDate() - (days - 1));
      const iso = start.toISOString().slice(0, 10);
      const res = await dashboardService.getWeeklyDigest(iso);
      setData(res);
    } catch (err) {
      console.error('Failed to load weekly digest:', err);
      setError(err?.data?.detail || err.message || 'Could not load Operator Overview.');
    } finally { setLoading(false); }
  }, [rangeDays]);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !data) {
    return <div className="wd-page"><div className="wd-loading">Loading Operator Overview…</div></div>;
  }
  if (error) {
    return <div className="wd-page"><div className="wd-error">{error}</div></div>;
  }

  const d = data || {};
  const ev = d.evaluations || {};
  const doc = d.documentation || {};
  const tr = d.training || {};
  const ld = d.leadership || {};
  const team = d.team_overview || {};
  const hero = d.hero || {};
  const range = d.range || {};

  return (
    <div className="wd-page">
      {onBack && (
        <button className="wd-back" onClick={onBack}>
          <I size={16}><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></I>
          Back
        </button>
      )}

      {/* Hero banner */}
      <section className="wd-hero">
        <div className="wd-hero-glow" aria-hidden="true" />
        <div className="wd-hero-row">
          <span className="wd-hero-emoji" aria-hidden="true"><IconMoon size={32} /></span>
          <div className="wd-hero-block">
            <h1 className="wd-hero-title">{greetingFor()}, {hero.user_name || 'there'}!</h1>
            <p className="wd-hero-date">{fmtLongDate(hero.date_iso)}</p>
          </div>
        </div>
        <div className="wd-hero-bar">
          <span className="wd-hero-rule" aria-hidden="true" />
          <p className="wd-hero-tag">
            Activity summary across {hero.store_count ?? 1} store{(hero.store_count ?? 1) === 1 ? '' : 's'}
          </p>
        </div>
      </section>

      {/* Filter strip */}
      <div className="wd-filters">
        <span className="wd-range-pill">
          <IconCalendar size={14} />
          {fmtRangeShort(range.start, range.end)}
        </span>
        <span className="wd-spacer" />
        <select className="wd-select" value={rangeDays} onChange={(e) => setRangeDays(e.target.value)}>
          {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button className="wd-btn wd-btn-ghost" onClick={refresh}><IconRefresh size={14} />Refresh</button>
        <button className="wd-btn wd-btn-ghost" type="button"><IconBell size={14} />Remind</button>
      </div>

      {/* Row 1: Evaluations + Documentation */}
      <div className="wd-grid">
        <SectionCard icon={<IconClipboardCheck size={18} />} title="Evaluations">
          <div className="wd-kpi-row">
            <KpiTile tone="emerald" value={ev.completed ?? 0} label="Completed" />
            <KpiTile tone="amber"   value={ev.pending   ?? 0} label="Pending" />
            <KpiTile tone="red"     value={ev.overdue   ?? 0} label="Overdue" />
          </div>
          {(ev.overdue_items || []).length > 0 && (
            <InnerPanel tone="red" icon={<IconAlert size={14} />} title={`Action Required: Overdue (${ev.overdue})`}>
              {ev.overdue_items.map(item => (
                <div key={item.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{item.name}</div>
                    <div className="wd-row-sub">{item.role}</div>
                  </div>
                  {item.due_iso && <span className="wd-pill wd-pill-red">{fmtShortDate(item.due_iso)}</span>}
                  <button className="wd-row-bell" aria-label="Remind"><IconBell size={14} /></button>
                </div>
              ))}
            </InnerPanel>
          )}
        </SectionCard>

        <SectionCard icon={<IconFileText size={18} />} title="Documentation">
          <div className="wd-kpi-row">
            <KpiTile tone="red"    value={doc.disciplinary ?? 0} label="Disciplinary" />
            <KpiTile tone="violet" value={doc.pips         ?? 0} label="PIPs" />
            <KpiTile tone="blue"   value={doc.admin        ?? 0} label="Admin" />
          </div>
          {(doc.recent_disciplinary || []).length > 0 && (
            <InnerPanel tone="red" icon={<IconAlert size={14} />} title={`Recent Disciplinary (${doc.recent_disciplinary.length})`}>
              {doc.recent_disciplinary.map(r => (
                <div key={r.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{r.name}</div>
                    <div className="wd-row-sub">{r.role}</div>
                  </div>
                  <span className="wd-pill wd-pill-red-soft">{r.label}</span>
                </div>
              ))}
            </InnerPanel>
          )}
          {(doc.recent_admin || []).length > 0 && (
            <InnerPanel tone="blue" icon={<IconFileText size={14} />} title={`Recent Administrative (${doc.recent_admin.length})`}>
              {doc.recent_admin.map(r => (
                <div key={r.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{r.name}</div>
                    <div className="wd-row-sub">{r.role}</div>
                  </div>
                  <span className="wd-pill wd-pill-blue">{r.label}</span>
                </div>
              ))}
            </InnerPanel>
          )}
          {(doc.active_performance_plans || []).length > 0 && (
            <InnerPanel tone="violet" icon={<IconCheckCircle size={14} />} title={`Active Performance Plans (${doc.active_performance_plans.length})`}>
              {doc.active_performance_plans.map(r => (
                <div key={r.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{r.name}</div>
                    <div className="wd-row-sub">{r.goals_text}</div>
                  </div>
                  <span className="wd-pill wd-pill-amber">Pending Acknowledgment</span>
                </div>
              ))}
            </InnerPanel>
          )}
          {(doc.pending_acknowledgment_items || []).length > 0 && (
            <InnerPanel tone="amber" icon={<IconAlert size={14} />} title={`Pending Acknowledgment (${doc.pending_acknowledgment_total ?? doc.pending_acknowledgment_items.length})`}>
              {doc.pending_acknowledgment_items.map(r => (
                <div key={r.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{r.name}</div>
                    <div className="wd-row-sub">{r.role}</div>
                  </div>
                  <span className="wd-pill wd-pill-amber">Needs acknowledgement</span>
                  <button className="wd-row-bell" aria-label="Remind"><IconBell size={14} /></button>
                </div>
              ))}
            </InnerPanel>
          )}
        </SectionCard>
      </div>

      {/* Row 2: Training + Leadership Roadmaps */}
      <div className="wd-grid">
        <SectionCard icon={<IconGraduation size={18} />} title="Training">
          <div className="wd-kpi-row">
            <KpiTile tone="emerald" value={tr.completed   ?? 0} label="Completed" />
            <KpiTile tone="blue"    value={tr.in_progress ?? 0} label="In Progress" />
            <KpiTile tone="red"     value={tr.overdue     ?? 0} label="Overdue" />
          </div>
          {(tr.in_progress_items || []).length > 0 && (
            <InnerPanel tone="blue" icon={<IconTrendUp size={14} />} title={`In Progress (${tr.in_progress_items.length})`}>
              {tr.in_progress_items.map(i => (
                <div key={i.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{i.name}</div>
                    <div className="wd-row-sub">{i.plan} • {i.percent}%{i.trainer ? ` • Trainer: ${i.trainer}` : ''}</div>
                  </div>
                </div>
              ))}
            </InnerPanel>
          )}
        </SectionCard>

        <SectionCard icon={<IconTarget size={18} />} title="Leadership Roadmaps">
          <div className="wd-kpi-row">
            <KpiTile tone="violet"  value={ld.active        ?? 0}        label="Active" />
            <KpiTile tone="emerald" value={ld.goals_done    ?? 0}        label="Goals Done" />
            <KpiTile tone="blue"    value={`${ld.avg_progress ?? 0}%`}   label="Avg Progress" />
          </div>
          {(ld.active_roadmaps || []).length > 0 && (
            <InnerPanel tone="blue" icon={<IconTarget size={14} />} title={`Active Roadmaps (${ld.active_roadmaps.length})`}>
              {ld.active_roadmaps.map(p => (
                <div key={p.id} className="wd-row">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{p.name}</div>
                    <div className="wd-row-sub">{p.dept}</div>
                  </div>
                  <span className="wd-pill wd-pill-blue">{p.percent}%</span>
                </div>
              ))}
            </InnerPanel>
          )}
        </SectionCard>
      </div>

      {/* Row 3: Team Overview (full-width) */}
      <SectionCard icon={<IconUsers size={18} />} title="Team Overview" fullWidth>
        <div className="wd-kpi-row wd-kpi-row-4">
          <KpiTile tone="slate"   value={team.active_users     ?? 0}       label="Active Users" />
          <KpiTile tone="emerald" value={team.new_hires        ?? 0}       label="New Hires"     sub="this period" />
          <KpiTile tone="blue"    value={team.recently_active  ?? 0}       label="Recently Active" sub="logged in this week" />
          <KpiTile tone="red"     value={`${team.activity_rate ?? 0}%`}     label="Activity Rate" />
        </div>
        {(team.recent_new_hires || []).length > 0 && (
          <InnerPanel tone="emerald" icon={<IconCheckCircle size={14} />} title="Recent New Hires">
            <div className="wd-row-grid">
              {team.recent_new_hires.map(u => (
                <div key={u.id} className="wd-row wd-row-card">
                  <div className="wd-row-text">
                    <div className="wd-row-name">{u.name}</div>
                    <div className="wd-row-sub">{u.role}</div>
                  </div>
                  <span className="wd-row-date">{fmtShortDate(u.date_iso)}</span>
                </div>
              ))}
            </div>
          </InnerPanel>
        )}
      </SectionCard>
    </div>
  );
};

// ----- Sub-components -----
const SectionCard = ({ icon, title, fullWidth = false, children }) => (
  <section className={`wd-card ${fullWidth ? 'wd-card-full' : ''}`}>
    <header className="wd-card-head">
      <span className="wd-card-icon" aria-hidden="true">{icon}</span>
      <h2 className="wd-card-title">{title}</h2>
      <span className="wd-card-cta">View all <IconChevronR size={12} /></span>
    </header>
    <div className="wd-card-body">{children}</div>
  </section>
);

const KpiTile = ({ tone = 'slate', value, label, sub }) => (
  <div className={`wd-kpi wd-kpi-${tone}`}>
    <div className="wd-kpi-value">{value}</div>
    <div className="wd-kpi-label">{label}</div>
    {sub && <div className="wd-kpi-sub">{sub}</div>}
  </div>
);

const InnerPanel = ({ tone = 'red', icon, title, children }) => (
  <div className={`wd-panel wd-panel-${tone}`}>
    <header className="wd-panel-head">
      <span className="wd-panel-icon" aria-hidden="true">{icon}</span>
      <span className="wd-panel-title">{title}</span>
    </header>
    <div className="wd-panel-body">{children}</div>
  </div>
);

export default WeeklyDigest;
