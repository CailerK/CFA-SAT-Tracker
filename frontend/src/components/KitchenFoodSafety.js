import React, { useState } from 'react';
import './KitchenFoodSafety.css';

const KitchenFoodSafety = ({ onNavigate, user }) => {
  const [activeTab, setActiveTab] = useState('safety');
  const [activeTaskTab, setActiveTaskTab] = useState('morning');
  const [activeTempTab, setActiveTempTab] = useState('equipment');

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'equip', label: 'Equip', icon: '🔧' },
    { id: 'safety', label: 'Safety', icon: '🛡️' },
    { id: 'clean', label: 'Clean', icon: '✨' },
    { id: 'lists', label: 'Lists', icon: '📋' },
    { id: 'waste', label: 'Waste', icon: '🗑️' }
  ];

  const stats = [
    { id: 'complete', label: 'COMPLETE', value: '39%', sublabel: 'daily items', icon: '✅', color: '#10b981' },
    { id: 'temps', label: 'TEMPS', value: '14/17', sublabel: 'for morning', icon: '🌡️', color: '#6b7280' },
    { id: 'overdue', label: 'OVERDUE', value: '10', sublabel: 'tasks', icon: '⏰', color: '#f59e0b' },
    { id: 'critical', label: 'CRITICAL', value: '0', sublabel: 'pending', icon: '🔴', color: '#E51636' }
  ];

  const safetyTasks = {
    morning: [
      { id: 1, text: 'Temp all chicken', completed: true, user: 'Robby Hall', time: '9:08 AM' },
      { id: 2, text: 'Temp all equipment', completed: true, user: 'Robby Hall', time: '9:08 AM' },
      { id: 3, text: 'Temp prep table', completed: true, user: 'Robby Hall', time: '9:08 AM' },
      { id: 4, text: 'make sure all prep has stickers', completed: true, user: 'Robby Hall', time: '9:08 AM' },
      { id: 5, text: 'no chemicals on tables', completed: true, user: 'Robby Hall', time: '9:09 AM' },
      { id: 6, text: 'no drinks on tables only in the right spot', completed: true, user: 'Robby Hall', time: '9:09 AM' },
      { id: 7, text: 'Stickers on front products', completed: true, user: 'Robby Hall', time: '9:09 AM' },
      { id: 8, text: 'Use first raw in the right spot', completed: true, user: 'Robby Hall', time: '9:09 AM' }
    ],
    lunch: [
      { id: 101, text: 'Check all temp logs', completed: false, user: '', time: '' },
      { id: 102, text: 'Verify cooler temperatures', completed: false, user: '', time: '' }
    ],
    dinner: [
      { id: 201, text: 'Final temp checks', completed: false, user: '', time: '' },
      { id: 202, text: 'Close out safety log', completed: false, user: '', time: '' }
    ]
  };

  const temperatureLog = {
    equipment: [
      { id: 1, name: 'Walk In Cooler', temp: '32°F', range: '22°F - 41°F', time: 'Today at 9:08 AM', status: 'good' },
      { id: 2, name: 'Walk In Freezer', temp: '-4°F', range: '-20°F - 0°F', time: 'Today at 9:08 AM', status: 'warning' },
      { id: 3, name: 'Prep Area Cooler', temp: '36°F', range: '22°F - 41°F', time: 'Today at 9:08 AM', status: 'good' },
      { id: 4, name: 'Cooking Line', temp: '35°F', range: '35°F - 41°F', time: 'Today at 9:08 AM', status: 'warning' },
      { id: 5, name: 'Ice Cream', temp: '40°F', range: '35°F - 41°F', time: 'Today at 9:08 AM', status: 'good' }
    ],
    product: [
      { id: 101, name: 'Chicken Strips', temp: '38°F', range: '35°F - 41°F', time: 'Today at 9:10 AM', status: 'good' },
      { id: 102, name: 'Filets', temp: '36°F', range: '35°F - 41°F', time: 'Today at 9:10 AM', status: 'good' }
    ]
  };

  const handleTabClick = (tabId) => {
    if (tabId === 'home') {
      onNavigate('kitchen');
    } else if (tabId === 'analytics') {
      onNavigate('kitchen-analytics');
    } else if (tabId === 'equip') {
      onNavigate('kitchen-equipment');
    } else if (tabId === 'safety') {
      onNavigate('kitchen-safety');
    } else if (tabId === 'clean') {
      onNavigate('kitchen-cleaning');
    } else if (tabId === 'lists') {
      onNavigate('kitchen-checklists');
    } else if (tabId === 'waste') {
      onNavigate('kitchen-waste');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="kitchen-safety-page">
      {/* Red Header Banner */}
      <div className="kitchen-safety-banner">
        <div className="banner-icon">☀️</div>
        <div className="banner-content">
          <h1 className="banner-title">Good morning, {user?.firstName || 'Demo'}!</h1>
          <p className="banner-date">Monday, April 20</p>
          <p className="banner-subtitle">Let's keep our kitchen running smoothly today</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="kitchen-safety-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`safety-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="safety-action-buttons">
        <button className="safety-btn-history">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          History
        </button>
        <button className="safety-btn-record">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Record Temps
        </button>
      </div>

      {/* Stats Cards */}
      <div className="safety-stats-grid">
        {stats.map(stat => (
          <div key={stat.id} className="safety-stat-card">
            <div className="stat-header">
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-label" style={{ color: stat.color }}>{stat.label}</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-sublabel">{stat.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="safety-content-grid">
        {/* Daily Safety Tasks Column */}
        <div className="safety-tasks-column">
          <div className="column-header">
            <div>
              <h3 className="column-title">DAILY SAFETY TASKS</h3>
              <p className="column-subtitle">0 remaining for morning</p>
            </div>
            <button className="column-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          {/* Task Tabs */}
          <div className="task-tabs">
            <button 
              className={`task-tab ${activeTaskTab === 'morning' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('morning')}
            >
              🌅 Morning
            </button>
            <button 
              className={`task-tab ${activeTaskTab === 'lunch' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('lunch')}
            >
              ☀️ Lunch <span className="task-count">10</span>
            </button>
            <button 
              className={`task-tab ${activeTaskTab === 'dinner' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('dinner')}
            >
              🌙 Dinner <span className="task-count">10</span>
            </button>
          </div>

          {/* Task List */}
          <div className="task-list">
            {safetyTasks[activeTaskTab].map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                <div className="task-checkbox">
                  {task.completed && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </div>
                <div className="task-content">
                  <div className="task-text">{task.text}</div>
                  {task.completed && (
                    <div className="task-meta">{task.user} • {task.time}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature Log Column */}
        <div className="safety-temps-column">
          <div className="column-header">
            <div>
              <h3 className="column-title">TEMPERATURE LOG</h3>
              <p className="column-subtitle">14/17 for morning</p>
            </div>
            <button className="column-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          {/* Temp Tabs */}
          <div className="temp-tabs">
            <button 
              className={`temp-tab ${activeTempTab === 'equipment' ? 'active' : ''}`}
              onClick={() => setActiveTempTab('equipment')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Equipment
            </button>
            <button 
              className={`temp-tab ${activeTempTab === 'product' ? 'active' : ''}`}
              onClick={() => setActiveTempTab('product')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Product
            </button>
          </div>

          {/* Temperature List */}
          <div className="temp-list">
            {temperatureLog[activeTempTab].map(item => (
              <div key={item.id} className={`temp-item ${item.status}`}>
                <div className="temp-info">
                  <div className="temp-name">{item.name}</div>
                  <div className="temp-range">{item.range}</div>
                </div>
                <div className="temp-reading">
                  <div className="temp-value">{item.temp}</div>
                  <div className="temp-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenFoodSafety;
