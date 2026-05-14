import React, { useEffect, useMemo, useState } from 'react';
import fohService from '../services/foh';
import './TaskHistory.css';

const SHIFT_TABS = [
  { id: 'all', label: 'All', icon: '📋' },
  { id: 'opening', label: 'Opening', icon: '🌅' },
  { id: 'transition', label: 'Transition', icon: '🔄' },
  { id: 'closing', label: 'Closing', icon: '🌙' },
];

const DATE_RANGES = [
  { id: '7d', label: '7d' },
  { id: '14d', label: '14d' },
  { id: '30d', label: '30d' },
];

const parseDateOnly = (iso) => {
  const [year, month, day] = `${iso}`.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const formatDate = (iso) => {
  const date = parseDateOnly(iso);
  return {
    shortDay: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    day: date.getDate(),
    longDate: date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  };
};

const formatCompletedTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const normalizeTaskEntry = (task) => (
  typeof task === 'string'
    ? { text: task, shift: 'unknown' }
    : task
);

const getShiftLabel = (shift) => {
  if (shift === 'opening') return 'Opening';
  if (shift === 'transition') return 'Transition';
  if (shift === 'closing') return 'Closing';
  return 'Task';
};

const TaskHistory = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await fohService.getHistory({ range: dateRange });
        if (cancelled) return;
        setHistoryData(res.days || []);
      } catch (err) {
        console.error('Failed to load FOH task history:', err);
        if (!cancelled) setHistoryData([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dateRange]);

  const tabStats = useMemo(() => {
    const totals = {
      all: { completed: 0, total: 0 },
      opening: { completed: 0, total: 0 },
      transition: { completed: 0, total: 0 },
      closing: { completed: 0, total: 0 },
    };
    historyData.forEach((day) => {
      ['opening', 'transition', 'closing'].forEach((shift) => {
        totals[shift].completed += day[shift]?.done || 0;
        totals[shift].total += day[shift]?.total || 0;
      });
      totals.all.completed += day.total?.done || 0;
      totals.all.total += day.total?.total || 0;
    });
    return totals;
  }, [historyData]);

  const activeStats = tabStats[activeTab] || tabStats.all;
  const avgCompletion = activeStats.total
    ? Math.round((activeStats.completed / activeStats.total) * 100)
    : 0;

  const dateRangeLabel = useMemo(() => {
    if (!historyData.length) return dateRange;
    const newest = parseDateOnly(historyData[0].date);
    const oldest = parseDateOnly(historyData[historyData.length - 1].date);
    const label = (date) => date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${label(oldest)} - ${label(newest)}`;
  }, [historyData, dateRange]);

  return (
    <div className="task-history-page">
      <div className="history-header">
        <button className="history-back-button" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <div className="history-title-group">
          <h1 className="history-title">Task History</h1>
          <p className="history-subtitle">View completed FOH tasks</p>
        </div>
      </div>

      <div className="stats-card">
        <div className="stats-header">
          <span className="stats-label">Average Completion</span>
          <span className="stats-percentage">{avgCompletion}%</span>
        </div>
        <div className="stats-progress-bar">
          <div className="stats-progress-fill" style={{ width: `${avgCompletion}%` }} />
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
            <span className="stat-value">{activeStats.completed}/{activeStats.total} total</span>
          </div>
        </div>
      </div>

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
            {DATE_RANGES.map((range) => (
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
            <button className="date-picker-button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {dateRangeLabel}
            </button>
          </div>
        </div>
      </div>

      <div className="history-tabs">
        {SHIFT_TABS.map((tab) => (
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

      {isLoading ? (
        <div className="history-empty-state">
          <p>Loading task history…</p>
        </div>
      ) : historyData.length === 0 ? (
        <div className="history-empty-state">
          <p>No task history recorded yet.</p>
        </div>
      ) : (
        <div className="history-list">
          {historyData.map((day) => {
            const display = activeTab === 'all' ? day.total : day[activeTab];
            const formatted = formatDate(day.date);
            const completedTasks = (day.completed || [])
              .map(normalizeTaskEntry)
              .filter((task) => activeTab === 'all' || task.shift === activeTab);
            const missedTasks = (day.missed || [])
              .map(normalizeTaskEntry)
              .filter((task) => activeTab === 'all' || task.shift === activeTab);
            return (
              <div key={day.date} className="history-day-card">
                <div className="day-card-header">
                  <div className="day-date-group">
                    <div className="day-name">{formatted.shortDay}</div>
                    <div className="day-number">{formatted.day}</div>
                  </div>
                  <div className="day-info">
                    <div className="day-full-date">{formatted.longDate}</div>
                    <div className="day-stats">
                      <span className="day-stat opening">{day.opening?.done || 0}/{day.opening?.total || 0}</span>
                      <span className="day-stat transition">{day.transition?.done || 0}/{day.transition?.total || 0}</span>
                      <span className="day-stat closing">{day.closing?.done || 0}/{day.closing?.total || 0}</span>
                    </div>
                  </div>
                  <div className="day-completion">{display?.done || 0}/{display?.total || 0}</div>
                </div>

                <div className="day-tasks">
                  <div className="day-task-section">
                    <div className="day-task-section-header">
                      <span>Completed</span>
                      <span>{completedTasks.length}</span>
                    </div>
                    {completedTasks.length === 0 ? (
                      <div className="day-task-item">
                        <span className="day-task-text">No completed tasks recorded.</span>
                      </div>
                    ) : (
                      completedTasks.map((task, index) => (
                        <div key={`${day.date}-done-${index}`} className="day-task-item">
                          <label className="day-task-checkbox">
                            <input type="checkbox" checked readOnly />
                            <span className="day-checkmark" />
                          </label>
                          <div className="day-task-text-block">
                            <span className="day-task-text">{task.text}</span>
                            <div className="day-task-meta">
                              {activeTab === 'all' && (
                                <span className={`day-task-pill ${task.shift || 'unknown'}`}>
                                  {getShiftLabel(task.shift)}
                                </span>
                              )}
                              {task.completed_by_name && (
                                <span>{task.completed_by_name}</span>
                              )}
                              {task.completed_at && (
                                <span>{formatCompletedTime(task.completed_at)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {missedTasks.length > 0 && (
                    <div className="day-task-section day-task-section-muted">
                      <div className="day-task-section-header">
                        <span>Missed</span>
                        <span>{missedTasks.length}</span>
                      </div>
                      {missedTasks.map((task, index) => (
                        <div key={`${day.date}-missed-${index}`} className="day-task-item missed">
                          <label className="day-task-checkbox">
                            <input type="checkbox" checked={false} readOnly />
                            <span className="day-checkmark" />
                          </label>
                          <div className="day-task-text-block">
                            <span className="day-task-text">{task.text}</span>
                            {activeTab === 'all' && (
                              <div className="day-task-meta">
                                <span className={`day-task-pill ${task.shift || 'unknown'}`}>
                                  {getShiftLabel(task.shift)}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className="day-task-status">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                            </svg>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TaskHistory;
