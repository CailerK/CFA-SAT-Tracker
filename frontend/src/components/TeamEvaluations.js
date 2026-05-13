import React, { useState } from 'react';
import './SetupSheetTemplates.css'; // shared red hero banner
import './TeamEvaluations.css';

// ===== Icons =====
const IconUsers = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconCalendarClock = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg>);
const IconFileText = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>);
const IconBuilding = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const MAIN_TABS = [
  { id: 'evaluations', label: 'Evaluations', Icon: IconUsers },
  { id: 'scheduled',   label: 'Scheduled',   Icon: IconCalendarClock },
  { id: 'templates',   label: 'Templates',   Icon: IconFileText },
  { id: 'analytics',   label: 'Analytics',   Icon: IconBarChart },
];

const SUB_TABS = [
  { id: 'team-overview',   label: 'Team Overview',   Icon: IconUsers },
  { id: 'all-evaluations', label: 'All Evaluations', Icon: IconBuilding },
];

const TeamEvaluations = ({ user }) => {
  const [activeTab, setActiveTab] = useState('evaluations');
  const [activeSubTab, setActiveSubTab] = useState('team-overview');

  return (
    <div className="sst-page">
      <div className="sst-container te-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="te-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#te-hero-pattern)" />
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
              <p className="sst-banner-subtitle">Excellence in every evaluation</p>
            </div>
          </div>
        </div>

        {/* 4-tab main nav */}
        <div className="te-tab-wrap">
          <div className="te-tabs">
            {MAIN_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`te-tab ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <Icon className="te-tab-icon" />
                <span className="te-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tab pill selector */}
        <div className="te-subtabs">
          {SUB_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`te-subtab ${activeSubTab === id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(id)}
            >
              <Icon className="te-subtab-icon" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Empty state card */}
        <div className="te-empty-card">
          <div className="te-empty-icon-wrap">
            <IconUsers className="te-empty-icon" />
          </div>
          <h2 className="te-empty-title">No Team Members</h2>
          <p className="te-empty-text">You don't have any direct reports assigned to you yet.</p>
        </div>
      </div>
    </div>
  );
};

export default TeamEvaluations;
