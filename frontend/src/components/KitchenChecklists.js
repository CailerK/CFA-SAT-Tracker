import React, { useState, useMemo, useEffect, useCallback } from 'react';
import kitchenService from '../services/kitchen';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenChecklists.css';
import useCentralDayRefresh from '../hooks/useCentralDayRefresh';
import { isManagerOrAbove } from '../utils/access';

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconHistory = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>);
const IconUsers = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>);
const IconPlus = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);
const IconCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
const parseDateOnly = (iso) => {
  const [year, month, day] = `${iso}`.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// ===== DEMO DATA (see FAKE_DATA.md) =====
const TRANSITION_TASKS = [
  'Dishes',
  'Needs to have enough wraps',
  'Prep chicken',
  'Primary - Stock Tomatoes and Lettuce',
  'Primary - Stock Cheese',
  'Soup Chicken',
  'Trash to the dumpster',
  'Wipe off oven top',
  'Wipe off ice machine top',
  'Cooler cleaned',
  'Use first In coolers',
  'Sweep floors and mop',
  'Change all trash',
  'Stock Mac: shelves full',
  'SAFE Completed',
  'Clean grill',
  'Wipe sides of Grill, Walls, Vent hood, and Henny',
  'Stock Fry Cartons (on shelves and above fry station)',
  'Make sure the menu tab shelve is full',
  'Walk through cooler, freezer, and middle aisle (break down empty boxes, cut box tabs)',
  'Stock all bowls and lids',
  'Check Gluten free buns and grilled buns',
  'Check Raw cabinets (first pull clips, control labels, dated stickers, expired chicken, correct order)',
  'All catering has been communicated and written on set up board',
  'Clean lowboy',
];

const OPENING_TASK_COUNT = 24;
const CLOSING_TASK_COUNT = 35;

const SHIFT_TABS = [
  { id: 'opening', label: 'Opening', emoji: '🌅', totalTasks: OPENING_TASK_COUNT },
  { id: 'transition', label: 'Transition', emoji: '🔄', totalTasks: TRANSITION_TASKS.length },
  { id: 'closing', label: 'Closing', emoji: '🌙', totalTasks: CLOSING_TASK_COUNT },
];

// Normalize a backend KitchenChecklistTask row to {id, text, completed}.
const normalizeRow = (raw) => ({
  id: raw.id,
  text: raw.text,
  completed: Boolean(raw.today_completion),
});

const KitchenChecklists = ({ onNavigate, user }) => {
  const [activeShift, setActiveShift] = useState('transition');
  const [shiftState, setShiftState] = useState({
    opening: [], transition: [], closing: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const canManageTasks = isManagerOrAbove(user);

  const refresh = useCallback(async () => {
    try {
      const grouped = await kitchenService.listChecklistGrouped();
      setShiftState({
        opening: (grouped.opening || []).map(normalizeRow),
        transition: (grouped.transition || []).map(normalizeRow),
        closing: (grouped.closing || []).map(normalizeRow),
      });
    } catch (err) {
      console.error('Failed to load kitchen checklists:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useCentralDayRefresh(refresh);

  const tabs = [
    { id: 'home', label: 'Home', Icon: IconLayoutDashboard },
    { id: 'analytics', label: 'Analytics', Icon: IconBarChart },
    { id: 'equip', label: 'Equip', Icon: IconWrench },
    { id: 'safety', label: 'Safety', Icon: IconShieldCheck },
    { id: 'clean', label: 'Clean', Icon: IconSparkles },
    { id: 'lists', label: 'Lists', Icon: IconClipboardList },
    { id: 'waste', label: 'Waste', Icon: IconTrash },
  ];

  const handleKitchenTabClick = (id) => {
    if (!onNavigate) return;
    switch (id) {
      case 'home': return onNavigate('kitchen');
      case 'analytics': return onNavigate('kitchen-analytics');
      case 'equip': return onNavigate('kitchen-equipment');
      case 'safety': return onNavigate('kitchen-safety');
      case 'clean': return onNavigate('kitchen-cleaning');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  const handleViewHistory = async () => {
    try {
      const res = await kitchenService.getChecklistHistory({ range: '7d' });
      const rows = res.days || [];
      const preview = rows.slice(0, 7).map((day) => {
        const date = parseDateOnly(day.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
        return `${date}: ${day.total?.done || 0}/${day.total?.total || 0}`;
      });
      window.alert(preview.length ? preview.join('\n') : 'No checklist history yet.');
    } catch (err) {
      console.error('Failed to load kitchen checklist history:', err);
    }
  };

  const handleAddTask = async () => {
    if (!canManageTasks) return;
    const text = window.prompt(`New ${activeShift} checklist task`);
    if (!text?.trim()) return;
    try {
      await kitchenService.createChecklistTask({
        shift: activeShift,
        text: text.trim(),
        order: activeTasks.length,
      });
      await refresh();
    } catch (err) {
      console.error('Failed to create kitchen checklist task:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!canManageTasks) return;
    if (!activeTasks.length) return;
    const taskName = window.prompt(
      `Delete which ${activeShift} task?\n${activeTasks.map((task) => task.text).join('\n')}`
    );
    if (!taskName?.trim()) return;
    const target = activeTasks.find(
      (task) => task.text.toLowerCase() === taskName.trim().toLowerCase()
    );
    if (!target) return;
    const confirmed = window.confirm(`Delete "${target.text}"?`);
    if (!confirmed) return;
    try {
      await kitchenService.deleteChecklistTask(target.id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete kitchen checklist task:', err);
    }
  };

  const toggleTask = async (taskId) => {
    const target = shiftState[activeShift].find((t) => t.id === taskId);
    if (!target) return;
    const willBeCompleted = !target.completed;
    // Optimistic flip
    setShiftState((s) => ({
      ...s,
      [activeShift]: s[activeShift].map((t) =>
        t.id === taskId ? { ...t, completed: willBeCompleted } : t
      ),
    }));
    try {
      if (willBeCompleted) await kitchenService.completeChecklistTask(taskId);
      else await kitchenService.uncompleteChecklistTask(taskId);
    } catch (err) {
      console.error('Kitchen checklist toggle failed:', err);
      refresh();
    }
  };

  const activeTasks = useMemo(() => shiftState[activeShift] || [], [shiftState, activeShift]);
  const completedCount = useMemo(() => activeTasks.filter((t) => t.completed).length, [activeTasks]);
  const totalCount = activeTasks.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getShiftSubtitle = (shift) => {
    const st = shiftState[shift.id];
    const done = st.filter((t) => t.completed).length;
    const total = st.length;
    if (total > 0 && done === total) return { type: 'done' };
    return { type: 'count', text: `${done}/${total}` };
  };

  return (
    <div className="sst-page">
      <div className="sst-container kd-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="kch-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kch-hero-pattern)" />
            </svg>
          </div>
          <div className="sst-banner-blur" aria-hidden="true"></div>
          <div className="sst-banner-content">
            <div className="sst-banner-top">
              <span className="sst-banner-emoji" role="img" aria-label="sun">☀️</span>
              <div className="sst-banner-text">
                <h1 className="sst-banner-title">
                  {getGreeting()}, <span className="sst-banner-name">{user?.firstName || 'Demo'}!</span>
                </h1>
                <p className="sst-banner-date">{getCurrentDate()}</p>
              </div>
            </div>
            <div className="sst-banner-divider">
              <span className="sst-banner-line"></span>
              <p className="sst-banner-subtitle">Let's keep our kitchen running smoothly today</p>
            </div>
          </div>
        </div>

        {/* Kitchen 7-tab nav */}
        <nav className="kd-nav">
          <div className="kd-nav-inner">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                className={`kd-tab ${id === 'lists' ? 'active' : ''}`}
                onClick={() => handleKitchenTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Sticky header bar */}
        <header className="kch-header">
          <h2 className="kch-header-title">Kitchen Tasks</h2>
          <div className="kch-header-actions">
            <button type="button" className="kch-header-btn" aria-label="View history" onClick={handleViewHistory}>
              <IconHistory className="kch-header-btn-icon" />
            </button>
            {canManageTasks && (
              <button type="button" className="kch-header-btn" aria-label="Delete task" onClick={handleDeleteTask}>
                <IconUsers className="kch-header-btn-icon" />
              </button>
            )}
            {canManageTasks && (
              <button type="button" className="kch-header-btn kch-header-btn-primary" aria-label="Add task" onClick={handleAddTask}>
                <IconPlus className="kch-header-btn-icon" />
              </button>
            )}
          </div>
        </header>

        {/* Shift pills card */}
        <div className="kch-shifts-card">
          <div className="kch-shifts-row">
            {SHIFT_TABS.map((shift) => {
              const sub = getShiftSubtitle(shift);
              const isActive = activeShift === shift.id;
              return (
                <button
                  key={shift.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`kch-shift-pill ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveShift(shift.id)}
                >
                  <span className="kch-shift-emoji" role="img" aria-hidden="true">{shift.emoji}</span>
                  <span className="kch-shift-label">{shift.label}</span>
                  <div className="kch-shift-sub">
                    {sub.type === 'done' ? (
                      <span className={`kch-shift-sub-done ${isActive ? 'active' : ''}`}>✓ Done</span>
                    ) : (
                      <span className={`kch-shift-sub-count ${isActive ? 'active' : ''}`}>{sub.text}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task list card */}
        <div className="kch-list-card">
          <div className="kch-progress-track">
            <div className="kch-progress-fill" style={{ width: `${percent}%` }}></div>
          </div>

          <div className="kch-task-list">
            {isLoading ? (
              <div className="kch-task-row">
                <span className="kch-task-text">Loading kitchen tasks…</span>
              </div>
            ) : (
              activeTasks.map((task) => (
                <div key={task.id} className="kch-task-row">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.completed}
                    aria-label={`${task.text} - ${task.completed ? 'Mark incomplete' : 'Mark as complete'}`}
                    className={`kch-checkbox ${task.completed ? 'checked' : ''}`}
                    onClick={() => toggleTask(task.id)}
                  >
                    {task.completed && <IconCheck className="kch-checkbox-icon" />}
                  </button>
                  <div className="kch-task-text-wrap">
                    <span className={`kch-task-text ${task.completed ? 'completed' : ''}`}>{task.text}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="kch-list-footer">
            <span className="kch-footer-count">{completedCount} of {totalCount} completed</span>
            <span className="kch-footer-pct">{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenChecklists;
