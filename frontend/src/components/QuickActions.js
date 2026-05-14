import React from 'react';
import './QuickActions.css';

const DEFAULT_ACTION_IDS = [
  'my-evaluations',
  'my-profile',
  'goals',
  'playbooks',
  'cfadollars',
  'safe-counting',
  'team-chat',
  'settings',
];

const QuickActions = ({ onPageChange, onCustomize, customActions }) => {
  const quickActionItems = [
    {
      id: 'team-overview',
      title: 'Team Overview',
      subtitle: 'Manage your team',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      iconBg: 'blue',
      page: 'team-members'
    },
    {
      id: 'waste-tracker',
      title: 'Waste Tracker',
      subtitle: 'Track waste',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,6 5,6 21,6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
      ),
      iconBg: 'red',
      tags: ['Kitchen', 'Prep', 'Food Truck', 'Everything'],
      page: 'kitchen-waste'
    },
    {
      id: 'equipment',
      title: 'Equipment',
      subtitle: 'Maintenance logs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>
      ),
      iconBg: 'orange',
      tags: ['Kitchen', 'Prep', 'Food Truck', 'Everything'],
      page: 'kitchen-equipment'
    },
    {
      id: 'food-safety',
      title: 'Food Safety',
      subtitle: 'Safety checks',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      iconBg: 'green',
      tags: ['Kitchen', 'Prep', 'Food Truck', 'Everything'],
      page: 'kitchen-safety'
    },
    {
      id: 'my-training',
      title: 'My Training',
      subtitle: 'Your progress',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
      iconBg: 'blue',
      tags: ['Team Member', 'Trainer'],
      page: 'team-training'
    },
    {
      id: 'my-evaluations',
      title: 'My Evaluations',
      subtitle: 'Your reviews',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <path d="M9 11l2 2 4-4"/>
        </svg>
      ),
      iconBg: 'purple',
      tags: ['Team Member', 'Trainer'],
      page: 'team-evaluations'
    },
    {
      id: 'my-profile',
      title: 'My Profile',
      subtitle: 'View profile',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
      iconBg: 'blue',
      tags: ['Team Member', 'Trainer'],
      page: 'settings'
    },
    {
      id: 'playbooks',
      title: 'Playbooks',
      subtitle: 'Training guides',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
      ),
      iconBg: 'indigo',
      tags: ['Leader', 'Director'],
      page: 'leadership'
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Set objectives',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="6"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
      ),
      iconBg: 'pink',
      tags: ['Leader', 'Director'],
      page: 'leadership-360'
    },
    {
      id: 'cfadollars',
      title: 'CFAdollars',
      subtitle: 'Rewards program',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6"/>
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
        </svg>
      ),
      iconBg: 'yellow',
      tags: ['Team Member', 'Trainer'],
      page: 'dashboard'
    },
    {
      id: 'safe-counting',
      title: 'Safe Counting',
      subtitle: 'Cash management',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      ),
      iconBg: 'teal',
      tags: ['Leader', 'Director'],
      page: 'dashboard'
    },
    {
      id: 'team-chat',
      title: 'Team Chat',
      subtitle: 'Communication',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
        </svg>
      ),
      iconBg: 'green',
      page: 'team-chat'
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Preferences',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      ),
      iconBg: 'gray',
      page: 'settings'
    },
    {
      id: 'evaluations',
      title: 'Evaluations',
      subtitle: 'Review performance',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
      iconBg: 'purple',
      page: 'leadership-360'
    },
    {
      id: 'foh-tasks',
      title: 'FOH Tasks',
      subtitle: 'Daily checklist',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20,6 9,17 4,12"/>
        </svg>
      ),
      iconBg: 'green',
      page: 'foh'
    },
    {
      id: 'cleaning',
      title: 'Cleaning',
      subtitle: 'Maintenance tasks',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ),
      iconBg: 'cyan',
      page: 'foh-cleaning'
    },
    {
      id: 'setup-sheets',
      title: 'Setup Sheets',
      subtitle: 'View schedules',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      ),
      iconBg: 'yellow',
      page: 'setup-sheet-templates'
    },
    {
      id: 'kitchen',
      title: 'Kitchen',
      subtitle: 'Kitchen operations',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
          <path d="M12 12L2.1 9.9"/>
          <path d="M12 12v10"/>
        </svg>
      ),
      iconBg: 'orange',
      page: 'kitchen'
    },
    {
      id: 'training',
      title: 'Training',
      subtitle: 'Team development',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>
      ),
      iconBg: 'indigo',
      page: 'team-training'
    },
    {
      id: 'documentation',
      title: 'Documentation',
      subtitle: 'Employee docs',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      ),
      iconBg: 'pink',
      page: 'team-documentation'
    },
    {
      id: 'leadership',
      title: 'Leadership',
      subtitle: 'Development plans',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
          <polyline points="17,6 23,6 23,12"/>
        </svg>
      ),
      iconBg: 'teal',
      page: 'leadership'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      subtitle: 'View insights',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      ),
      iconBg: 'rose',
      page: 'kitchen-analytics'
    }
  ];

  // Filter items based on customActions or fall back to default set
  // customActions can be either an array of strings (from backend) or array of objects
  const selectedIds = customActions && customActions.length > 0
    ? customActions.map((a) => typeof a === 'string' ? a : a.id)
    : DEFAULT_ACTION_IDS;
  const visibleItems = quickActionItems.filter((item) => selectedIds.includes(item.id));

  return (
    <div className="quick-actions">
      <div className="quick-actions-header">
        <h3 className="quick-actions-title">Quick Actions</h3>
        <button className="customize-button" onClick={onCustomize}>Customize</button>
      </div>
      
      <div className="quick-actions-grid">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.page)}
            className="quick-action-item"
          >
            <div className={`action-icon ${item.iconBg}`}>
              {item.icon}
            </div>
            <div className="action-content">
              <div className="action-title">{item.title}</div>
              <div className="action-subtitle">{item.subtitle}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
