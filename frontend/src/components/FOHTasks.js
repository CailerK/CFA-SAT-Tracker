import React, { useState } from 'react';
import './FOHTasks.css';
import TaskHistory from './TaskHistory';

const FOHTasks = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState('opening');
  const [tasks, setTasks] = useState({
    opening: [
      { id: 1, text: 'Stock all wall combines', completed: false },
      { id: 2, text: 'Stock Ice cream, Milks, Whip Cream, and Shake Base', completed: false },
      { id: 3, text: 'Make Salad Kits', completed: false },
      { id: 4, text: 'Dining Room Tables Clean', completed: false },
      { id: 5, text: 'Glass Cleaned in Dining Room', completed: false },
      { id: 6, text: 'Tea, Ice, and Lemonade Stocked', completed: false },
      { id: 7, text: 'All counters wiped down EVERYWHERE', completed: false },
      { id: 8, text: 'Sweep and Mop Drive', completed: false },
      { id: 9, text: 'Trays Cleaned', completed: false },
      { id: 10, text: '3 Coffee base made', completed: false },
      { id: 11, text: 'Napkins and Drink holders', completed: false },
      { id: 12, text: 'Shakes-Replace any syrups/Cookies', completed: false },
      { id: 13, text: 'Dumpster Pad Check', completed: false },
      { id: 14, text: '8 lemonades made', completed: false },
      { id: 15, text: 'All Headset batteries charging', completed: false },
      { id: 16, text: 'Cups and lids', completed: false },
    ],
    transition: [
      { id: 101, text: 'Mid-shift inventory check', completed: false },
      { id: 102, text: 'Restock napkin holders', completed: false },
      { id: 103, text: 'Check drink station supplies', completed: false },
      { id: 104, text: 'Clean and organize POS stations', completed: false },
      { id: 105, text: 'Sweep dining room floor', completed: false },
      { id: 106, text: 'Check restroom supplies', completed: false },
    ],
    closing: [
      { id: 201, text: 'Dining Room Trash', completed: false },
      { id: 202, text: 'Put up propane in marketing closet', completed: false },
      { id: 203, text: 'make sure heaters are off in drive thru', completed: false },
      { id: 204, text: 'lock doors', completed: false },
      { id: 205, text: "Men's Restroom", completed: false },
      { id: 206, text: "Women's Restroom", completed: false },
      { id: 207, text: 'Make Salad Kits', completed: false },
      { id: 208, text: 'Stock Dressings', completed: false },
      { id: 209, text: 'Stock Ice cream, Milks, Whip Cream, and Shake Base', completed: false },
      { id: 210, text: 'Break Down and Clean Lemonades', completed: false },
      { id: 211, text: 'Drain Tea Urns and Take Them to Dishes', completed: false },
      { id: 212, text: 'Plug in all Ipads, Card Readers, and Headset Batteries', completed: false },
      { id: 213, text: 'Clean Sinks', completed: false },
      { id: 214, text: 'Clean FC', completed: false },
      { id: 215, text: 'Clean Coffees', completed: false },
      { id: 216, text: 'Clean Trays', completed: false },
      { id: 217, text: 'Clean Screens', completed: false },
      { id: 218, text: 'Break Down and Clean Drink Stations', completed: false },
      { id: 219, text: 'Final walkthrough', completed: false },
      { id: 220, text: 'Set alarm system', completed: false },
      { id: 221, text: 'Check all doors locked', completed: false },
      { id: 222, text: 'Turn off all lights', completed: false },
      { id: 223, text: 'Count registers', completed: false },
      { id: 224, text: 'Prepare deposit', completed: false },
      { id: 225, text: 'Clean shake machine', completed: false },
      { id: 226, text: 'Mop floors', completed: false },
      { id: 227, text: 'Take out trash', completed: false },
      { id: 228, text: 'Clean shake area', completed: false },
      { id: 229, text: 'Restock sauce bottles', completed: false },
      { id: 230, text: 'Clean ice machine', completed: false },
      { id: 231, text: 'Sanitize tables', completed: false },
      { id: 232, text: 'Clean windows', completed: false },
      { id: 233, text: 'Stock cups for tomorrow', completed: false },
      { id: 234, text: 'Check cooler temperatures', completed: false },
    ]
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [requireInitials, setRequireInitials] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');

  if (showHistory) {
    return <TaskHistory onBack={() => setShowHistory(false)} />;
  }

  const tabConfig = {
    opening: { label: 'Opening', total: 16, icon: '🌅' },
    transition: { label: 'Transition', total: 6, icon: '🔄' },
    closing: { label: 'Closing', total: 34, icon: '🌙' }
  };

  const toggleTask = (taskId) => {
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const getCompletedCount = (tab) => {
    return tasks[tab].filter(t => t.completed).length;
  };

  const getProgressPercentage = (tab) => {
    const completed = getCompletedCount(tab);
    const total = tabConfig[tab].total;
    return Math.round((completed / total) * 100);
  };

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      const newTask = {
        id: Date.now(),
        text: newTaskName.trim(),
        completed: false
      };
      setTasks(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], newTask]
      }));
      setNewTaskName('');
      setShowAddTask(false);
    }
  };

  const deleteTask = (taskId) => {
    setTasks(prev => ({
      ...prev,
      [activeTab]: prev[activeTab].filter(task => task.id !== taskId)
    }));
  };

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
            <button className="foh-icon-btn foh-icon-btn-primary" onClick={() => setShowAddTask(true)} aria-label="Add task">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5v14"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="foh-main">
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
                className={`foh-task-row ${task.completed ? 'completed' : ''}`}
              >
                <button
                  className="foh-grip"
                  aria-label="Drag to reorder task"
                  tabIndex={0}
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
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={requireInitials}
                      onChange={(e) => setRequireInitials(e.target.checked)}
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
