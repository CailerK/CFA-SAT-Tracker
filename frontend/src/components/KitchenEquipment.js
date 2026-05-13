import React, { useState, useMemo } from 'react';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenEquipment.css';

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconCalendarDays = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>);
const IconSettings = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconPlus = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);
const IconFlame = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
const IconBeef = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/></svg>);
const IconHistory = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>);
const IconBrush = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>);
const IconAlertCircle = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>);
const IconPencil = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// ===== DEMO DATA (see FAKE_DATA.md) =====
const CATEGORIES = [
  { id: 'hvac', label: 'hvac', emoji: '📦', count: 4 },
  { id: 'cleaning', label: 'cleaning', emoji: '🧽', count: 4 },
  { id: 'pos_tech', label: 'pos tech', emoji: '📦', count: 4 },
  { id: 'safety', label: 'safety', emoji: '📦', count: 4 },
  { id: 'cooking', label: 'cooking', emoji: '🔥', count: 4 },
  { id: 'refrigeration', label: 'refrigeration', emoji: '❄️', count: 4 },
  { id: 'preparation', label: 'preparation', emoji: '🔪', count: 0 },
  { id: 'beverage', label: 'beverage', emoji: '🥤', count: 0 },
];

const EQUIPMENT_BY_CATEGORY = {
  cooking: [
    {
      id: 'primary_fryers',
      name: 'Primary Fryers',
      icon: 'flame',
      status: 'OK',
      schedule: { task: 'boil out', cadence: 'weekly', date: 'Apr 21', urgency: 'Soon' },
    },
    { id: 'secondary_fryers', name: 'Secondary Fryers', icon: 'flame', status: 'OK', schedule: null },
    { id: 'grills', name: 'Grills', icon: 'beef', status: 'OK', schedule: null },
    { id: 'pressure_fryers', name: 'Pressure Fryers', icon: 'flame', status: 'OK', schedule: null },
  ],
  hvac: [],
  cleaning: [],
  pos_tech: [],
  safety: [],
  refrigeration: [],
  preparation: [],
  beverage: [],
};

const EquipIcon = ({ type, className }) => {
  switch (type) {
    case 'beef': return <IconBeef className={className} />;
    case 'flame':
    default: return <IconFlame className={className} />;
  }
};

const KitchenEquipment = ({ onNavigate, user }) => {
  const [activeCategory, setActiveCategory] = useState('cooking');

  const tabs = [
    { id: 'home', label: 'Home', Icon: IconLayoutDashboard },
    { id: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { id: 'equip', label: 'Equip', Icon: IconWrench },
    { id: 'safety', label: 'Safety', Icon: IconShieldCheck },
    { id: 'clean', label: 'Clean', Icon: IconSparkles },
    { id: 'lists', label: 'Lists', Icon: IconClipboardList },
    { id: 'waste', label: 'Waste', Icon: IconTrash },
  ];

  const handleKitchenTabClick = (id) => {
    if (!onNavigate) return;
    switch (id) {
      case 'home': return onNavigate('kitchen');
      case 'analytics': return onNavigate('kitchen-analytics');
      case 'safety': return onNavigate('kitchen-safety');
      case 'clean': return onNavigate('kitchen-cleaning');
      case 'lists': return onNavigate('kitchen-checklists');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  const equipment = useMemo(() => EQUIPMENT_BY_CATEGORY[activeCategory] || [], [activeCategory]);

  const runningTotal = 24;
  const runningOf = 24;
  const runningPct = Math.round((runningTotal / runningOf) * 100);

  return (
    <div className="sst-page">
      <div className="sst-container kd-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ke-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ke-hero-pattern)" />
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
                className={`kd-tab ${id === 'equip' ? 'active' : ''}`}
                onClick={() => handleKitchenTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Summary toolbar */}
        <div className="ke-toolbar">
          <div className="ke-toolbar-running">
            <span className="ke-running-count">
              <span className="ke-running-num">{runningTotal}/{runningOf}</span>
              <span className="ke-running-label">running</span>
            </span>
            <div className="ke-running-track">
              <div className="ke-running-fill" style={{ width: `${runningPct}%` }}></div>
            </div>
          </div>
          <div className="ke-toolbar-actions">
            <button type="button" className="ke-toolbar-btn" aria-label="Upcoming tasks">
              <IconCalendarDays className="ke-toolbar-btn-icon" />
              <span className="ke-badge">1</span>
            </button>
            <button type="button" className="ke-toolbar-btn" aria-label="Manage equipment">
              <IconSettings className="ke-toolbar-btn-icon" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="ke-cats-wrap">
          <div className="ke-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ke-cat ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                <span className="ke-cat-emoji" role="img" aria-hidden="true">{c.emoji}</span>
                <span className="ke-cat-label">{c.label}</span>
                <span className="ke-cat-count">{c.count}</span>
              </button>
            ))}
            <button type="button" className="ke-cat ke-cat-add">
              <IconPlus className="ke-cat-add-icon" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Equipment grid */}
        <div className="ke-grid-wrap">
          {equipment.length === 0 ? (
            <div className="ke-empty">
              <p className="ke-empty-title">No equipment in this category yet</p>
              <p className="ke-empty-sub">Add equipment to start tracking maintenance and cleaning.</p>
            </div>
          ) : (
            <div className="ke-grid">
              {equipment.map((eq) => (
                <article key={eq.id} className="ke-card">
                  <div className="ke-card-head">
                    <div className="ke-card-icon">
                      <EquipIcon type={eq.icon} className="ke-card-icon-svg" />
                    </div>
                    <div className="ke-card-name-wrap">
                      <h3 className="ke-card-name">{eq.name}</h3>
                    </div>
                    <span className="ke-status-pill">{eq.status}</span>
                  </div>

                  {eq.schedule ? (
                    <div className="ke-schedule">
                      <div className="ke-schedule-row">
                        <IconWrench className="ke-schedule-icon" />
                        <div className="ke-schedule-meta">
                          <span className="ke-schedule-task">{eq.schedule.task}</span>
                          <span className="ke-schedule-dot">·</span>
                          <span className="ke-schedule-sub">{eq.schedule.cadence}</span>
                          <span className="ke-schedule-dot">·</span>
                          <span className="ke-schedule-sub">{eq.schedule.date}</span>
                          <span className="ke-schedule-urgency">{eq.schedule.urgency}</span>
                        </div>
                        <div className="ke-schedule-actions">
                          <button className="ke-schedule-mini" type="button" aria-label="Edit">
                            <IconPencil className="ke-schedule-mini-icon" />
                          </button>
                          <button className="ke-schedule-mini ke-schedule-mini-delete" type="button" aria-label="Delete">
                            <IconTrash className="ke-schedule-mini-icon" />
                          </button>
                          <button className="ke-schedule-done" type="button">Done</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="ke-no-schedule">No schedules set up</p>
                  )}

                  <div className="ke-card-actions">
                    <button type="button" className="ke-action ke-action-gray" aria-label="View history">
                      <IconHistory className="ke-action-icon" /> <span>History</span>
                    </button>
                    <button type="button" className="ke-action ke-action-amber" aria-label="Add maintenance">
                      <IconWrench className="ke-action-icon" /> <span>Maint.</span>
                    </button>
                    <button type="button" className="ke-action ke-action-blue" aria-label="Add cleaning">
                      <IconBrush className="ke-action-icon" /> <span>Clean</span>
                    </button>
                    <button type="button" className="ke-action ke-action-red" aria-label="Report issue">
                      <IconAlertCircle className="ke-action-icon" /> <span>Issue</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KitchenEquipment;
