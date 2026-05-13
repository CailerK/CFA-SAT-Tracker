import React, { useState } from 'react';
import './TaskHistory.css';

const TaskHistory = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const tabs = [
    { id: 'all', label: 'All', count: 177, icon: '📋' },
    { id: 'opening', label: 'Opening', count: 35, icon: '🌅' },
    { id: 'transition', label: 'Transition', count: 71, icon: '🔄' },
    { id: 'closing', label: 'Closing', count: 71, icon: '🌙' }
  ];

  const dateRanges = [
    { id: '7d', label: '7d' },
    { id: '14d', label: '14d' },
    { id: '30d', label: '30d' }
  ];

  const formatDateRange = () => {
    const end = new Date();
    const start = new Date();
    const days = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    start.setDate(end.getDate() - days);
    
    const formatDate = (d) => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    };
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const generateHistoryData = () => {
    const days = [];
    const today = new Date();
    const numDays = dateRange === '7d' ? 7 : dateRange === '14d' ? 14 : 30;
    
    for (let i = 0; i < numDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const dayNum = date.getDate();
      const month = date.toLocaleDateString('en-US', { month: 'long' });
      const year = date.getFullYear();
      
      // Generate random completion data
      const openingTotal = 16;
      const openingDone = Math.floor(Math.random() * 17);
      const transitionTotal = 6;
      const transitionDone = Math.floor(Math.random() * 7);
      const closingTotal = 34;
      const closingDone = Math.floor(Math.random() * 35);
      
      const totalDone = openingDone + transitionDone + closingDone;
      const totalTasks = openingTotal + transitionTotal + closingTotal;
      
      // Generate some missed tasks
      const missedTasks = [];
      if (openingDone < openingTotal) {
        missedTasks.push('Unlock both doors', 'umbrellas up', 'parking lot check');
      }
      if (closingDone < closingTotal) {
        missedTasks.push('Dining Room Trash', 'Put up propane in marketing closet', 'make sure heaters are off in drive thru');
      }
      
      days.push({
        id: i,
        dayName,
        dayNum,
        month,
        year,
        openingDone,
        openingTotal,
        transitionDone,
        transitionTotal,
        closingDone,
        closingTotal,
        totalDone,
        totalTasks,
        missedTasks: missedTasks.slice(0, Math.floor(Math.random() * 4) + 2)
      });
    }
    
    return days;
  };

  const historyData = generateHistoryData();
  const totalCompleted = historyData.reduce((sum, day) => sum + day.totalDone, 0);
  const totalTasks = historyData.reduce((sum, day) => sum + day.totalTasks, 0);
  const avgCompletion = Math.round((totalCompleted / totalTasks) * 100);

  const tabStats = {
    all: { completed: 177, total: 448 },
    opening: { completed: 35, total: 112 },
    transition: { completed: 71, total: 42 },
    closing: { completed: 71, total: 294 }
  };

  const getTabIcon = (tabId) => {
    const icons = {
      all: '📋',
      opening: '🌅',
      transition: '🔄',
      closing: '🌙'
    };
    return icons[tabId] || '📋';
  };

  return (
    <div className="task-history-page">
      {/* Header */}
      <div className="history-header">
        <button className="history-back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="history-title-group">
          <h1 className="history-title">Task History</h1>
          <p className="history-subtitle">View completed tasks</p>
        </div>
      </div>

      {/* Stats Card */}
      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-label">Avg. Daily Completion</span>
          <span className="stats-percentage">{avgCompletion}%</span>
        </div>
        <div className="stats-progress-bar">
          <div 
            className="stats-progress-fill" 
            style={{ width: `${avgCompletion}%` }}
          ></div>
        </div>
        <div className="stats-breakdown">
          <div className="stat-item">
            <span className="stat-icon">🌅</span>
            <span className="stat-value">{tabStats.opening.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🔄</span>
            <span className="stat-value">{tabStats.transition.completed}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🌙</span>
            <span className="stat-value">{tabStats.closing.completed}</span>
          </div>
          <div className="stat-item stat-total">
            <span className="stat-value">{totalCompleted}/{totalTasks} total</span>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="date-range-section">
        <div className="date-range-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Date Range</span>
        </div>
        <div className="date-range-controls">
          <div className="range-buttons">
            {dateRanges.map(range => (
              <button
                key={range.id}
                className={`range-button ${dateRange === range.id ? 'active' : ''}`}
                onClick={() => setDateRange(range.id)}
              >
                {range.label}
              </button>
            ))}
          </div>
          <div className="date-picker-wrapper">
            <button 
              className="date-picker-button"
              onClick={() => setShowCalendar(!showCalendar)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatDateRange()}
            </button>
            {showCalendar && (
              <div className="calendar-popup">
                <div className="calendar-header">
                  <button className="calendar-nav">&lt;</button>
                  <span>April 2026</span>
                  <button className="calendar-nav">&gt;</button>
                </div>
                <div className="calendar-grid">
                  <div className="calendar-day-label">Su</div>
                  <div className="calendar-day-label">Mo</div>
                  <div className="calendar-day-label">Tu</div>
                  <div className="calendar-day-label">We</div>
                  <div className="calendar-day-label">Th</div>
                  <div className="calendar-day-label">Fr</div>
                  <div className="calendar-day-label">Sa</div>
                  {/* Previous month days */}
                  <div className="calendar-day other-month">29</div>
                  <div className="calendar-day other-month">30</div>
                  <div className="calendar-day other-month">31</div>
                  {/* Current month */}
                  {[...Array(30)].map((_, i) => {
                    const day = i + 1;
                    const isSelected = day >= 11 && day <= 18;
                    const isToday = day === 18;
                    return (
                      <div 
                        key={day} 
                        className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      >
                        {day}
                      </div>
                    );
                  })}
                  {/* Next month */}
                  <div className="calendar-day other-month">1</div>
                  <div className="calendar-day other-month">2</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="history-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`history-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="history-tab-icon">{tab.icon}</span>
            <span className="history-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="history-list">
        {historyData.map(day => (
          <div key={day.id} className="history-day-card">
            <div className="day-card-header">
              <div className="day-date-group">
                <div className="day-name">{day.dayName}</div>
                <div className="day-number">{day.dayNum}</div>
              </div>
              <div className="day-info">
                <div className="day-full-date">{day.month} {day.dayNum}, {day.year}</div>
                <div className="day-stats">
                  <span className="day-stat opening">{day.openingDone}/{day.openingTotal}</span>
                  <span className="day-stat transition">{day.transitionDone}/{day.transitionTotal}</span>
                  <span className="day-stat closing">{day.closingDone}/{day.closingTotal}</span>
                </div>
              </div>
              <div className="day-completion">{day.totalDone}/{day.totalTasks}</div>
            </div>
            
            {/* Task List for the day */}
            <div className="day-tasks">
              {day.missedTasks.map((task, idx) => (
                <div key={idx} className="day-task-item missed">
                  <label className="day-task-checkbox">
                    <input type="checkbox" checked={false} readOnly />
                    <span className="day-checkmark"></span>
                  </label>
                  <span className="day-task-text">{task}</span>
                  <span className="day-task-status">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskHistory;
