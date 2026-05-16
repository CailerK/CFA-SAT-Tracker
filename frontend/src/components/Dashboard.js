import React, { useState, useRef, useEffect, useCallback } from 'react';
import './Dashboard.css';
import Sidebar from './Sidebar';
import QuickActions from './QuickActions';
import CustomizeInsightsModal, { AVAILABLE_INSIGHT_CARDS, getInsightById } from './CustomizeInsightsModal';
import CustomizeActionsModal from './CustomizeActionsModal';
import NotificationDropdown from './NotificationDropdown';
import notificationService from '../services/notifications';
import preferencesService from '../services/preferences';
import dashboardService from '../services/dashboard';
import FOHTasks from './FOHTasks';
import CleaningMaintenance from './CleaningMaintenance';
import WeeklyDigest from './WeeklyDigest';
import TeamChat from './TeamChat';
import Calendar from './Calendar';
import GuestRecovery from './GuestRecovery';
import Vendors from './Vendors';
import Settings from './Settings';
import SetupSheetTemplates from './SetupSheetTemplates';
import SetupSheetTemplateEdit from './SetupSheetTemplateEdit';
import SetupSheetBuilder from './SetupSheetBuilder';
import SavedSetups from './SavedSetups';
import ShiftSummary from './ShiftSummary';
import ShiftSummaryHistory from './ShiftSummaryHistory';
import KitchenDashboard from './KitchenDashboard';
import KitchenAnalytics from './KitchenAnalytics';
import KitchenEquipment from './KitchenEquipment';
import KitchenFoodSafety from './KitchenFoodSafety';
import KitchenCleaning from './KitchenCleaning';
import KitchenChecklists from './KitchenChecklists';
import KitchenWasteTracker from './KitchenWasteTracker';
import TeamMembers from './TeamMembers';
import TeamDocumentation from './TeamDocumentation';
import TeamEvaluations from './TeamEvaluations';
import TeamSurveys from './TeamSurveys';
import TeamTraining from './TeamTraining';
import TeamQuickLinks from './TeamQuickLinks';
import TeamDevelopment from './TeamDevelopment';
import LeadershipDevelopment from './LeadershipDevelopment';
import LeadershipDevPlans from './LeadershipDevPlans';
import LeadershipPlanDetail from './LeadershipPlanDetail';
import CultureLeadershipPlanTemplate from './CultureLeadershipPlanTemplate';
import Leadership360Evaluations from './Leadership360Evaluations';
import New360Evaluation from './New360Evaluation';

// Read the current page from the URL hash so browser refresh / back / forward
// preserve navigation state. Hash format: '#/settings' → 'settings'.
// Optionally, '#/page/:param' returns { page: 'page', param: ':param' } so
// detail pages (e.g. setup-sheet-template-edit) can keep their id on refresh.
const pageInfoFromHash = () => {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { page: 'dashboard', param: null };
  const [page, ...rest] = raw.split('/');
  return { page: page || 'dashboard', param: rest.length ? rest.join('/') : null };
};
const pageFromHash = () => pageInfoFromHash().page;
const paramFromHash = () => pageInfoFromHash().param;

const Dashboard = ({ user, onLogout }) => {
  const [currentPage, setCurrentPageRaw] = useState(pageFromHash);
  const [currentParam, setCurrentParam] = useState(paramFromHash);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);
  const notificationRef = useRef(null);
  
  // State for customize modals - MUST be declared before useEffect hooks that use them
  const [isCustomizeInsightsOpen, setIsCustomizeInsightsOpen] = useState(false);
  const [isCustomizeActionsOpen, setIsCustomizeActionsOpen] = useState(false);
  const [customInsights, setCustomInsights] = useState([]);
  const [customActions, setCustomActions] = useState([]);
  const [insightsValues, setInsightsValues] = useState({});
  const [insightsCatalog, setInsightsCatalog] = useState([]);

  // Wrap setCurrentPage so it also updates the URL hash. This way a refresh
  // lands on the same page instead of bouncing back to the dashboard.
  //
  // Sentinel: if the page string starts with '__not_implemented__:', show
  // a quick alert instead of routing. The portion after the colon is the
  // feature name used in the message.
  const setCurrentPage = useCallback((page, param = null) => {
    if (typeof page === 'string' && page.startsWith('__not_implemented__')) {
      const featureName = page.split(':')[1] || 'This feature';
      // eslint-disable-next-line no-alert
      alert(`${featureName} isn't implemented yet — coming soon.`);
      return;
    }
    setCurrentPageRaw(page);
    setCurrentParam(param);
    const targetHash =
      page === 'dashboard'
        ? ''
        : param != null
          ? `#/${page}/${param}`
          : `#/${page}`;
    if (window.location.hash !== targetHash) {
      // Use replaceState when targetHash is empty to avoid leaving '#' in the URL.
      if (targetHash) {
        window.location.hash = targetHash;
      } else {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    }
  }, []);

  // Sync component state when the user hits browser back/forward.
  useEffect(() => {
    const onHashChange = () => {
      const info = pageInfoFromHash();
      setCurrentPageRaw(info.page);
      setCurrentParam(info.param);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const toggleProfileDropdown = () => {
    setProfileDropdownOpen(prev => !prev);
  };

  const closeProfileDropdown = () => {
    setProfileDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setNotificationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load notification count on mount and periodically
  useEffect(() => {
    const loadNotificationCount = async () => {
      try {
        const data = await notificationService.getUnreadCount();
        setNotificationCount(data.unread_count || 0);
      } catch (error) {
        console.error('Failed to load notification count:', error);
      }
    };

    loadNotificationCount();
    // Poll every 30 seconds
    const interval = setInterval(loadNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load user preferences and insights on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await preferencesService.getPreferences();
        setCustomInsights(prefs.insight_ids || []);
        setCustomActions(prefs.quick_action_ids || []);
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };

    const loadInsightsCatalog = async () => {
      try {
        const data = await dashboardService.getInsightsCatalog();
        setInsightsCatalog(data.insights || []);
      } catch (error) {
        console.error('Failed to load insights catalog:', error);
      }
    };

    loadPreferences();
    loadInsightsCatalog();
  }, []);

  // Load insights values when customInsights changes
  useEffect(() => {
    if (customInsights.length > 0) {
      const loadInsightsValues = async () => {
        try {
          const data = await dashboardService.getInsightsValues(customInsights);
          setInsightsValues(data.values || {});
        } catch (error) {
          console.error('Failed to load insights values:', error);
        }
      };
      loadInsightsValues();
    }
  }, [customInsights]);

  // Get current date for greeting
  const getCurrentDate = () => {
    const options = { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('en-US', options);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="dashboard-container">
      {/* Navigation Header */}
      <div className="nav-header">
        <div className="nav-content">
          <div className="nav-left">
            <button className="company-button" onClick={() => setCurrentPage('dashboard')}>
              <div className="company-info">
                <span className="company-name">CFA I-410 & Rigsby</span>
              </div>
            </button>
            <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
          </div>
          <div className="nav-right">
            <div className="notification-container" ref={notificationRef}>
              <button 
                className="notification-button"
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
              >
                <svg className="notification-bell" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {notificationCount > 0 && (
                  <div className="notification-badge">{notificationCount}</div>
                )}
              </button>
              <NotificationDropdown
                isOpen={notificationDropdownOpen}
                onClose={() => setNotificationDropdownOpen(false)}
                onNavigate={(page) => {
                  setCurrentPage(page);
                  setNotificationDropdownOpen(false);
                }}
              />
            </div>
            <div className="profile-container" ref={profileDropdownRef}>
              <button className="profile-button" onClick={toggleProfileDropdown}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </button>
              {profileDropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-item" onClick={() => { setCurrentPage('weekly-digest'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    Weekly Digest
                  </div>
                  <div className="dropdown-item" onClick={() => { setCurrentPage('team-chat'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Team Chat
                  </div>
                  <div className="dropdown-item" onClick={() => { setCurrentPage('calendar'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Calendar
                  </div>
                  <div className="dropdown-item" onClick={() => { setCurrentPage('guest-recovery'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                    Guest Recovery
                  </div>
                  <div className="dropdown-item" onClick={() => { setCurrentPage('vendors'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Vendors
                  </div>
                  <div className="dropdown-divider"></div>
                  <div className="dropdown-item" onClick={() => { setCurrentPage('settings'); setProfileDropdownOpen(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                    Settings
                  </div>
                  <div className="dropdown-item logout-item" onClick={onLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16,17 21,12 16,7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content">
        {/* Red Header Banner - only on dashboard home */}
        {currentPage === 'dashboard' && (
          <div className="banner-wrapper">
            <div className="red-header-banner">
              <div className="banner-pattern" aria-hidden="true">
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                      <circle cx="16" cy="16" r="1.5" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-pattern)" />
                </svg>
              </div>
              <div className="banner-blur" aria-hidden="true"></div>
              <div className="banner-content">
                <div className="banner-top">
                  <span className="banner-emoji" role="img" aria-label="sun">☀️</span>
                  <div className="banner-text">
                    <h1 className="banner-greeting">
                      {getGreeting()}, <span className="banner-name">{user?.firstName || 'Demo User'}!</span>
                    </h1>
                    <p className="banner-date">{getCurrentDate()}</p>
                  </div>
                </div>
                <div className="banner-divider">
                  <span className="banner-line"></span>
                  <p className="banner-motivation">Let's make today remarkable</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentPage === 'foh' ? (
          <FOHTasks
            user={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'foh-cleaning' ? (
          <CleaningMaintenance
            user={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'weekly-digest' ? (
          <WeeklyDigest onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'team-chat' ? (
          <TeamChat user={user} onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'calendar' ? (
          <Calendar user={user} onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'guest-recovery' ? (
          <GuestRecovery onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'vendors' ? (
          <Vendors onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'settings' ? (
          <Settings onBack={() => setCurrentPage('dashboard')} currentUser={user} />
        ) : currentPage === 'setup-sheet-templates' ? (
          <SetupSheetTemplates 
            user={user}
            onBack={() => setCurrentPage('dashboard')} 
            onNavigate={(page, data) => setCurrentPage(page, data?.templateId ?? null)}
          />
        ) : currentPage === 'setup-sheet-template-edit' ? (
          <SetupSheetTemplateEdit
            templateId={currentParam}
            onBack={() => setCurrentPage('setup-sheet-templates')}
          />
        ) : currentPage === 'setup-sheet-template-new' ? (
          <SetupSheetTemplateEdit
            templateId={null}
            onBack={() => setCurrentPage('setup-sheet-templates')}
            onCreated={(id) => setCurrentPage('setup-sheet-template-edit', String(id))}
          />
        ) : currentPage === 'shift-summary' ? (
          <ShiftSummary 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'shift-summary-history' ? (
          <ShiftSummaryHistory 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'setup-sheet-builder' ? (
          <SetupSheetBuilder 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'saved-setups' ? (
          <SavedSetups 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen' ? (
          <KitchenDashboard 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-analytics' ? (
          <KitchenAnalytics 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-equipment' ? (
          <KitchenEquipment 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-safety' ? (
          <KitchenFoodSafety 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-cleaning' ? (
          <KitchenCleaning 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-checklists' ? (
          <KitchenChecklists 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'kitchen-waste' ? (
          <KitchenWasteTracker 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'team-members' ? (
          <TeamMembers 
            user={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'team-documentation' ? (
          <TeamDocumentation 
            user={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'team-evaluations' ? (
          <TeamEvaluations 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'team-surveys' ? (
          <TeamSurveys 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'team-training' ? (
          <TeamTraining 
            user={user}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'team-quick-links' ? (
          <TeamQuickLinks 
            user={user}
          />
        ) : currentPage === 'leadership-360' ? (
          <Leadership360Evaluations 
            user={user}
            onNavigate={(page) => setCurrentPage(page)}
          />
        ) : currentPage === 'new-360-evaluation' ? (
          <New360Evaluation 
            user={user}
            onBack={() => setCurrentPage('leadership-360')}
          />
        ) : currentPage === 'leadership' ? (
          <LeadershipDevelopment 
            user={user}
            onNavigate={(page, data) => setCurrentPage(page, data?.planKey ?? null)}
          />
        ) : currentPage === 'dev-plans' ? (
          <LeadershipDevPlans
            user={user}
            onNavigate={(page, data) => setCurrentPage(page, data?.planKey ?? null)}
          />
        ) : currentPage === 'dev-plan-detail' ? (
          <LeadershipPlanDetail
            planKey={currentParam}
            onNavigate={(page, data) => setCurrentPage(page, data?.planKey ?? null)}
          />
        ) : currentPage === 'culture-leadership-plan-template' ? (
          <CultureLeadershipPlanTemplate
            onNavigate={(page) => {
              // The template page's only navigation target is "Back to plan".
              // currentParam holds the plan key the user opened the resource
              // from (passed via onNavigate(page, { planKey }) in
              // LeadershipPlanDetail). Falls back to the plan that owns this
              // resource if currentParam isn't set.
              if (page === 'dev-plan-detail') {
                setCurrentPage('dev-plan-detail', currentParam || 'restaurant-culture-builder');
              } else {
                setCurrentPage(page);
              }
            }}
          />
        ) : currentPage === 'team-development' ? (
          <TeamDevelopment 
            user={user}
          />
        ) : (
        <div className="content-wrapper">
          <div className="dashboard-sections">
            {/* LEFT COLUMN: All Caught Up + Dashboard Insights */}
            <div className="dashboard-main-col">
              {/* All Caught Up Status Card */}
              <div className="status-message">
                <div className="status-inner">
                  <div className="status-bg-blur status-bg-blur-1" aria-hidden="true"></div>
                  <div className="status-bg-blur status-bg-blur-2" aria-hidden="true"></div>
                  <div className="status-content-wrapper">
                    <div className="status-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m9 12 2 2 4-4"/>
                      </svg>
                    </div>
                    <h3 className="status-title">All Caught Up! 🎉</h3>
                    <p className="status-description">
                      You have no urgent priorities at the moment. Great job staying on top of things!
                    </p>
                  </div>
                </div>
              </div>

              {/* Dashboard Insights */}
              <div className="dashboard-insights">
                <div className="insights-header">
                  <h2 className="insights-title">Dashboard Insights</h2>
                  <button
                    className="customize-button"
                    onClick={() => setIsCustomizeInsightsOpen(true)}
                  >
                    Customize
                  </button>
                </div>

                <div className="insights-grid">
                  {/* Render the user's selected insight cards from their preferences.
                      Falls back to the seeded defaults if customInsights is empty. */}
                  {(() => {
                    const ids = (customInsights && customInsights.length
                      ? customInsights
                      : ['foh-tasks', 'kitchen-checklist', 'equipment-issues', 'documentation']
                    ).map((c) => (typeof c === 'string' ? c : c?.id)).filter(Boolean);
                    return ids.map((id) => {
                      const card = getInsightById(id);
                      if (!card) return null;
                      const colorClass = `insight-${card.iconColor || 'green'}`;
                      const value = insightsValues[id]?.value ?? '—';
                      const subtitle = insightsValues[id]?.subtitle ?? card.subtitle;
                      return (
                        <button
                          key={id}
                          className={`insight-card ${colorClass}`}
                          onClick={() => setCurrentPage(card.page)}
                        >
                          <div className="insight-card-blur" aria-hidden="true"></div>
                          <div className="insight-card-body">
                            <div className={`insight-icon insight-icon-${card.iconColor || 'green'}`}>
                              <span style={{ fontSize: 22 }}>{card.icon || '📊'}</span>
                            </div>
                            <h3 className="insight-value">{value}</h3>
                            <p className="insight-label">{card.title}</p>
                            <p className="insight-subtitle">{subtitle}</p>
                          </div>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActions 
              onPageChange={setCurrentPage}
              onCustomize={() => setIsCustomizeActionsOpen(true)}
              customActions={customActions}
            />
          </div>
        </div>
        )}

      {/* Customize Insights Modal */}
      <CustomizeInsightsModal
        isOpen={isCustomizeInsightsOpen}
        onClose={() => setIsCustomizeInsightsOpen(false)}
        onSave={async (insights) => {
          // Modal now returns IDs (strings). Be defensive in case anyone
          // wires it back to passing objects later.
          const ids = (insights || []).map((i) => (typeof i === 'string' ? i : i?.id)).filter(Boolean);
          try {
            await preferencesService.updateInsights(ids);
            setCustomInsights(ids);
            setIsCustomizeInsightsOpen(false);
          } catch (error) {
            console.error('Failed to save insights:', error);
            alert('Failed to save insights. Please try again.');
          }
        }}
        currentInsights={customInsights}
        catalog={insightsCatalog}
      />

      {/* Customize Quick Actions Modal */}
      <CustomizeActionsModal
        isOpen={isCustomizeActionsOpen}
        onClose={() => setIsCustomizeActionsOpen(false)}
        onSave={async (actions) => {
          const ids = (actions || []).map((a) => (typeof a === 'string' ? a : a?.id)).filter(Boolean);
          try {
            await preferencesService.updateQuickActions(ids);
            setCustomActions(ids);
            setIsCustomizeActionsOpen(false);
          } catch (error) {
            console.error('Failed to save quick actions:', error);
            alert('Failed to save quick actions. Please try again.');
          }
        }}
        currentActions={customActions}
      />
      </main>
    </div>
  );
};

export default Dashboard;
