import React, { useState, useEffect, useCallback } from 'react';
import './CleaningMaintenance.css';
import cleaningService from '../services/cleaning';
import useCentralDayRefresh from '../hooks/useCentralDayRefresh';
import { isManagerOrAbove } from '../utils/access';
import CreateCleaningTaskModal from './CreateCleaningTaskModal';
import { ConfirmDialog, HistoryDrawer } from './ui';

const SCOPE = 'foh';

// Normalize a backend task to the row shape this UI was built around.
const normalizeRow = (raw) => {
  const comp = raw.today_completion;
  let timeStr = null;
  if (comp && comp.completed_at) {
    try {
      timeStr = new Date(comp.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      });
    } catch { timeStr = null; }
  }
  return {
    id: raw.id,
    text: raw.name,
    completed: Boolean(comp),
    completedBy: comp?.completed_by_name || null,
    completedAt: timeStr,
  };
};

const CleaningMaintenance = ({ user }) => {
  const [activeFrequency, setActiveFrequency] = useState('daily');
  const [tasks, setTasks] = useState({ daily: [], weekly: [], monthly: [], quarterly: [] });
  const [counts, setCounts] = useState({
    daily: { done: 0, total: 0 },
    weekly: { done: 0, total: 0 },
    monthly: { done: 0, total: 0 },
    quarterly: { done: 0, total: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  // History drawer state: history rows + open flag + loading flag.
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // Settings gear opens a "coming soon" sentinel ConfirmDialog until a
  // proper Cleaning settings UI is built. (Phase 17 deferred.)
  const [settingsSentinel, setSettingsSentinel] = useState(false);
  const canManageTasks = isManagerOrAbove(user);

  const refresh = useCallback(async () => {
    try {
      const [grouped, c] = await Promise.all([
        cleaningService.listGroupedByFrequency({ scope: SCOPE }),
        cleaningService.getCounts({ scope: SCOPE }),
      ]);
      setTasks({
        daily: (grouped.daily || []).map(normalizeRow),
        weekly: (grouped.weekly || []).map(normalizeRow),
        monthly: (grouped.monthly || []).map(normalizeRow),
        quarterly: (grouped.quarterly || []).map(normalizeRow),
      });
      setCounts({
        daily: c.daily || { done: 0, total: 0 },
        weekly: c.weekly || { done: 0, total: 0 },
        monthly: c.monthly || { done: 0, total: 0 },
        quarterly: c.quarterly || { done: 0, total: 0 },
      });
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to load cleaning tasks:', err);
      setErrorMsg(err.message || 'Could not load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useCentralDayRefresh(refresh);

  // ---- History drawer: fetch the last 30 days of completions on open ----
  const openHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await cleaningService.getHistory({ scope: SCOPE, range: '30d' });
      const rows = res.completions || res || [];
      setHistoryRows(rows.map((row) => ({
        id: row.id,
        primary: row.task_name,
        secondary: [
          row.frequency ? row.frequency.charAt(0).toUpperCase() + row.frequency.slice(1) : null,
          row.completed_by_name || 'Unknown',
        ].filter(Boolean).join(' • '),
        timestamp: row.completed_at
          ? new Date(row.completed_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : (row.date || ''),
        kind: 'success',
      })));
    } catch (err) {
      console.error('Failed to load cleaning history:', err);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const frequencies = [
    { id: 'daily',     label: 'Daily',     emoji: '☀️', count: counts.daily.done,     total: counts.daily.total },
    { id: 'weekly',    label: 'Weekly',    emoji: '📅', count: counts.weekly.done,    total: counts.weekly.total },
    { id: 'monthly',   label: 'Monthly',   emoji: '🌙', count: counts.monthly.done,   total: counts.monthly.total },
    { id: 'quarterly', label: 'Quarterly', emoji: '⭐', count: counts.quarterly.done, total: counts.quarterly.total },
  ];

  const currentTasks = tasks[activeFrequency] || [];
  const currentFreq = frequencies.find(f => f.id === activeFrequency) || { count: 0, total: 0 };

  // Optimistic toggle.
  const toggleTask = async (taskId) => {
    const list = tasks[activeFrequency];
    const target = list.find(t => t.id === taskId);
    if (!target) return;
    const willBeCompleted = !target.completed;
    setTasks(prev => ({
      ...prev,
      [activeFrequency]: prev[activeFrequency].map(t =>
        t.id === taskId
          ? { ...t, completed: willBeCompleted,
              completedBy: willBeCompleted ? 'You' : null,
              completedAt: willBeCompleted ? 'just now' : null }
          : t
      ),
    }));
    setCounts(prev => ({
      ...prev,
      [activeFrequency]: {
        ...prev[activeFrequency],
        done: prev[activeFrequency].done + (willBeCompleted ? 1 : -1),
      },
    }));
    try {
      if (willBeCompleted) await cleaningService.complete(taskId);
      else await cleaningService.uncomplete(taskId);
    } catch (err) {
      console.error('Cleaning toggle failed:', err);
      setErrorMsg('Could not save — refreshing.');
      refresh();
    }
  };

  // Called by the create-task modal once the backend has accepted the new
  // task. We slot it into the local list optimistically and refresh counts
  // so the period totals stay accurate.
  const handleTaskCreated = (created) => {
    if (!created || !created.frequency) return;
    const freq = created.frequency;
    const normalized = normalizeRow(created);
    setTasks(prev => ({
      ...prev,
      [freq]: [...(prev[freq] || []), normalized],
    }));
    setCounts(prev => ({
      ...prev,
      [freq]: {
        ...prev[freq],
        total: (prev[freq]?.total || 0) + 1,
      },
    }));
    setActiveFrequency(freq);
    setShowAddTask(false);
    setErrorMsg('');
  };

  const deleteTask = async (taskId) => {
    if (!canManageTasks) return;
    const prevList = tasks[activeFrequency];
    setTasks(prev => ({
      ...prev,
      [activeFrequency]: prev[activeFrequency].filter(t => t.id !== taskId),
    }));
    try {
      await cleaningService.remove(taskId);
      // Refresh counts since totals changed.
      const c = await cleaningService.getCounts({ scope: SCOPE });
      setCounts({ daily: c.daily, weekly: c.weekly, monthly: c.monthly, quarterly: c.quarterly });
    } catch (err) {
      console.error('Cleaning delete failed:', err);
      setErrorMsg('Could not delete — manager role required.');
      setTasks(prev => ({ ...prev, [activeFrequency]: prevList }));
    }
  };

  return (
    <div className="cleaning-page">
      {/* Header */}
      <header className="cleaning-header">
        <div className="cleaning-header-inner">
          <div className="cleaning-header-left">
            <h1 className="cleaning-title">Cleaning & Maintenance</h1>
          </div>
          <div className="cleaning-header-actions">
            {/* History (clock icon) — opens HistoryDrawer with last 30 days of completions. */}
            <button
              className="cleaning-icon-btn"
              type="button"
              aria-label="View cleaning history"
              onClick={openHistory}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </button>
            {/* Settings (gear icon) — sentinel until a proper Cleaning settings UI ships. */}
            <button
              className="cleaning-icon-btn"
              type="button"
              aria-label="Cleaning settings"
              onClick={() => setSettingsSentinel(true)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {canManageTasks && (
              <button className="cleaning-add-btn" aria-label="Add task" onClick={() => setShowAddTask(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            )}
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
                <span className="freq-emoji" role="img" aria-hidden="true">{freq.emoji}</span>
                <span className="freq-label">{freq.label}</span>
                <span className="freq-count">{freq.count}/{freq.total}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks card — wraps progress bar + list, FOH-style */}
        <div className="tasks-card">
          <div className="tasks-progress-track">
            <div
              className="tasks-progress-fill"
              style={{ width: `${currentFreq.total ? (currentFreq.count / currentFreq.total) * 100 : 0}%` }}
            />
          </div>
        <div className="tasks-list">
          {isLoading && <div style={{ padding: 24, color: '#6b7280' }}>Loading tasks…</div>}
          {!isLoading && errorMsg && <div style={{ padding: 12, color: '#dc2626', fontSize: 14 }}>{errorMsg}</div>}
          {!isLoading && currentTasks.length === 0 && (
            <div style={{ padding: 24, color: '#6b7280' }}>No {activeFrequency} cleaning tasks yet.</div>
          )}
          {currentTasks.map(task => (
            <div
              key={task.id}
              className={`task-item ${task.completed ? 'completed' : ''}`}
            >
              <button
                type="button"
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
                role="checkbox"
                aria-checked={task.completed}
                aria-label={`${task.text} - Mark as ${task.completed ? 'incomplete' : 'complete'}`}
              >
                {task.completed && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              <div className="task-text-wrap">
                <span className="task-text">{task.text}</span>
              </div>
              {canManageTasks && (
                <button
                  className="task-delete"
                  aria-label={`Delete task: ${task.text}`}
                  onClick={() => deleteTask(task.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                    <line x1="10" x2="10" y1="11" y2="17"/>
                    <line x1="14" x2="14" y1="11" y2="17"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        </div>

        {/* Progress Footer */}
        <div className="tasks-footer">
          <span className="footer-text">{currentFreq.count} of {currentFreq.total} completed</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${currentFreq.total ? (currentFreq.count / currentFreq.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </main>

      {/* Create Cleaning Task modal */}
      {showAddTask && (
        <CreateCleaningTaskModal
          isOpen={showAddTask}
          scope={SCOPE}
          defaultFrequency={activeFrequency}
          onClose={() => setShowAddTask(false)}
          onCreated={handleTaskCreated}
        />
      )}

      {/* ---- Cleaning History drawer ---- */}
      <HistoryDrawer
        isOpen={historyOpen}
        title="Cleaning History"
        subtitle={historyLoading
          ? 'Loading…'
          : `Last 30 days · ${historyRows.length} completion${historyRows.length === 1 ? '' : 's'}`}
        rows={historyRows}
        emptyMessage={historyLoading ? 'Loading…' : 'No completions recorded in the last 30 days.'}
        onClose={() => setHistoryOpen(false)}
      />

      {/* ---- Settings sentinel (gear button) ---- */}
      <ConfirmDialog
        isOpen={settingsSentinel}
        title="Cleaning settings — coming soon"
        message="Per-frequency toggles, default reminders, and shared-device options will live here. The backend already stores `cleaning_settings` on `StoreSettings` — only the UI is pending."
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setSettingsSentinel(false)}
        onClose={() => setSettingsSentinel(false)}
      />
    </div>
  );
};

export default CleaningMaintenance;
