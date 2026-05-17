import React, { useCallback, useEffect, useMemo, useState } from 'react';
import fohService from '../services/foh';
import { FormModal, DatePicker } from './ui';
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

const historyTaskKey = (date, taskId) => `${date}:${taskId}`;

const withCountDelta = (day, shift, delta) => {
  const next = { ...day };
  if (['opening', 'transition', 'closing'].includes(shift)) {
    next[shift] = {
      ...next[shift],
      done: Math.max(0, (next[shift]?.done || 0) + delta),
    };
  }
  next.total = {
    ...next.total,
    done: Math.max(0, (next.total?.done || 0) + delta),
  };
  return next;
};

const applyHistoryCompletion = (days, { date, task, completed }) => (
  days.map((day) => {
    if (day.date !== date) return day;

    const normalized = normalizeTaskEntry(task);
    const completedTasks = (day.completed || []).map(normalizeTaskEntry);
    const missedTasks = (day.missed || []).map(normalizeTaskEntry);
    const isAlreadyCompleted = completedTasks.some((item) => item.id === normalized.id);

    if (completed) {
      if (isAlreadyCompleted) return day;
      const next = withCountDelta(day, normalized.shift, 1);
      return {
        ...next,
        completed: [
          ...completedTasks,
          {
            ...normalized,
            completed_at: new Date().toISOString(),
            completed_by_name: normalized.completed_by_name || 'You',
          },
        ],
        missed: missedTasks.filter((item) => item.id !== normalized.id),
      };
    }

    if (!isAlreadyCompleted) return day;
    const next = withCountDelta(day, normalized.shift, -1);
    return {
      ...next,
      completed: completedTasks.filter((item) => item.id !== normalized.id),
      missed: [
        ...missedTasks,
        {
          id: normalized.id,
          text: normalized.text,
          shift: normalized.shift,
        },
      ],
    };
  })
);

const getShiftLabel = (shift) => {
  if (shift === 'opening') return 'Opening';
  if (shift === 'transition') return 'Transition';
  if (shift === 'closing') return 'Closing';
  return 'Task';
};

// YYYY-MM-DD for today / N-days-ago — used to pre-fill the custom range modal.
const isoToday = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const TaskHistory = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('all');
  // dateRange is either a preset id like '7d' or 'custom' when using start/end.
  const [dateRange, setDateRange] = useState('7d');
  // customRange: { start, end } | null — applied when dateRange === 'custom'.
  const [customRange, setCustomRange] = useState(null);
  // rangeModal: { start, end } | null — backing state for the picker FormModal.
  const [rangeModal, setRangeModal] = useState(null);
  const [rangeError, setRangeError] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [pendingHistoryEdits, setPendingHistoryEdits] = useState(new Set());

  const loadHistory = useCallback(async ({ showSpinner = true } = {}) => {
    try {
      if (showSpinner) setIsLoading(true);
      const res = dateRange === 'custom' && customRange?.start && customRange?.end
        ? await fohService.getHistory({ start: customRange.start, end: customRange.end })
        : await fohService.getHistory({ range: dateRange });
      setHistoryData(res.days || []);
      setHistoryError('');
    } catch (err) {
      console.error('Failed to load FOH task history:', err);
      setHistoryData([]);
      setHistoryError(err.message || 'Could not load task history.');
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, [dateRange, customRange]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ---- Custom date range modal handlers ----
  const openRangeModal = () => {
    setRangeError('');
    setRangeModal({
      start: customRange?.start || isoDaysAgo(13),
      end: customRange?.end || isoToday(),
    });
  };

  const submitRangeModal = async () => {
    if (!rangeModal) return;
    const { start, end } = rangeModal;
    if (!start || !end) {
      setRangeError('Both start and end dates are required.');
      throw new Error('Missing dates');
    }
    if (start > end) {
      setRangeError('Start date must be on or before end date.');
      throw new Error('Bad range');
    }
    // Cap at 365 days client-side to mirror the backend safety check.
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    const dayCount = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    if (dayCount > 365) {
      setRangeError('Custom date range cannot exceed 365 days.');
      throw new Error('Range too long');
    }
    setCustomRange({ start, end });
    setDateRange('custom');
    setRangeModal(null);
  };

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

  const isCustom = dateRange === 'custom';

  const toggleHistoryTask = async ({ day, task, completed }) => {
    const normalized = normalizeTaskEntry(task);
    if (!normalized.id) return;

    const key = historyTaskKey(day.date, normalized.id);
    if (pendingHistoryEdits.has(key)) return;

    const previousHistory = historyData;
    setPendingHistoryEdits((prev) => new Set(prev).add(key));
    setHistoryError('');
    setHistoryData((prev) => applyHistoryCompletion(prev, {
      date: day.date,
      task: normalized,
      completed,
    }));

    try {
      await fohService.setHistoryCompletion(normalized.id, {
        date: day.date,
        completed,
      });
      await loadHistory({ showSpinner: false });
    } catch (err) {
      console.error('Failed to update historical task:', err);
      setHistoryData(previousHistory);
      setHistoryError(err.message || 'Could not update task history.');
    } finally {
      setPendingHistoryEdits((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

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
            <button
              type="button"
              className={`range-button ${isCustom ? 'active' : ''}`}
              onClick={openRangeModal}
              title="Pick a custom start and end date"
            >
              Custom
            </button>
          </div>
          <div className="date-picker-wrapper">
            <button
              type="button"
              className="date-picker-button"
              onClick={openRangeModal}
              title="Pick a custom start and end date"
            >
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

      {historyError && (
        <div className="history-inline-error" role="alert">
          {historyError}
        </div>
      )}

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
                        <div
                          key={`${day.date}-done-${task.id || index}`}
                          className={`day-task-item ${pendingHistoryEdits.has(historyTaskKey(day.date, task.id)) ? 'is-pending' : ''}`}
                        >
                          <label className="day-task-checkbox">
                            <input
                              type="checkbox"
                              checked
                              disabled={pendingHistoryEdits.has(historyTaskKey(day.date, task.id))}
                              onChange={() => toggleHistoryTask({ day, task, completed: false })}
                            />
                            <span className="day-checkmark" />
                          </label>
                          {(() => {
                            // Prefer the initials typed at completion time;
                            // fall back to the completer's profile initials.
                            const initials = (
                              task.initials || task.completed_by_initials || ''
                            ).toUpperCase();
                            return initials ? (
                              <span
                                className="day-task-initials"
                                title={task.completed_by_name
                                  ? `Completed by ${task.completed_by_name}`
                                  : 'Initials of the team member who completed this task'}
                              >
                                {initials}
                              </span>
                            ) : null;
                          })()}
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
                        <div
                          key={`${day.date}-missed-${task.id || index}`}
                          className={`day-task-item missed ${pendingHistoryEdits.has(historyTaskKey(day.date, task.id)) ? 'is-pending' : ''}`}
                        >
                          <label className="day-task-checkbox">
                            <input
                              type="checkbox"
                              checked={false}
                              disabled={pendingHistoryEdits.has(historyTaskKey(day.date, task.id))}
                              onChange={() => toggleHistoryTask({ day, task, completed: true })}
                            />
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

      {/* ---- Custom date range FormModal ---- */}
      <FormModal
        isOpen={!!rangeModal}
        title="Pick a Date Range"
        submitLabel="Apply"
        size="sm"
        onClose={() => setRangeModal(null)}
        onSubmit={submitRangeModal}
        submitDisabled={!rangeModal?.start || !rangeModal?.end}
        errorMessage={rangeError}
      >
        <DatePicker
          label="Start Date"
          value={rangeModal?.start || ''}
          onChange={(v) => setRangeModal((r) => r && ({ ...r, start: v }))}
          required
        />
        <DatePicker
          label="End Date"
          value={rangeModal?.end || ''}
          onChange={(v) => setRangeModal((r) => r && ({ ...r, end: v }))}
          required
          help="Up to 365 days."
        />
      </FormModal>
    </div>
  );
};

export default TaskHistory;
