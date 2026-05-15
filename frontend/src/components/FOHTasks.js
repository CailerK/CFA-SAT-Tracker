import React, { useState, useEffect, useCallback, useRef } from 'react';
import './FOHTasks.css';
import TaskHistory from './TaskHistory';
import fohService from '../services/foh';
import settingsService from '../services/settings';
import useCentralDayRefresh from '../hooks/useCentralDayRefresh';
import { isManagerOrAbove } from '../utils/access';
import { FormModal, TextField } from './ui';

// Normalize backend task to {id, text, completed}. The backend returns
// `today_completion` as either null (not done today) or an object (done) —
// presence/absence drives the checkbox state.
const normalizeTask = (raw) => ({
  id: raw.id,
  text: raw.text,
  order: raw.order,
  completed: Boolean(raw.today_completion),
  completedAt: raw.today_completion?.completed_at || null,
  completedBy: raw.today_completion?.completed_by_name || null,
});

const withSequentialOrder = (list) => (
  list.map((task, index) => ({ ...task, order: index }))
);

const reorderTaskList = (list, sourceId, targetId) => {
  const sourceIndex = list.findIndex((task) => task.id === sourceId);
  const targetIndex = list.findIndex((task) => task.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return withSequentialOrder(next);
};

const FOHTasks = ({ user }) => {
  const [activeTab, setActiveTab] = useState('opening');
  const [tasks, setTasks] = useState({ opening: [], transition: [], closing: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // requireInitials mirrors StoreSettings.foh_require_initials from backend.
  const [requireInitials, setRequireInitials] = useState(false);
  const [requireInitialsSaving, setRequireInitialsSaving] = useState(false);
  // initialsModal: { taskId } | null — opens when require-initials is ON
  // and a team member tries to mark a task complete.
  const [initialsModal, setInitialsModal] = useState(null);
  const [initialsInput, setInitialsInput] = useState('');
  const [initialsError, setInitialsError] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTaskId, setDragOverTaskId] = useState(null);
  const tasksRef = useRef(tasks);
  const dragStateRef = useRef(null);
  const canManageTasks = isManagerOrAbove(user);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Load tasks from the backend on mount.
  const refreshTasks = useCallback(async () => {
    try {
      const grouped = await fohService.listTasksGroupedByShift();
      setTasks({
        opening: withSequentialOrder((grouped.opening || []).map(normalizeTask)),
        transition: withSequentialOrder((grouped.transition || []).map(normalizeTask)),
        closing: withSequentialOrder((grouped.closing || []).map(normalizeTask)),
      });
      setErrorMessage('');
    } catch (err) {
      console.error('Failed to load FOH tasks:', err);
      setErrorMessage(err.message || 'Could not load tasks.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  useCentralDayRefresh(refreshTasks);

  // Hydrate the require-initials toggle from StoreSettings on mount so it
  // persists across sessions / shared devices.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await settingsService.getStoreSettings();
        if (cancelled) return;
        setRequireInitials(!!settings?.foh_require_initials);
      } catch (err) {
        console.error('Failed to load FOH store settings:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist the toggle to StoreSettings on user change. Manager-only at the
  // backend, but we hide the toggle UI for team members too.
  const handleToggleRequireInitials = async (next) => {
    if (!canManageTasks) return;
    const prev = requireInitials;
    setRequireInitials(next);
    setRequireInitialsSaving(true);
    try {
      await settingsService.updateStoreSettings({ foh_require_initials: next });
    } catch (err) {
      console.error('Failed to save require-initials setting:', err);
      setRequireInitials(prev);
      setErrorMessage('Could not save setting — manager role required.');
    } finally {
      setRequireInitialsSaving(false);
    }
  };

  const tabConfig = {
    opening: { label: 'Opening', total: tasks.opening.length, icon: '🌅' },
    transition: { label: 'Transition', total: tasks.transition.length, icon: '🔄' },
    closing: { label: 'Closing', total: tasks.closing.length, icon: '🌙' },
  };

  // Mark a task complete or undo a previous completion. If the store has
  // require-initials ON and we're about to complete, route through the
  // initials FormModal first; otherwise fire the API call immediately.
  const toggleTask = async (taskId) => {
    const currentList = tasks[activeTab];
    const target = currentList.find(t => t.id === taskId);
    if (!target) return;
    const willBeCompleted = !target.completed;

    // Require-initials path: open the prompt instead of completing now.
    if (willBeCompleted && requireInitials) {
      setInitialsError('');
      setInitialsInput((user?.firstName?.[0] || '') + (user?.lastName?.[0] || ''));
      setInitialsModal({ taskId });
      return;
    }

    // Optimistic update — flip the checkbox immediately, then sync to server.
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(t =>
        t.id === taskId ? { ...t, completed: willBeCompleted } : t
      ),
    }));
    try {
      if (willBeCompleted) {
        await fohService.completeTask(taskId);
      } else {
        await fohService.uncompleteTask(taskId);
      }
    } catch (err) {
      // Roll back on failure.
      console.error('Toggle failed:', err);
      setErrorMessage('Could not save — change rolled back.');
      setTasks(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(t =>
          t.id === taskId ? { ...t, completed: target.completed } : t
        ),
      }));
    }
  };

  // Submit handler for the initials FormModal: validates, optimistically
  // marks the task complete, then POSTs to /complete/ with initials. Rolls
  // back the optimistic state on failure.
  const submitInitials = async () => {
    if (!initialsModal) return;
    const trimmed = (initialsInput || '').trim().toUpperCase();
    if (!trimmed) {
      setInitialsError('Initials are required.');
      throw new Error('Missing initials');
    }
    if (trimmed.length > 4) {
      setInitialsError('Use up to 4 letters.');
      throw new Error('Initials too long');
    }
    const { taskId } = initialsModal;
    const currentList = tasks[activeTab];
    const target = currentList.find(t => t.id === taskId);
    if (!target) {
      setInitialsModal(null);
      return;
    }
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(t =>
        t.id === taskId ? { ...t, completed: true } : t
      ),
    }));
    try {
      await fohService.completeTask(taskId, { initials: trimmed });
      setInitialsModal(null);
      setInitialsInput('');
    } catch (err) {
      console.error('Complete with initials failed:', err);
      setTasks(prev => ({
        ...prev,
        [activeTab]: prev[activeTab].map(t =>
          t.id === taskId ? { ...t, completed: false } : t
        ),
      }));
      setInitialsError(err?.message || 'Could not save — change rolled back.');
      throw err;
    }
  };

  const getCompletedCount = (tab) => tasks[tab].filter(t => t.completed).length;

  const getProgressPercentage = (tab) => {
    const total = tabConfig[tab].total;
    if (!total) return 0;
    return Math.round((getCompletedCount(tab) / total) * 100);
  };

  const handleAddTask = async () => {
    if (!canManageTasks) return;
    const text = newTaskName.trim();
    if (!text) return;
    try {
      const created = await fohService.createTask({
        shift: activeTab,
        text,
        order: tasks[activeTab].length,
      });
      setTasks(prev => ({
        ...prev,
        [activeTab]: withSequentialOrder([...prev[activeTab], normalizeTask(created)]),
      }));
      setNewTaskName('');
      setShowAddTask(false);
    } catch (err) {
      console.error('Add task failed:', err);
      setErrorMessage(err.message || 'Could not add task. Manager role required.');
    }
  };

  const deleteTask = async (taskId) => {
    if (!canManageTasks) return;
    // Optimistic remove. (Backend soft-archives.)
    const prevList = tasks[activeTab];
    setTasks(prev => ({
      ...prev,
      [activeTab]: withSequentialOrder(prev[activeTab].filter(t => t.id !== taskId)),
    }));
    try {
      await fohService.deleteTask(taskId);
    } catch (err) {
      console.error('Delete failed:', err);
      setErrorMessage('Could not delete — change rolled back.');
      setTasks(prev => ({ ...prev, [activeTab]: prevList }));
    }
  };

  const persistTaskOrder = useCallback(async (shift, nextList, fallbackList) => {
    try {
      await fohService.reorderTasks(
        nextList.map((task, index) => ({
          id: task.id,
          order: index,
        }))
      );
      setTasks(prev => ({
        ...prev,
        [shift]: withSequentialOrder(nextList),
      }));
      setErrorMessage('');
    } catch (err) {
      console.error('Task reorder failed:', err);
      setErrorMessage(err.message || 'Could not save the new task order.');
      setTasks(prev => ({
        ...prev,
        [shift]: withSequentialOrder(fallbackList),
      }));
    }
  }, []);

  const handleGripPointerDown = (event, taskId) => {
    if (!canManageTasks) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragStateRef.current = {
      shift: activeTab,
      taskId,
      originalList: tasksRef.current[activeTab].map((task) => ({ ...task })),
      hasMoved: false,
    };
    setDraggedTaskId(taskId);
    setDragOverTaskId(taskId);
  };

  const moveTaskByDelta = async (taskId, delta) => {
    if (!canManageTasks) return;
    const currentList = tasksRef.current[activeTab];
    const currentIndex = currentList.findIndex((task) => task.id === taskId);
    const targetIndex = currentIndex + delta;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentList.length) {
      return;
    }

    const targetId = currentList[targetIndex].id;
    const nextList = reorderTaskList(currentList, taskId, targetId);
    if (nextList === currentList) return;

    setTasks(prev => ({ ...prev, [activeTab]: nextList }));
    await persistTaskOrder(activeTab, nextList, currentList);
  };

  useEffect(() => {
    if (!draggedTaskId) return undefined;

    document.body.style.userSelect = 'none';

    const handlePointerMove = (event) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.shift !== activeTab) return;

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const row = element?.closest?.('[data-foh-task-id]');
      if (!row) return;

      const targetId = Number(row.getAttribute('data-foh-task-id'));
      if (!targetId) return;

      setDragOverTaskId(targetId);
      if (targetId === dragState.taskId) return;

      setTasks((prev) => {
        const nextList = reorderTaskList(prev[dragState.shift], dragState.taskId, targetId);
        const changed = nextList.some((task, index) => task.id !== prev[dragState.shift][index]?.id);
        if (changed) {
          dragState.hasMoved = true;
        }
        return changed
          ? { ...prev, [dragState.shift]: nextList }
          : prev;
      });
    };

    const finishDrag = () => {
      const dragState = dragStateRef.current;
      const currentList = dragState ? tasksRef.current[dragState.shift] : null;

      setDraggedTaskId(null);
      setDragOverTaskId(null);
      dragStateRef.current = null;
      document.body.style.userSelect = '';

      if (!dragState || !dragState.hasMoved || !currentList) return;
      void persistTaskOrder(dragState.shift, currentList, dragState.originalList);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [activeTab, draggedTaskId, persistTaskOrder]);

  if (showHistory) {
    return <TaskHistory onBack={() => setShowHistory(false)} />;
  }

  return (
    <div className="foh-page">
      {/* Sticky Header */}
      <header className="foh-sticky-header">
        <div className="foh-header-inner">
          <div className="foh-header-left">
            <h1 className="foh-title">FOH Tasks</h1>
          </div>
          <div className="foh-header-actions">
            <button className="foh-icon-btn" onClick={() => setShowSettings(true)} aria-label="FOH settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            <button className="foh-icon-btn" onClick={() => setShowHistory(true)} aria-label="View history">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M12 7v5l4 2"/>
              </svg>
            </button>
            {canManageTasks && (
              <button className="foh-icon-btn foh-icon-btn-primary" onClick={() => setShowAddTask(true)} aria-label="Add task">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="M12 5v14"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="foh-main">
        {errorMessage && (
          <div
            style={{
              margin: '12px 16px',
              padding: '12px 16px',
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#991b1b',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
              }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        {isLoading && (
          <div style={{ padding: '24px', color: '#6b7280', textAlign: 'center' }}>
            Loading tasks…
          </div>
        )}
        {/* Shift Tabs */}
        <div className="foh-tabs-wrap">
          <div className="foh-tabs-inner">
            {Object.entries(tabConfig).map(([key, config]) => {
              const completed = getCompletedCount(key);
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  className={`foh-tab ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                  aria-pressed={isActive}
                  aria-label={`${config.label} shift - ${completed} of ${tasks[key].length} tasks completed`}
                >
                  <span className="foh-tab-emoji" role="img" aria-hidden="true">{config.icon}</span>
                  <span className="foh-tab-label">{config.label}</span>
                  <span className="foh-tab-count">{completed}/{tasks[key].length}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task Card */}
        <div className="foh-task-card">
          {/* Progress bar */}
          <div className="foh-progress-track">
            <div
              className="foh-progress-fill"
              style={{ width: `${getProgressPercentage(activeTab)}%` }}
            ></div>
          </div>

          {/* Task rows */}
          <div className="foh-task-list">
            {tasks[activeTab].map((task) => (
              <div
                key={task.id}
                data-foh-task-id={task.id}
                className={`foh-task-row ${task.completed ? 'completed' : ''} ${draggedTaskId === task.id ? 'is-dragging' : ''} ${dragOverTaskId === task.id && draggedTaskId !== task.id ? 'is-drag-target' : ''}`}
              >
                {canManageTasks && (
                  <button
                    type="button"
                    className="foh-grip"
                    aria-label={`Reorder task: ${task.text}`}
                    onPointerDown={(event) => handleGripPointerDown(event, task.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        void moveTaskByDelta(task.id, -1);
                      }
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        void moveTaskByDelta(task.id, 1);
                      }
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="9" cy="12" r="1"/>
                      <circle cx="9" cy="5" r="1"/>
                      <circle cx="9" cy="19" r="1"/>
                      <circle cx="15" cy="12" r="1"/>
                      <circle cx="15" cy="5" r="1"/>
                      <circle cx="15" cy="19" r="1"/>
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  className={`foh-checkbox ${task.completed ? 'checked' : ''}`}
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
                <div className="foh-task-text-wrap">
                  <span className="foh-task-text">{task.text}</span>
                </div>
                {canManageTasks && (
                  <button
                    className="foh-delete-btn"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete task: ${task.text}`}
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

          {/* Footer */}
          <div className="foh-task-footer">
            <span className="foh-footer-text">
              {getCompletedCount(activeTab)} of {tasks[activeTab].length} completed
            </span>
            <span className="foh-footer-percent">
              {getProgressPercentage(activeTab)}%
            </span>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>FOH Task Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="modal-subtitle">Configure how tasks are completed on this device.</p>
            
            <div className="settings-option">
              <div className="settings-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="settings-option-content">
                <div className="settings-option-header">
                  <h3>Require Team Member Initials</h3>
                  <label className="toggle-switch" style={canManageTasks ? undefined : { opacity: 0.5, cursor: 'not-allowed' }}>
                    <input
                      type="checkbox"
                      checked={requireInitials}
                      disabled={!canManageTasks || requireInitialsSaving}
                      onChange={(e) => handleToggleRequireInitials(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="settings-option-description">
                  When enabled, team members will enter their initials before marking a task complete. Useful when sharing a device so you can see who actually did each task.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initials prompt FormModal (opens when require-initials is ON) */}
      <FormModal
        isOpen={!!initialsModal}
        title="Enter Your Initials"
        submitLabel="Mark Complete"
        size="sm"
        onClose={() => { setInitialsModal(null); setInitialsInput(''); setInitialsError(''); }}
        onSubmit={submitInitials}
        submitDisabled={!initialsInput.trim()}
        errorMessage={initialsError}
      >
        <TextField
          label="Initials"
          value={initialsInput}
          onChange={(v) => setInitialsInput(v.toUpperCase().slice(0, 4))}
          placeholder="e.g. CK"
          required
          autoFocus
          help="Up to 4 letters. Your store requires initials before marking tasks complete."
        />
      </FormModal>

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal-content add-task-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-red">
              <div className="modal-header-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div className="modal-header-content">
                <h2>Add {tabConfig[activeTab].label} Task</h2>
                <p className="modal-header-subtitle">6:30 AM - 11:00 AM • Lunch rush preparation</p>
              </div>
              <button className="modal-close-white" onClick={() => setShowAddTask(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            
            <div className="modal-body">
              <label className="task-input-label">Task Name</label>
              <input
                type="text"
                className="task-input"
                placeholder="Enter a clear, specific task description"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                maxLength={100}
              />
              <div className="character-count">{newTaskName.length}/100 characters</div>
              
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setShowAddTask(false)}>
                  Cancel
                </button>
                <button className="btn-create" onClick={handleAddTask}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FOHTasks;
