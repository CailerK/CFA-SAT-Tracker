import React, { useState, useMemo, useEffect } from 'react';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen tabs (kd-nav*)
import './KitchenAnalytics.css';
import kitchenService from '../services/kitchen';
import { isManagerOrAbove } from '../utils/access';
import { FormModal, NumberField } from './ui';

// Map the UI range label to the backend's range string (e.g. "Last 30 Days" → "30d").
const rangeToDays = (label) => {
  if (!label) return '30d';
  const m = label.match(/(\d+)/);
  if (m) return `${m[1]}d`;
  if (/month/i.test(label)) return '30d';
  return '30d';
};

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconTarget = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>);
const IconPenLine = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>);
const IconCheckCircle = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>);
const IconTrendingDown = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/></svg>);
const IconArrowDown = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>);
const IconChevronDown = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const SUB_TABS = [
  { id: 'overview', emoji: '📊', label: 'Overview' },
  { id: 'byDay', emoji: '📅', label: 'By Day' },
  { id: 'byMeal', emoji: '🍽️', label: 'By Meal' },
  { id: 'byHour', emoji: '⏰', label: 'By Hour' },
  { id: 'topItems', emoji: '🔝', label: 'Top Items' },
  { id: 'timeline', emoji: '📜', label: 'Timeline' },
];

const RANGE_OPTIONS = ['Last 7 Days', 'Last 14 Days', 'Last 30 Days', 'Last 90 Days', 'This Month', 'Last Month'];

// ===== Line chart helper =====
const LineChart = ({ data, width = 472, height = 280, padL = 50, padR = 5, padT = 5, padB = 35, maxY = 80 }) => {
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const yTicks = [0, 20, 40, 60, 80];
  const tickLabelIdxs = [0, 2, 10, 20, 22, 25, 29]; // Mar 23, Mar 25, Apr 3, Apr 13, Apr 15, Apr 18, Apr 21

  const xFor = (i) => padL + (i / (data.length - 1)) * innerW;
  const yFor = (v) => padT + innerH - (v / maxY) * innerH;

  // Smooth-ish path using catmull-rom-ish bezier
  const pathD = useMemo(() => {
    if (data.length === 0) return '';
    const pts = data.map((d, i) => [xFor(i), yFor(d.y)]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const cx = (x0 + x1) / 2;
      d += `C${cx},${y0},${cx},${y1},${x1},${y1}`;
    }
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <svg className="ka-chart-svg" width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {/* horizontal grid + y labels */}
      {yTicks.map((t) => {
        const y = yFor(t);
        return (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#E5E7EB" strokeDasharray="3 3" />
            <text x={padL - 8} y={y} dy="0.35em" textAnchor="end" fontSize="11" fill="#9CA3AF">${t}</text>
          </g>
        );
      })}
      {/* vertical grid */}
      {tickLabelIdxs.map((i) => {
        const x = xFor(i);
        return (
          <line key={`vg-${i}`} x1={x} x2={x} y1={padT} y2={padT + innerH} stroke="#E5E7EB" strokeDasharray="3 3" />
        );
      })}
      {/* x axis */}
      <line x1={padL} x2={width - padR} y1={padT + innerH} y2={padT + innerH} stroke="#9CA3AF" />
      {/* x-axis labels */}
      {tickLabelIdxs.map((i) => (
        <text
          key={`xl-${i}`}
          x={xFor(i)}
          y={padT + innerH + 16}
          textAnchor="middle"
          fontSize="11"
          fill="#9CA3AF"
        >
          {data[i]?.label}
        </text>
      ))}
      {/* line */}
      <path d={pathD} stroke="#E51636" strokeWidth="2" fill="none" />
    </svg>
  );
};

const KitchenAnalytics = ({ onNavigate, user }) => {
  const canManage = isManagerOrAbove(user);
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [range, setRange] = useState('Last 30 Days');
  const [kpisData, setKpisData] = useState(null);   // {today, this_week, yesterday, top_item}
  const [trendPoints, setTrendPoints] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [goalsData, setGoalsData] = useState({ daily: 100, weekly: 600, monthly: 2500 });
  const [isLoading, setIsLoading] = useState(true);
  // Edit Goals FormModal state.
  const [goalsModal, setGoalsModal] = useState(null); // { daily, weekly, monthly }
  const [goalsError, setGoalsError] = useState('');

  // Load all analytics endpoints whenever the range changes.
  useEffect(() => {
    let cancelled = false;
    const days = rangeToDays(range);
    (async () => {
      try {
        const [kpis, trend, top, goals] = await Promise.all([
          kitchenService.getKPIs(),
          kitchenService.getTrend({ range: days }),
          kitchenService.getTopItems({ range: days }),
          kitchenService.getGoals(),
        ]);
        if (cancelled) return;
        setKpisData(kpis);
        setTrendPoints(trend.points || []);
        setTopItems(top.items || []);
        setGoalsData(goals);
      } catch (err) {
        console.error('Failed to load kitchen analytics:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range]);

  const tabs = [
    { id: 'home', label: 'Home', Icon: IconLayoutDashboard },
    { id: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { id: 'equip', label: 'Equip', Icon: IconWrench },
    { id: 'safety', label: 'Safety', Icon: IconShieldCheck },
    { id: 'clean', label: 'Clean', Icon: IconSparkles },
    { id: 'lists', label: 'Lists', Icon: IconClipboardList },
    { id: 'waste', label: 'Waste', Icon: IconTrash },
  ];

  const handleTabClick = (id) => {
    if (!onNavigate) return;
    switch (id) {
      case 'home': return onNavigate('kitchen');
      case 'equip': return onNavigate('kitchen-equipment');
      case 'safety': return onNavigate('kitchen-safety');
      case 'clean': return onNavigate('kitchen-cleaning');
      case 'lists': return onNavigate('kitchen-checklists');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  // KPIs computed from /api/kitchen/waste/kpis/ (loaded above).
  const kpis = useMemo(() => {
    if (!kpisData) return [];
    const today = kpisData.today || {};
    const week = kpisData.this_week || {};
    const yesterday = kpisData.yesterday || {};
    const top = kpisData.top_item || {};
    const deltaPct = today.delta_vs_yesterday_pct;
    return [
      {
        emoji: '💰', label: 'Today',
        value: `$${Number(today.cost || 0).toFixed(2)}`,
        trendEmoji: deltaPct != null ? (
          <>
            {deltaPct < 0 ? <IconArrowDown className="ka-kpi-trend-icon" /> : null}
            <span className="ka-kpi-trend-text">{deltaPct > 0 ? '+' : ''}{deltaPct}%</span>
          </>
        ) : null,
      },
      { emoji: '📅', label: 'This Week', value: `$${Number(week.cost || 0).toFixed(2)}`, sub: `${week.count || 0} items` },
      { emoji: '⏰', label: 'Yesterday', value: `$${Number(yesterday.cost || 0).toFixed(2)}`, sub: 'total waste' },
      { emoji: '⚠️', label: 'Top Item',  value: top.name || '—', sub: top.cost ? `$${Number(top.cost).toFixed(2)}` : '' },
    ];
  }, [kpisData]);

  // Goals from /api/kitchen/waste/goals/ + current totals from KPIs.
  const goals = useMemo(() => {
    const todayCost = Number(kpisData?.today?.cost || 0);
    const weekCost = Number(kpisData?.this_week?.cost || 0);
    // We don't have a real "monthly" total yet — use weekly as a proxy.
    return [
      { label: 'Daily Goal',   value: todayCost, target: Number(goalsData.daily || 0), vsYesterday: kpisData?.today?.delta_vs_yesterday_pct ?? null },
      { label: 'Weekly Goal',  value: weekCost,  target: Number(goalsData.weekly || 0), vsYesterday: null },
      { label: 'Monthly Goal', value: weekCost,  target: Number(goalsData.monthly || 0), vsYesterday: null },
    ];
  }, [goalsData, kpisData]);

  const trendTotal = useMemo(() => trendPoints.reduce((s, p) => s + (p.y || 0), 0), [trendPoints]);

  // Open the Edit Goals FormModal (replaces chained window.prompt calls).
  const handleEditGoals = () => {
    if (!canManage) return;
    setGoalsError('');
    setGoalsModal({
      daily: goalsData.daily ?? 0,
      weekly: goalsData.weekly ?? 0,
      monthly: goalsData.monthly ?? 0,
    });
  };

  const submitGoals = async () => {
    if (!goalsModal) return;
    try {
      const updated = await kitchenService.updateGoals({
        daily: Number(goalsModal.daily),
        weekly: Number(goalsModal.weekly),
        monthly: Number(goalsModal.monthly),
      });
      setGoalsData(updated);
      setGoalsModal(null);
    } catch (err) {
      const detail = err?.data
        ? Object.entries(err.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' \u2022 ')
        : (err?.message || 'Save failed.');
      setGoalsError(detail);
      throw err;
    }
  };

  return (
    <div className="sst-page">
      <div className="sst-container kd-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ka-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ka-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">☀️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <p className="sst-banner-subtitle">Let's keep our kitchen running smoothly today</p>
            </div>
          </div>
        </div>

        {/* Kitchen 7-tab nav */}
        <nav className="kd-nav">
          <div className="kd-nav-inner">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`kd-tab ${id === 'analytics' ? 'active' : ''}`}
                onClick={() => handleTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* KPI stat cards */}
        <div className="ka-kpis">
          {kpis.map((k) => (
            <div key={k.label} className="ka-kpi-card">
              <div className="ka-kpi-head">
                <span className="ka-kpi-emoji" role="img" aria-hidden="true">{k.emoji}</span>
                <span className="ka-kpi-label">{k.label}</span>
              </div>
              <p className={`ka-kpi-value ${k.label === 'Top Item' ? 'ka-kpi-value-sm' : ''}`}>{k.value}</p>
              {k.trendEmoji ? (
                <div className="ka-kpi-trend">{k.trendEmoji}</div>
              ) : (
                <p className="ka-kpi-sub">{k.sub}</p>
              )}
            </div>
          ))}
        </div>

        {/* Waste Reduction Goals */}
        <section className="ka-goals-card">
          <div className="ka-goals-head">
            <div className="ka-goals-title-wrap">
              <div className="ka-goals-icon-tile">
                <IconTarget className="ka-goals-icon" />
              </div>
              <h3 className="ka-goals-title">Waste Reduction Goals</h3>
            </div>
            {canManage && (
              <button className="ka-goals-edit" type="button" aria-label="Edit goals" onClick={handleEditGoals}>
                <IconPenLine className="ka-goals-edit-icon" />
              </button>
            )}
          </div>

          <div className="ka-goals-body">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.value / g.target) * 100));
              return (
                <div key={g.label} className="ka-goal">
                  <div className="ka-goal-row">
                    <div className="ka-goal-label-wrap">
                      <h4 className="ka-goal-label">{g.label}</h4>
                      <IconCheckCircle className="ka-goal-check" />
                    </div>
                    <div className="ka-goal-amounts">
                      <p className="ka-goal-amount">
                        ${g.value.toFixed(2)} <span className="ka-goal-target">/ ${g.target.toFixed(2)}</span>
                      </p>
                      <p className="ka-goal-percent">{pct}% of goal</p>
                    </div>
                  </div>
                  <div className="ka-goal-track">
                    <div className="ka-goal-fill" style={{ width: `${pct}%` }}></div>
                  </div>
                  {g.vsYesterday != null && (
                    <div className="ka-goal-trend">
                      <IconTrendingDown className="ka-goal-trend-icon" />
                      <span className="ka-goal-trend-text">{g.vsYesterday}% vs yesterday</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sub-tab bar + range selector */}
        <section className="ka-main-card">
          <div className="ka-subtabs-wrap">
            <div className="ka-subtabs">
              {SUB_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`ka-subtab ${activeSubTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveSubTab(t.id)}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ka-range-row">
            <div className="ka-range-select-wrap">
              <select
                className="ka-range-select"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                {RANGE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <IconChevronDown className="ka-range-chev" />
            </div>
          </div>

          {/* Panels */}
          {activeSubTab === 'overview' ? (
            <div className="ka-overview-grid">
              {/* Line chart */}
              <div className="ka-panel">
                <div className="ka-panel-head">
                  <div className="ka-panel-title">
                    <span role="img" aria-hidden="true">📈</span>
                    <p>Daily Waste Trend</p>
                  </div>
                  <div className="ka-panel-head-right">
                    <p className="ka-panel-head-sub">{range}</p>
                    <p className="ka-panel-head-total">${trendTotal.toFixed(2)}</p>
                  </div>
                </div>
                <div className="ka-chart-wrap">
                  <LineChart data={trendPoints.length ? trendPoints : [{ label: '—', y: 0 }]} />
                </div>
              </div>

              {/* Top Wasted Items */}
              <div className="ka-panel">
                <div className="ka-panel-head">
                  <div className="ka-panel-title">
                    <span role="img" aria-hidden="true">🔝</span>
                    <p>Top Wasted Items</p>
                  </div>
                </div>
                <div className="ka-top-list">
                  {topItems.length === 0 && (
                    <p style={{ padding: 12, color: '#6b7280', fontSize: 14 }}>
                      {isLoading ? 'Loading…' : 'No waste logged in this range yet.'}
                    </p>
                  )}
                  {topItems.map((item, idx) => {
                    // Generate colors from a palette so first-rendered items get distinct dots.
                    const palette = ['#E51636', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
                    const color = palette[idx % palette.length];
                    return (
                      <button key={item.id} type="button" className="ka-top-row">
                        <span className="ka-top-dot" style={{ backgroundColor: color }}></span>
                        <div className="ka-top-text">
                          <p className="ka-top-name">{item.emoji ? `${item.emoji} ` : ''}{item.name}</p>
                          <p className="ka-top-items">{item.items} items</p>
                        </div>
                        <div className="ka-top-right">
                          <p className="ka-top-cost">${Number(item.cost || 0).toFixed(2)}</p>
                          <p className="ka-top-pct">{item.pct}%</p>
                        </div>
                        <IconChevronDown className="ka-top-chev" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="ka-empty-panel">
              <span role="img" aria-hidden="true" className="ka-empty-emoji">📊</span>
              <p className="ka-empty-title">{SUB_TABS.find((t) => t.id === activeSubTab)?.label} view</p>
              <p className="ka-empty-sub">Analytics for this view are coming soon.</p>
            </div>
          )}
        </section>
      </div>

      {/* ---- Edit Goals modal ---- */}
      <FormModal
        isOpen={!!goalsModal}
        title="Edit Waste Reduction Goals"
        submitLabel="Save Goals"
        size="sm"
        onClose={() => setGoalsModal(null)}
        onSubmit={submitGoals}
        errorMessage={goalsError}
      >
        <NumberField
          label="Daily Goal ($)"
          value={goalsModal?.daily ?? ''}
          onChange={(v) => setGoalsModal((m) => m && ({ ...m, daily: v }))}
          placeholder="e.g. 100"
          step="1"
          required
          autoFocus
        />
        <NumberField
          label="Weekly Goal ($)"
          value={goalsModal?.weekly ?? ''}
          onChange={(v) => setGoalsModal((m) => m && ({ ...m, weekly: v }))}
          placeholder="e.g. 600"
          step="1"
          required
        />
        <NumberField
          label="Monthly Goal ($)"
          value={goalsModal?.monthly ?? ''}
          onChange={(v) => setGoalsModal((m) => m && ({ ...m, monthly: v }))}
          placeholder="e.g. 2500"
          step="1"
          required
        />
      </FormModal>
    </div>
  );
};

export default KitchenAnalytics;
