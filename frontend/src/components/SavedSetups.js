import React, { useState, useMemo, useEffect } from 'react';
import './SetupSheetTemplates.css'; // reuse banner + tab styles
import './SavedSetups.css';
import setupSheetsService from '../services/setupSheets';
import teamService from '../services/team';

// "2026-05-13T17:30Z" → "Updated 12 minutes ago" — quick relative-time helper.
const relativeTime = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'Updated just now';
  if (min < 60) return `Updated ${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `Updated ${hr} hour${hr === 1 ? '' : 's'} ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  return `Updated ${new Date(iso).toLocaleDateString()}`;
};

// Icons
const IconLayoutDashboard = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1"/>
    <rect width="7" height="5" x="14" y="3" rx="1"/>
    <rect width="7" height="9" x="14" y="12" rx="1"/>
    <rect width="7" height="5" x="3" y="16" rx="1"/>
  </svg>
);

const IconPlus = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14"/>
    <path d="M12 5v14"/>
  </svg>
);

const IconCalendar = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8 2v4"/>
    <path d="M16 2v4"/>
    <rect width="18" height="18" x="3" y="4" rx="2"/>
    <path d="M3 10h18"/>
  </svg>
);

const IconFileText = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
    <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
    <path d="M10 9H8"/>
    <path d="M16 13H8"/>
    <path d="M16 17H8"/>
  </svg>
);

const IconHistory = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M12 7v5l4 2"/>
  </svg>
);

const IconSearch = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.3-4.3"/>
  </svg>
);

const IconArrowUpDown = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m21 16-4 4-4-4"/>
    <path d="M17 20V4"/>
    <path d="m3 8 4-4 4 4"/>
    <path d="M7 4v16"/>
  </svg>
);

const IconShare2 = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>
    <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>
  </svg>
);

const IconMoreVertical = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="1"/>
    <circle cx="12" cy="5" r="1"/>
    <circle cx="12" cy="19" r="1"/>
  </svg>
);

const IconUser = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconUsers = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconMapPin = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconClock = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getCurrentDate = () => {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

const SavedSetups = ({ onNavigate, user }) => {
  const [activeTab] = useState('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedSetups, setSavedSetups] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const refresh = async () => {
    try {
      const res = await setupSheetsService.listSheets();
      const rows = res.results || res || [];
      setSavedSetups(rows.map((r) => ({
        id: r.id,
        name: r.name,
        weekRange: r.week_range || '',
        isShared: Boolean(r.is_shared),
        owner: r.owner_name || '',
        employees: r.employees_count || 0,
        areas: r.areas_count || 0,
        hours: Number(r.hours || 0),
        updatedAt: relativeTime(r.updated_at),
      })));
    } catch (err) {
      console.error('Failed to load saved setups:', err);
    }
  };

  // Load from backend on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sheetsRes, membersRes] = await Promise.all([
          setupSheetsService.listSheets(),
          teamService.listMembers({ status: 'active' }),
        ]);
        if (cancelled) return;
        const rows = sheetsRes.results || sheetsRes || [];
        setSavedSetups(rows.map((r) => ({
          id: r.id,
          name: r.name,
          weekRange: r.week_range || '',
          isShared: Boolean(r.is_shared),
          owner: r.owner_name || '',
          employees: r.employees_count || 0,
          areas: r.areas_count || 0,
          hours: Number(r.hours || 0),
          updatedAt: relativeTime(r.updated_at),
        })));
        const memberRows = membersRes.results || membersRes || [];
        setTeamMembers(memberRows.map((member) => ({
          id: member.id,
          name: member.name || member.email,
        })));
      } catch (err) {
        console.error('Failed to load saved setup reference data:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tabs = [
    { id: 'templates', label: 'Templates', Icon: IconLayoutDashboard },
    { id: 'new', label: 'New', Icon: IconPlus },
    { id: 'saved', label: 'Saved', Icon: IconCalendar },
    { id: 'summary', label: 'Summary', Icon: IconFileText },
    { id: 'history', label: 'History', Icon: IconHistory },
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'templates') onNavigate && onNavigate('setup-sheet-templates');
    else if (tabId === 'new') onNavigate && onNavigate('setup-sheet-builder');
    else if (tabId === 'summary') onNavigate && onNavigate('shift-summary');
    else if (tabId === 'history') onNavigate && onNavigate('shift-summary-history');
  };

  const filteredSetups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return savedSetups;
    return savedSetups.filter((s) => s.name.toLowerCase().includes(q));
  }, [savedSetups, searchQuery]);

  const handleDuplicateSetup = async (setup) => {
    try {
      await setupSheetsService.duplicateSheet(setup.id);
      await refresh();
    } catch (err) {
      console.error('Failed to duplicate setup sheet:', err);
    }
  };

  const handleDeleteSetup = async (setup) => {
    const confirmed = window.confirm(`Delete "${setup.name}"?`);
    if (!confirmed) return;
    try {
      await setupSheetsService.deleteSheet(setup.id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete setup sheet:', err);
    }
  };

  const handleShareSetup = async (setup) => {
    if (!teamMembers.length) return;
    const person = window.prompt(`Share "${setup.name}" with which team member?\n${teamMembers.map((member) => member.name).join('\n')}`);
    if (!person?.trim()) return;
    const member = teamMembers.find((item) => item.name.toLowerCase() === person.trim().toLowerCase());
    if (!member) return;
    try {
      await setupSheetsService.shareSheet(setup.id, { user_id: member.id, permission: 'view' });
      await refresh();
    } catch (err) {
      console.error('Failed to share setup sheet:', err);
    }
  };

  const handleCardAction = async (setup) => {
    const action = window.prompt('Type duplicate, share, or delete', 'duplicate');
    if (!action) return;
    if (action.toLowerCase() === 'share') {
      await handleShareSetup(setup);
      return;
    }
    if (action.toLowerCase() === 'delete') {
      await handleDeleteSetup(setup);
      return;
    }
    await handleDuplicateSetup(setup);
  };

  return (
    <div className="sst-page">
      <div className="sst-container">
        {/* Red Hero Banner (reused from templates) */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="ss-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ss-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">☀️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo User'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <p className="sst-banner-subtitle">View and manage your saved weekly setup sheets</p>
            </div>
          </div>
        </div>

        {/* Sub-nav (reused from templates) */}
        <nav className="sst-tabs">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`sst-tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => handleTabClick(id)}
            >
              <Icon className="sst-tab-icon" />
              <span className="sst-tab-label">{label}</span>
            </button>
          ))}
        </nav>

        {/* Search + Sort toolbar */}
        <div className="ss-toolbar">
          <div className="ss-search-wrap">
            <IconSearch className="ss-search-icon" />
            <input
              type="text"
              className="ss-search-input"
              placeholder="Search by setup name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="button" className="ss-sort-btn">
            <IconArrowUpDown className="ss-sort-icon" />
            <span className="ss-sort-label-full">Sort by Date</span>
            <span className="ss-sort-label-short">Date</span>
          </button>
        </div>

        {/* Count */}
        <div className="ss-count">
          Showing <span className="ss-count-num">{filteredSetups.length}</span> setup{filteredSetups.length !== 1 ? 's' : ''}
        </div>

        {/* Grid */}
        <div className="ss-grid">
          {filteredSetups.map((setup) => (
            <div
              key={setup.id}
              className="ss-card"
              role="button"
              tabIndex={0}
              onClick={() => handleDuplicateSetup(setup)}
            >
              {/* Red gradient header */}
              <div className="ss-card-header">
                <div className="ss-card-header-left">
                  <div className="ss-card-header-icon">
                    <IconCalendar className="ss-card-header-icon-svg" />
                  </div>
                  <div className="ss-card-header-text">
                    <div className="ss-card-title-row">
                      <h3 className="ss-card-title">{setup.name}</h3>
                      {setup.isShared && (
                        <span className="ss-shared-pill">
                          <IconShare2 className="ss-shared-pill-icon" />
                          Shared
                        </span>
                      )}
                    </div>
                    <p className="ss-card-range">{setup.weekRange}</p>
                  </div>
                </div>
                <button
                  className="ss-card-menu"
                  type="button"
                  aria-label="Setup options"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardAction(setup);
                  }}
                >
                  <IconMoreVertical className="ss-card-menu-icon" />
                </button>
              </div>

              {/* White body */}
              <div className="ss-card-body">
                <div className="ss-card-owner">
                  <IconUser className="ss-card-owner-icon" />
                  <span className="ss-card-owner-name">{setup.owner}</span>
                </div>

                <div className="ss-card-stats">
                  <div className="ss-stat">
                    <div className="ss-stat-icon-wrap">
                      <IconUsers className="ss-stat-icon" />
                    </div>
                    <p className="ss-stat-value">{setup.employees}</p>
                    <p className="ss-stat-label">Employees</p>
                  </div>
                  <div className="ss-stat ss-stat-middle">
                    <div className="ss-stat-icon-wrap">
                      <IconMapPin className="ss-stat-icon" />
                    </div>
                    <p className="ss-stat-value">{setup.areas}</p>
                    <p className="ss-stat-label">Areas</p>
                  </div>
                  <div className="ss-stat">
                    <div className="ss-stat-icon-wrap">
                      <IconClock className="ss-stat-icon" />
                    </div>
                    <p className="ss-stat-value">{setup.hours}</p>
                    <p className="ss-stat-label">Hours</p>
                  </div>
                </div>

                <div className="ss-card-updated">{setup.updatedAt}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SavedSetups;
