import React, { useState, useEffect } from 'react';
import kitchenService from '../services/kitchen';
import './SetupSheetTemplates.css'; // reuse sst-banner/tabs (container too)
import './KitchenDashboard.css';

// ===== Icons =====
const IconLayoutDashboard = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1"/>
    <rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/>
    <rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);
const IconBarChart = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" x2="18" y1="20" y2="10"/>
    <line x1="12" x2="12" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="14"/>
  </svg>
);
const IconWrench = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
);
const IconShieldCheck = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);
const IconSparkles = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
    <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);
const IconClipboardList = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
  </svg>
);
const IconTrash = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/>
    <line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);
const IconChefHat = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
    <line x1="6" x2="18" y1="17" y2="17"/>
  </svg>
);
const IconChevronRight = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
const IconAlertCircle = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" x2="12" y1="8" y2="12"/>
    <line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Default skeleton used while the summary endpoint is loading.
const DEFAULT_PROGRESS = { overall: 0, opening: 0, transition: 0, closing: 0 };
const DEFAULT_CARDS = [
  { id: 'food-safety', title: 'Food Safety', emoji: '🛡️',
    stats: [{ label: 'Checklists', value: '—' }, { label: 'Temp Checks', value: '—' }],
    progress: 0, page: 'kitchen-safety' },
  { id: 'waste', title: 'Waste Tracker', emoji: '🗑️',
    stats: [{ label: "Today's Waste", value: '$0.00' }, { label: 'Items Tracked', value: '0' }],
    progress: 0, page: 'kitchen-waste' },
  { id: 'equipment', title: 'Equipment Status', emoji: '🔧',
    stats: [{ label: 'Operational', value: '—' }, { label: 'Needs Work', value: '—' }],
    progress: 0, page: 'kitchen-equipment' },
  { id: 'checklists', title: 'Shift Checklists', emoji: '📋',
    stats: [{ label: 'Completed', value: '0/0' }, { label: 'Rate', value: '0%' }],
    progress: 0, page: 'kitchen-checklists' },
];

const KitchenDashboard = ({ onNavigate, user }) => {
  const [activeTab] = useState('home');
  const [progressData, setProgressData] = useState(DEFAULT_PROGRESS);
  const [cards, setCards] = useState(DEFAULT_CARDS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await kitchenService.getSummary();
        if (cancelled) return;
        if (summary.progress) setProgressData(summary.progress);
        if (Array.isArray(summary.cards) && summary.cards.length) {
          setCards(summary.cards);
        }
      } catch (err) {
        console.error('Failed to load kitchen summary:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tabs = [
    { id: 'home', label: 'Home', Icon: IconLayoutDashboard },
    { id: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { id: 'equip', label: 'Equip', Icon: IconWrench },
    { id: 'safety', label: 'Safety', Icon: IconShieldCheck },
    { id: 'clean', label: 'Clean', Icon: IconSparkles },
    { id: 'lists', label: 'Lists', Icon: IconClipboardList },
    { id: 'waste', label: 'Waste', Icon: IconTrash },
  ];

  const handleTabClick = (tabId) => {
    if (!onNavigate) return;
    switch (tabId) {
      case 'analytics': return onNavigate('kitchen-analytics');
      case 'equip': return onNavigate('kitchen-equipment');
      case 'safety': return onNavigate('kitchen-safety');
      case 'clean': return onNavigate('kitchen-cleaning');
      case 'lists': return onNavigate('kitchen-checklists');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  // progressData and cards now come from /api/kitchen/summary/ (see useEffect above).

  return (
    <div className="sst-page">
      <div className="sst-container kd-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="kd-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kd-hero-pattern)" />
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

        {/* 7-tab nav (horizontal scroll on mobile) */}
        <nav className="kd-nav">
          <div className="kd-nav-inner">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`kd-tab ${activeTab === id ? 'active' : ''}`}
                onClick={() => handleTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Today's Progress */}
        <div className="kd-progress-card">
          <div className="kd-progress-head">
            <div className="kd-progress-title">
              <IconChefHat className="kd-progress-title-icon" />
              <h2 className="kd-progress-title-text">Today's Progress</h2>
            </div>
            <span className="kd-progress-percent">{progressData.overall}%</span>
          </div>
          <div className="kd-progress-track">
            <div
              className="kd-progress-fill"
              style={{ width: `${progressData.overall}%` }}
            ></div>
          </div>
          <div className="kd-progress-legend">
            <span>🌅 {progressData.opening}%</span>
            <span>🔄 {progressData.transition}%</span>
            <span>🌙 {progressData.closing}%</span>
          </div>
        </div>

        {/* 4 Module Cards */}
        <div className="kd-cards-grid">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              className="kd-card"
              onClick={() => onNavigate && onNavigate(card.page)}
            >
              <div className="kd-card-head">
                <div className="kd-card-icon-tile">
                  <span className="kd-card-icon-emoji" role="img" aria-hidden="true">
                    {card.emoji}
                  </span>
                </div>
                <div className="kd-card-head-text">
                  <h3 className="kd-card-title">{card.title}</h3>
                  {card.attentionLabel && (
                    <span className="kd-card-attention">{card.attentionLabel}</span>
                  )}
                </div>
                <IconChevronRight className="kd-card-chevron" />
              </div>

              <div className="kd-card-stats">
                {card.stats.map((stat, i) => (
                  <div key={i} className="kd-card-stat">
                    <p className="kd-stat-label">{stat.label}</p>
                    <p className="kd-stat-value">{stat.value}</p>
                    <p className="kd-stat-sublabel">{stat.sublabel}</p>
                  </div>
                ))}
              </div>

              {card.alert && (
                <div className="kd-card-alert-wrap">
                  <div className="kd-card-alert">
                    <IconAlertCircle className="kd-card-alert-icon" />
                    <span className="kd-card-alert-text">{card.alert}</span>
                  </div>
                </div>
              )}

              <div className="kd-card-footer-track">
                <div
                  className={`kd-card-footer-fill ${card.progress === 100 ? 'full' : 'partial'}`}
                  style={{ width: `${card.progress}%` }}
                ></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KitchenDashboard;
