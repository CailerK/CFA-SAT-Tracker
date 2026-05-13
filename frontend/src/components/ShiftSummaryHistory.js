import React, { useState } from 'react';
import './ShiftSummaryHistory.css';

const ShiftSummaryHistory = ({ onNavigate, user }) => {
  const [activeTab, setActiveTab] = useState('history');
  const [dateRange, setDateRange] = useState('Apr 12 - Apr 18, 2026');
  const [shiftFilter, setShiftFilter] = useState('All shifts');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [summaryFilter, setSummaryFilter] = useState('All summaries');

  const tabs = [
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'new', label: 'New', icon: '+' },
    { id: 'saved', label: 'Saved', icon: '💾' },
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'history', label: 'History', icon: '🔄' }
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'summary') {
      onNavigate('shift-summary');
    } else if (tabId === 'templates') {
      onNavigate('setup-sheet-templates');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="shift-history-page">
      {/* Red Header Banner */}
      <div className="shift-history-banner">
        <div className="banner-icon">☀️</div>
        <div className="banner-content">
          <h1 className="banner-title">Good morning, {user?.firstName || 'Demo User'}!</h1>
          <p className="banner-date">Saturday, April 18</p>
          <p className="banner-subtitle">Review the week, spot patterns, and keep follow-up items visible</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="shift-history-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`history-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <div className="filter-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{dateRange}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>

          <div className="filter-item">
            <span>{shiftFilter}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>

          <div className="filter-item">
            <span>{statusFilter}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>

          <div className="filter-item">
            <span>{summaryFilter}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
              <polyline points="6,9 12,15 18,9"/>
            </svg>
          </div>
        </div>

        <div className="filter-actions">
          <button className="filter-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            PDF
          </button>
          <button className="filter-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 6,2 18,2 18,9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* Empty State */}
      <div className="history-empty-state">
        <p>No saved summaries matched this filter range.</p>
      </div>
    </div>
  );
};

export default ShiftSummaryHistory;
