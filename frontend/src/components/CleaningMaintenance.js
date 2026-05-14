import React, { useState, useEffect, useCallback } from 'react';
import './CleaningMaintenance.css';
import cleaningService from '../services/cleaning';
import useCentralDayRefresh from '../hooks/useCentralDayRefresh';
import { isManagerOrAbove } from '../utils/access';

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
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskFrequency, setNewTaskFrequency] = useState('daily');
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

  const frequencies = [
    { id: 'daily', label: 'Daily', count: counts.daily.done, total: counts.daily.total },
    { id: 'weekly', label: 'Weekly', count: counts.weekly.done, total: counts.weekly.total },
    { id: 'monthly', label: 'Monthly', count: counts.monthly.done, total: counts.monthly.total },
    { id: 'quarterly', label: 'Quarterly', count: counts.quarterly.done, total: counts.quarterly.total },
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

  const handleAddTask = async () => {
    if (!canManageTasks) return;
    const name = newTaskName.trim();
    if (!name) return;
    try {
      const created = await cleaningService.create({
        scope: SCOPE,
        name,
        frequency: newTaskFrequency,
        order: (tasks[newTaskFrequency] || []).length,
      });
      const normalized = normalizeRow(created);
      setTasks(prev => ({
        ...prev,
        [newTaskFrequency]: [...(prev[newTaskFrequency] || []), normalized],
      }));
      setCounts(prev => ({
        ...prev,
        [newTaskFrequency]: {
          ...prev[newTaskFrequency],
          total: (prev[newTaskFrequency]?.total || 0) + 1,
        },
      }));
      setNewTaskName('');
      setShowAddTask(false);
      setActiveFrequency(newTaskFrequency);
      setErrorMsg('');
    } catch (err) {
      console.error('Add cleaning task failed:', err);
      setErrorMsg(err.message || 'Could not add task. Manager role required.');
    }
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
                <span className="freq-label">{freq.label}</span>
                <span className="freq-count">{freq.count}/{freq.total}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tasks List */}
        <div className="tasks-list">
          {isLoading && <div style={{ padding: 24, color: '#6b7280' }}>Loading tasks…</div>}
          {!isLoading && errorMsg && <div style={{ padding: 12, color: '#dc2626', fontSize: 14 }}>{errorMsg}</div>}
          {!isLoading && currentTasks.length === 0 && (
            <div style={{ padding: 24, color: '#6b7280' }}>No {activeFrequency} cleaning tasks yet.</div>
          )}
          {currentTasks.map(task => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <button
                className="task-checkbox"
                onClick={() => toggleTask(task.id)}
                aria-label={task.completed ? 'Uncomplete' : 'Complete'}
              >
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
                    {task.completedAt && <span className="meta-time">{task.completedAt}</span>}
                  </div>
                )}
              </div>
              {canManageTasks && (
                <button
                  className="task-delete"
                  aria-label="Delete task"
                  onClick={() => deleteTask(task.id)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Task Modal */}
        {showAddTask && (
          <div
            onClick={() => setShowAddTask(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '480px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  background: '#E51636',
                  color: '#fff',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '20px' }}>Add Cleaning Task</h2>
                <button
                  onClick={() => setShowAddTask(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#374151',
                    }}
                  >
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="e.g., Wipe down high chairs"
                    autoFocus
                    maxLength={200}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 600,
                      marginBottom: '8px',
                      color: '#374151',
                    }}
                  >
                    Frequency
                  </label>
                  <select
                    value={newTaskFrequency}
                    onChange={(e) => setNewTaskFrequency(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#fff',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                  }}
                >
                  <button
                    onClick={() => setShowAddTask(false)}
                    style={{
                      padding: '10px 20px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTask}
                    disabled={!newTaskName.trim()}
                    style={{
                      padding: '10px 20px',
                      background: newTaskName.trim() ? '#E51636' : '#fca5a5',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: newTaskName.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    + Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
    </div>
  );
};

export default CleaningMaintenance;
