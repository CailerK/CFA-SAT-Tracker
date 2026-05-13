import React, { useState, useEffect, useCallback } from 'react';
import './Settings.css';
import settingsService from '../services/settings';

const TABS = [
  { id: 'general',      label: 'General',       icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  { id: 'store',        label: 'Store Info',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { id: 'features',     label: 'Features',      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { id: 'access',       label: 'User Access',   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { id: 'notifications',label: 'Notifications', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
  { id: 'appearance',   label: 'Appearance',    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> },
];

const Toggle = ({ checked, onChange }) => (
  <label className="stg-toggle">
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
    <span className="stg-toggle-track"><span className="stg-toggle-thumb"/></span>
  </label>
);

// Map between the backend's snake_case feature keys and the frontend's camelCase.
// Backend stores e.g. {foh_tasks, team_chat, guest_recovery, safe_counting}.
const BACKEND_FEATURE_KEYS = {
  fohTasks: 'foh_tasks',
  kitchen: 'kitchen',
  setups: 'setups',
  documentation: 'documentation',
  evaluations: 'evaluations',
  leadership: 'leadership',
  rewards: 'rewards',
  safeCounting: 'safe_counting',
  calendar: 'calendar',
  teamChat: 'team_chat',
  guestRecovery: 'guest_recovery',
  vendors: 'vendors',
};

const featuresFromBackend = (apiFeatures = {}) =>
  Object.fromEntries(
    Object.entries(BACKEND_FEATURE_KEYS).map(([fe, be]) => [
      fe,
      Boolean(apiFeatures[be]),
    ])
  );

const featuresToBackend = (uiFeatures = {}) =>
  Object.fromEntries(
    Object.entries(BACKEND_FEATURE_KEYS).map(([fe, be]) => [
      be,
      Boolean(uiFeatures[fe]),
    ])
  );

const Settings = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'error' | null

  // General — language is per-user preference; timezone is per-store.
  const [language, setLanguage]     = useState('english');
  const [timezone, setTimezone]     = useState('America/Chicago');

  // Store Info
  const [storeName, setStoreName]   = useState('');
  const [storeNum, setStoreNum]     = useState('');
  const [storeAddr, setStoreAddr]   = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [vision, setVision]         = useState('');
  const [mission, setMission]       = useState('');

  // Features (store settings)
  const [features, setFeatures] = useState({
    fohTasks: true, kitchen: true, setups: true, documentation: true,
    evaluations: true, leadership: true, rewards: false, safeCounting: false,
    calendar: true, teamChat: true, guestRecovery: true, vendors: true,
  });

  // User Access (store settings)
  const [setupViewLeadersOnly, setSetupViewLeadersOnly] = useState(false);
  const [requireLeaderReview,  setRequireLeaderReview]  = useState(false);
  const [requireDirectorAppr,  setRequireDirectorAppr]  = useState(false);
  const [deptRestriction,      setDeptRestriction]       = useState(false);
  const [teamMemberCompletion, setTeamMemberCompletion] = useState(true);

  // Notifications (per-user preferences)
  const [notifEval,     setNotifEval]     = useState(true);
  const [notifTask,     setNotifTask]     = useState(true);
  const [notifChat,     setNotifChat]     = useState(true);
  const [notifComplaint,setNotifComplaint]= useState(true);
  const [emailDigest,   setEmailDigest]   = useState(false);

  // Appearance (per-user preferences)
  const [darkMode,     setDarkMode]     = useState(false);
  const [compactMode,  setCompactMode]  = useState(false);

  // ---------- Load from backend on mount ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [store, storeSettings, prefs] = await Promise.all([
          settingsService.getStore(),
          settingsService.getStoreSettings(),
          settingsService.getPreferences(),
        ]);
        if (cancelled) return;
        // Store info
        setStoreName(store.name || '');
        setStoreNum(store.store_number || '');
        setStoreAddr(store.address || '');
        setStorePhone(store.phone || '');
        setStoreEmail(store.email || '');
        setVision(store.vision || '');
        setMission(store.mission || '');
        setTimezone(store.timezone_name || 'America/Chicago');
        // Feature flags + access toggles
        setFeatures(featuresFromBackend(storeSettings.features));
        const access = storeSettings.access || {};
        setSetupViewLeadersOnly(Boolean(access.setup_view_leaders_only));
        setRequireLeaderReview(Boolean(access.require_leader_review));
        setRequireDirectorAppr(Boolean(access.require_director_approval));
        setDeptRestriction(Boolean(access.department_restriction));
        setTeamMemberCompletion(Boolean(access.team_member_completion));
        // User preferences
        setLanguage(prefs.language || 'english');
        setDarkMode(Boolean(prefs.dark_mode));
        setCompactMode(Boolean(prefs.compact_mode));
        const notif = prefs.notifications || {};
        setNotifEval(Boolean(notif.eval_due));
        setNotifTask(Boolean(notif.task_reminder));
        setNotifChat(Boolean(notif.chat));
        setNotifComplaint(Boolean(notif.complaint));
        setEmailDigest(Boolean(notif.email_digest));
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Save helpers ----------
  const withSaveStatus = useCallback(async (fn) => {
    setSaveStatus('saving');
    try {
      await fn();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (err) {
      console.error('Settings save failed:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 2500);
    }
  }, []);

  const saveGeneral = () => withSaveStatus(async () => {
    await Promise.all([
      settingsService.updatePreferences({ language }),
      settingsService.updateStore({ timezone_name: timezone }),
    ]);
  });

  const saveStore = () => withSaveStatus(() =>
    settingsService.updateStore({
      name: storeName, address: storeAddr, phone: storePhone,
      email: storeEmail, vision, mission,
    })
  );

  const saveFeatures = () => withSaveStatus(() =>
    settingsService.updateStoreSettings({ features: featuresToBackend(features) })
  );

  const saveAccess = () => withSaveStatus(() =>
    settingsService.updateStoreSettings({
      access: {
        setup_view_leaders_only: setupViewLeadersOnly,
        require_leader_review: requireLeaderReview,
        require_director_approval: requireDirectorAppr,
        department_restriction: deptRestriction,
        team_member_completion: teamMemberCompletion,
      },
    })
  );

  const saveNotifications = () => withSaveStatus(() =>
    settingsService.updatePreferences({
      notifications: {
        eval_due: notifEval, task_reminder: notifTask, chat: notifChat,
        complaint: notifComplaint, email_digest: emailDigest,
      },
    })
  );

  const saveAppearance = () => withSaveStatus(() =>
    settingsService.updatePreferences({
      dark_mode: darkMode, compact_mode: compactMode,
    })
  );

  // Single dispatch from each panel's Save Changes button.
  const saveCurrentTab = () => {
    switch (activeTab) {
      case 'general':       return saveGeneral();
      case 'store':         return saveStore();
      case 'features':      return saveFeatures();
      case 'access':        return saveAccess();
      case 'notifications': return saveNotifications();
      case 'appearance':    return saveAppearance();
      default: return null;
    }
  };

  const saveButtonLabel = () => {
    if (saveStatus === 'saving') return 'Saving…';
    if (saveStatus === 'saved')  return 'Saved ✓';
    if (saveStatus === 'error')  return 'Try again';
    return 'Save Changes';
  };

  const featureLabels = {
    fohTasks:      'FOH Tasks',
    kitchen:       'Kitchen Module',
    setups:        'Setup Sheet',
    documentation: 'Documentation',
    evaluations:   'Evaluations',
    leadership:    'Leadership Tools',
    rewards:       'CFAdollars Rewards',
    safeCounting:  'Safe Counting',
    calendar:      'Calendar',
    teamChat:      'Team Chat',
    guestRecovery: 'Guest Recovery',
    vendors:       'Vendors',
  };

  const featureDescriptions = {
    fohTasks:      'Enable FOH daily tasks and cleaning checklists.',
    kitchen:       'Kitchen dashboard, food safety, and waste tracking.',
    setups:        'Setup sheet templates, builder, and saved setups.',
    documentation: 'Team documentation and disciplinary records.',
    evaluations:   'Team member evaluations and performance reviews.',
    leadership:    'Leadership tools, weekly digest, and analytics.',
    rewards:       'CFAdollars loyalty and rewards program.',
    safeCounting:  'Safe counting and cash management tools.',
    calendar:      'Store calendar for events and scheduling.',
    teamChat:      'In-app team messaging and announcements.',
    guestRecovery: 'Guest complaint tracking and recovery tools.',
    vendors:       'Vendor directory and contact management.',
  };

  return (
    <div className="stg-page">
      {/* Header */}
      <header className="stg-header">
        <div className="stg-header-inner">
          <h1 className="stg-title">Settings</h1>
          <p className="stg-subtitle">
            {isLoading ? 'Loading your settings…' : 'Manage your store settings and preferences'}
          </p>
        </div>
      </header>

      <div className="stg-body">
        {/* Sidebar Nav */}
        <nav className="stg-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`stg-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="stg-nav-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="stg-content">

          {/* ── General ── */}
          {activeTab === 'general' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>General Settings</h2>
                <p>Configure language and regional preferences</p>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Language & Region</h3>
                <div className="stg-field">
                  <div className="stg-field-label">
                    <span>Language</span>
                    <span className="stg-field-desc">Select your preferred language</span>
                  </div>
                  <select className="stg-select" value={language} onChange={e => setLanguage(e.target.value)}>
                    <option value="english">English</option>
                    <option value="spanish">Español</option>
                  </select>
                </div>
                <div className="stg-field">
                  <div className="stg-field-label">
                    <span>Timezone</span>
                    <span className="stg-field-desc">Used for scheduling and reports</span>
                  </div>
                  <select className="stg-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>
              </div>

              <div className="stg-footer">
                <button className="stg-btn-secondary">Reset to Default</button>
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── Store Info ── */}
          {activeTab === 'store' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>Store Information</h2>
                <p>Manage the store contact details used across the app</p>
              </div>

              <div className="stg-section">
                <div className="stg-form-row">
                  <div className="stg-form-group">
                    <label>Store Name <span className="req">*</span></label>
                    <input className="stg-input" value={storeName} onChange={e => setStoreName(e.target.value)} />
                  </div>
                  <div className="stg-form-group">
                    <label>Store Number <span className="req">*</span></label>
                    <input className="stg-input" value={storeNum} onChange={e => setStoreNum(e.target.value)} placeholder="e.g. 00727" />
                  </div>
                </div>
                <div className="stg-form-group">
                  <label>Store Address</label>
                  <input className="stg-input" value={storeAddr} onChange={e => setStoreAddr(e.target.value)} />
                </div>
                <div className="stg-form-row">
                  <div className="stg-form-group">
                    <label>Phone Number</label>
                    <input className="stg-input" value={storePhone} onChange={e => setStorePhone(e.target.value)} />
                  </div>
                  <div className="stg-form-group">
                    <label>Email Address</label>
                    <input className="stg-input" value={storeEmail} onChange={e => setStoreEmail(e.target.value)} />
                  </div>
                </div>
                <div className="stg-form-group">
                  <label>Vision Statement</label>
                  <textarea className="stg-textarea" rows={2} value={vision} onChange={e => setVision(e.target.value)} />
                </div>
                <div className="stg-form-group">
                  <label>Mission Statement</label>
                  <textarea className="stg-textarea" rows={2} value={mission} onChange={e => setMission(e.target.value)} />
                </div>
              </div>

              <div className="stg-footer">
                <button className="stg-btn-secondary">Reset to Default</button>
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── Features ── */}
          {activeTab === 'features' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>Features</h2>
                <p>Enable or disable modules for your store</p>
              </div>

              <div className="stg-section">
                {Object.keys(features).map(key => (
                  <div key={key} className="stg-toggle-row">
                    <div className="stg-toggle-info">
                      <span className="stg-toggle-label">{featureLabels[key]}</span>
                      <span className="stg-toggle-desc">{featureDescriptions[key]}</span>
                    </div>
                    <Toggle
                      checked={features[key]}
                      onChange={val => setFeatures(prev => ({ ...prev, [key]: val }))}
                    />
                  </div>
                ))}
              </div>

              <div className="stg-footer">
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── User Access ── */}
          {activeTab === 'access' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>User Access</h2>
                <p>Control access and permissions for different roles</p>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Setup View Access</h3>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Leaders Only</span>
                    <span className="stg-toggle-desc">Restrict setup sheet viewing to leaders and above only</span>
                  </div>
                  <Toggle checked={setupViewLeadersOnly} onChange={setSetupViewLeadersOnly} />
                </div>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Evaluation Access Controls</h3>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Department Restriction</span>
                    <span className="stg-toggle-desc">Restrict evaluators to only evaluate team members in their department</span>
                  </div>
                  <Toggle checked={deptRestriction} onChange={setDeptRestriction} />
                </div>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Require Store Leader Review</span>
                    <span className="stg-toggle-desc">Require store leader review before finalizing evaluations</span>
                  </div>
                  <Toggle checked={requireLeaderReview} onChange={setRequireLeaderReview} />
                </div>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Require Director Approval</span>
                    <span className="stg-toggle-desc">Require director approval for completed evaluations</span>
                  </div>
                  <Toggle checked={requireDirectorAppr} onChange={setRequireDirectorAppr} />
                </div>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Cleaning & Tasks</h3>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Team Member Completion</span>
                    <span className="stg-toggle-desc">Allow team members (Level 1–2) to mark cleaning tasks complete</span>
                  </div>
                  <Toggle checked={teamMemberCompletion} onChange={setTeamMemberCompletion} />
                </div>
              </div>

              <div className="stg-footer">
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeTab === 'notifications' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>Notifications</h2>
                <p>Choose what you get notified about</p>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">In-App Notifications</h3>
                {[
                  { label: 'Evaluations Due', desc: 'Notify when an evaluation is due or overdue', val: notifEval, set: setNotifEval },
                  { label: 'Task Reminders', desc: 'Notify when daily or cleaning tasks are incomplete', val: notifTask, set: setNotifTask },
                  { label: 'Team Chat Messages', desc: 'Notify on new messages in team chat channels', val: notifChat, set: setNotifChat },
                  { label: 'Guest Complaints', desc: 'Notify when a new guest complaint is logged', val: notifComplaint, set: setNotifComplaint },
                ].map(n => (
                  <div key={n.label} className="stg-toggle-row">
                    <div className="stg-toggle-info">
                      <span className="stg-toggle-label">{n.label}</span>
                      <span className="stg-toggle-desc">{n.desc}</span>
                    </div>
                    <Toggle checked={n.val} onChange={n.set} />
                  </div>
                ))}
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Email</h3>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Weekly Digest Email</span>
                    <span className="stg-toggle-desc">Receive a weekly summary email every Monday morning</span>
                  </div>
                  <Toggle checked={emailDigest} onChange={setEmailDigest} />
                </div>
              </div>

              <div className="stg-footer">
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

          {/* ── Appearance ── */}
          {activeTab === 'appearance' && (
            <div className="stg-panel">
              <div className="stg-panel-header">
                <h2>Appearance</h2>
                <p>Customize how the app looks and feels</p>
              </div>

              <div className="stg-section">
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Dark Mode</span>
                    <span className="stg-toggle-desc">Enable dark mode for the application</span>
                  </div>
                  <Toggle checked={darkMode} onChange={setDarkMode} />
                </div>
                <div className="stg-toggle-row">
                  <div className="stg-toggle-info">
                    <span className="stg-toggle-label">Compact Mode</span>
                    <span className="stg-toggle-desc">Use compact layout to show more content on screen</span>
                  </div>
                  <Toggle checked={compactMode} onChange={setCompactMode} />
                </div>
              </div>

              <div className="stg-section">
                <h3 className="stg-section-title">Color Theme</h3>
                <div className="stg-theme-swatches">
                  {['#E51636','#2563eb','#059669','#7c3aed','#d97706'].map(color => (
                    <button
                      key={color}
                      className={`stg-swatch ${color === '#E51636' ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      aria-label={color}
                    />
                  ))}
                </div>
                <p className="stg-field-desc" style={{ marginTop: 8 }}>Brand red is the default Chick-fil-A theme color.</p>
              </div>

              <div className="stg-footer">
                <button
                  className="stg-btn-primary"
                  onClick={saveCurrentTab}
                  disabled={saveStatus === 'saving' || isLoading}
                >
                  {saveButtonLabel()}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
