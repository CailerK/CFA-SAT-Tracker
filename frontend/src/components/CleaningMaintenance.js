import React, { useState } from 'react';
import './CleaningMaintenance.css';

const CleaningMaintenance = ({ onBack }) => {
  const [activeFrequency, setActiveFrequency] = useState('daily');

  const frequencies = [
    { id: 'daily', label: 'Daily', count: 12, total: 15 },
    { id: 'weekly', label: 'Weekly', count: 8, total: 10 },
    { id: 'monthly', label: 'Monthly', count: 3, total: 5 },
    { id: 'quarterly', label: 'Quarterly', count: 1, total: 2 }
  ];

  const tasks = {
    daily: [
      { id: 1, text: 'Clean dining room tables', completed: true, completedBy: 'Maria', completedAt: '2:30 PM' },
      { id: 2, text: 'Sweep and mop floors', completed: true, completedBy: 'John', completedAt: '2:45 PM' },
      { id: 3, text: 'Clean restrooms', completed: false, completedBy: null, completedAt: null },
      { id: 4, text: 'Wipe down counters', completed: true, completedBy: 'Sarah', completedAt: '3:00 PM' },
      { id: 5, text: 'Empty trash bins', completed: false, completedBy: null, completedAt: null }
    ],
    weekly: [
      { id: 6, text: 'Deep clean kitchen', completed: true, completedBy: 'Team', completedAt: 'Mon 10:00 AM' },
      { id: 7, text: 'Clean windows', completed: false, completedBy: null, completedAt: null },
      { id: 8, text: 'Sanitize equipment', completed: true, completedBy: 'Chef', completedAt: 'Tue 9:00 AM' }
    ],
    monthly: [
      { id: 9, text: 'Deep clean coolers', completed: false, completedBy: null, completedAt: null },
      { id: 10, text: 'Inspect HVAC filters', completed: true, completedBy: 'Maintenance', completedAt: 'May 1' }
    ],
    quarterly: [
      { id: 11, text: 'Professional carpet cleaning', completed: false, completedBy: null, completedAt: null }
    ]
  };

  const currentTasks = tasks[activeFrequency] || [];
  const currentFreq = frequencies.find(f => f.id === activeFrequency);

  return (
    <div className="cleaning-page">
      {/* Header */}
      <header className="cleaning-header">
        <div className="cleaning-header-inner">
          <div className="cleaning-header-left">
            <h1 className="cleaning-title">Cleaning & Maintenance</h1>
          </div>
          <div className="cleaning-header-actions">
            <button className="cleaning-icon-btn" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </button>
            <button className="cleaning-icon-btn" aria-label="History">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </button>
            <button className="cleaning-icon-btn" aria-label="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button className="cleaning-add-btn" aria-label="Add task">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="cleaning-main">
        {/* Frequency Tabs */}
        <div className="frequency-tabs-wrap">
          <div className="frequency-tabs">
            {frequencies.map(freq => (
              <button
                key={freq.id}
                className={`frequency-tab ${activeFrequency === freq.id ? 'active' : ''}`}
                onClick={() => setActiveFrequency(freq.id)}
              >
                <span className="freq-label">{freq.label}</span>
                <span className="freq-count">{freq.count}/{freq.total}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="tasks-list">
          {currentTasks.map(task => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <button className="task-checkbox">
                {task.completed && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <div className="task-content">
                <span className="task-text">{task.text}</span>
                {task.completed && task.completedBy && (
                  <div className="task-meta">
                    <span className="meta-user">{task.completedBy}</span>
                    <span className="meta-time">{task.completedAt}</span>
                  </div>
                )}
              </div>
              <button className="task-delete" aria-label="Delete task">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Progress Footer */}
        <div className="tasks-footer">
          <span className="footer-text">{currentFreq.count} of {currentFreq.total} completed</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(currentFreq.count / currentFreq.total) * 100}%` }}/>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CleaningMaintenance;
