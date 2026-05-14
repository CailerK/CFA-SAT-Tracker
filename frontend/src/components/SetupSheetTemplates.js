import React, { useState, useEffect, useCallback } from 'react';
import './SetupSheetTemplates.css';
import setupSheetsService from '../services/setupSheets';

// Format an ISO datetime like "2026-04-18T18:32:11.244Z" → "Apr 18, 2026"
const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return ''; }
};

// Icon components (Lucide-matching)
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

const IconLayers = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
  </svg>
);

const IconClock = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconMoreVertical = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="1"/>
    <circle cx="12" cy="5" r="1"/>
    <circle cx="12" cy="19" r="1"/>
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

const SetupSheetTemplates = ({ onBack, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const res = await setupSheetsService.listTemplates();
      const rows = res.results || res || [];
      setTemplates(rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        updatedAt: formatDate(r.updated_at),
        timeBlocks: r.time_blocks_count || 0,
      })));
    } catch (err) {
      console.error('Failed to load setup templates:', err);
    }
  }, []);

  // Load templates from the backend on mount.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const tabs = [
    { id: 'templates', label: 'Templates', Icon: IconLayoutDashboard },
    { id: 'new', label: 'New', Icon: IconPlus },
    { id: 'saved', label: 'Saved', Icon: IconCalendar },
    { id: 'summary', label: 'Summary', Icon: IconFileText },
    { id: 'history', label: 'History', Icon: IconHistory },
  ];

  const handleCreateTemplate = () => {
    // Open the full-page create flow (pixel-match of LD Growth's
    // "Configure Your Template"). Replaces the old window.prompt UX.
    if (onNavigate) {
      onNavigate('setup-sheet-template-new');
    }
  };

  const handleEditTemplate = (template) => {
    // Open the full Edit Template page (pixel-match of LD Growth's
    // "Configure Your Template"). The id is threaded through the URL hash so
    // a refresh lands you back on the same template.
    if (onNavigate) {
      onNavigate('setup-sheet-template-edit', { templateId: template.id });
    }
  };

  const handleDeleteTemplate = async (template) => {
    const confirmed = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmed) return;
    try {
      await setupSheetsService.deleteTemplate(template.id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete setup template:', err);
    }
  };

  const handleTabClick = (tabId) => {
    if (tabId === 'history') {
      onNavigate && onNavigate('shift-summary-history');
    } else if (tabId === 'summary') {
      onNavigate && onNavigate('shift-summary');
    } else if (tabId === 'new') {
      handleCreateTemplate();
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="sst-page">
      <div className="sst-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="sst-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#sst-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">☀️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">Demo User!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <p className="sst-banner-subtitle">Create and manage templates for your weekly setup sheets</p>
            </div>
          </div>
        </div>

        {/* Sub-nav + New button row */}
        <div className="sst-toolbar">
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

          <button type="button" className="sst-new-btn" onClick={handleCreateTemplate}>
            <IconPlus className="sst-new-btn-icon" />
            New Template
          </button>
        </div>

        {/* Templates Grid */}
        <div className="sst-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className="sst-card"
              onClick={() => handleEditTemplate(template)}
            >
              <div className="sst-card-top-bar" aria-hidden="true"></div>

              <div className="sst-card-inner">
                <div className="sst-card-header">
                  <div className="sst-card-icon">
                    <IconLayers className="sst-card-icon-svg" />
                  </div>
                  <button
                    className="sst-card-menu"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template);
                    }}
                    aria-label="Template options"
                  >
                    <IconMoreVertical className="sst-card-menu-icon" />
                  </button>
                </div>

                <h3 className="sst-card-title">{template.name}</h3>

                <div className="sst-card-meta">
                  <IconCalendar className="sst-card-meta-icon" />
                  Updated {template.updatedAt}
                </div>

                <div className="sst-card-footer">
                  <div className="sst-card-footer-left">
                    <div className="sst-card-footer-icon">
                      <IconClock className="sst-card-footer-icon-svg" />
                    </div>
                    <span className="sst-card-footer-label">Time Blocks</span>
                  </div>
                  <span className="sst-card-footer-count">{template.timeBlocks}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetupSheetTemplates;
