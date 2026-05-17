import React, { useState, useEffect, useCallback } from 'react';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenCleaning.css';
import cleaningService from '../services/cleaning';
import useCentralDayRefresh from '../hooks/useCentralDayRefresh';
import { isManagerOrAbove } from '../utils/access';
import { FormModal, HistoryDrawer, TextField, SelectField } from './ui';

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconPlus = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const FREQUENCIES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

const KitchenCleaning = ({ onNavigate, user }) => {
  const [activeFrequency, setActiveFrequency] = useState('daily');
  const [tasksByFreq, setTasksByFreq] = useState({ daily: [], weekly: [], monthly: [] });
  const [isLoading, setIsLoading] = useState(true);
  const canManageTasks = isManagerOrAbove(user);

  // Modal state.
  const [addModal, setAddModal] = useState(null); // { name, frequency } | null
  const [addError, setAddError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const grouped = await cleaningService.listGroupedByFrequency({ scope: 'kitchen' });
      setTasksByFreq({
        daily: grouped.daily || [],
        weekly: grouped.weekly || [],
        monthly: grouped.monthly || [],
      });
    } catch (err) {
      console.error('Failed to load kitchen cleaning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useCentralDayRefresh(refresh);

  const tasks = tasksByFreq[activeFrequency] || [];
  const doneToday = tasks.filter(t => t.today_completion).length;
  const totalToday = tasks.length;

  const toggleTask = async (taskId, currentlyCompleted) => {
    // Optimistic
    setTasksByFreq(prev => ({
      ...prev,
      [activeFrequency]: prev[activeFrequency].map(t =>
        t.id === taskId
          ? { ...t, today_completion: currentlyCompleted ? null : { id: 'optimistic' } }
          : t
      ),
    }));
    try {
      if (currentlyCompleted) await cleaningService.uncomplete(taskId);
      else await cleaningService.complete(taskId);
    } catch (err) {
      console.error('Kitchen cleaning toggle failed:', err);
      refresh();
    }
  };

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
      case 'lists': return onNavigate('kitchen-checklists');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  const handleViewHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await cleaningService.getHistory({ scope: 'kitchen' });
      const rows = (res.completions || []).slice(0, 30).map((entry) => {
        const when = entry.completed_at
          ? new Date(entry.completed_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : entry.date || '';
        return {
          id: entry.id ?? `${entry.task_name}-${when}`,
          primary: entry.task_name || 'Unnamed task',
          secondary: `${entry.frequency || 'task'} — ${entry.completed_by_name || 'Unknown'}`,
          timestamp: when,
          kind: 'good',
        };
      });
      setHistoryRows(rows);
    } catch (err) {
      console.error('Failed to load kitchen cleaning history:', err);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Open Add Task FormModal (replaces chained window.prompt).
  const handleAddTask = () => {
    if (!canManageTasks) return;
    setAddError('');
    setAddModal({ name: '', frequency: activeFrequency });
  };

  const submitAddTask = async () => {
    if (!addModal) return;
    const name = addModal.name.trim();
    if (!name) {
      setAddError('Task name is required.');
      throw new Error('Missing name');
    }
    try {
      const order = (tasksByFreq[addModal.frequency] || []).length;
      await cleaningService.create({
        scope: 'kitchen',
        name,
        frequency: addModal.frequency,
        order,
      });
      setAddModal(null);
      if (addModal.frequency !== activeFrequency) setActiveFrequency(addModal.frequency);
      await refresh();
    } catch (err) {
      const detail = err?.data
        ? Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' \u2022 ')
        : (err?.message || 'Save failed.');
      setAddError(detail);
      throw err;
    }
  };

  return (
    <div className="sst-page">
      <div className="sst-container kd-container">
        {/* Red Hero Banner */}
        <div className="sst-banner">
          <div className="sst-banner-pattern" aria-hidden="true">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="kcl-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kcl-hero-pattern)" />
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
                className={`kd-tab ${id === 'clean' ? 'active' : ''}`}
                onClick={() => handleKitchenTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Page header */}
        <div className="kcl-header">
          <div className="kcl-header-left">
            <div className="kcl-header-icon">
              <IconSparkles className="kcl-header-icon-svg" />
            </div>
            <div>
              <h2 className="kcl-header-title">Cleaning &amp; Maintenance</h2>
              <p className="kcl-header-sub">{doneToday} of {totalToday} done today</p>
            </div>
          </div>
          <div className="kcl-header-actions">
            <button type="button" className="kcl-btn kcl-btn-outline" onClick={handleViewHistory}>History</button>
            {canManageTasks && (
              <button type="button" className="kcl-btn kcl-btn-primary" onClick={handleAddTask}>
                <IconPlus className="kcl-btn-icon" /> Add Task
              </button>
            )}
          </div>
        </div>

        {/* Frequency chips */}
        <div className="kcl-chips-wrap">
          <div className="kcl-chips">
            {FREQUENCIES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`kcl-chip ${activeFrequency === f.id ? 'active' : ''}`}
                onClick={() => setActiveFrequency(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task list / empty */}
        <div className="kcl-list">
          {isLoading ? (
            <div className="kcl-empty">
              <p className="kcl-empty-sub">Loading…</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="kcl-empty">
              <div className="kcl-empty-emoji">🧹</div>
              <p className="kcl-empty-title">No tasks</p>
              <p className="kcl-empty-sub">
                {canManageTasks ? 'Add a task to get started' : 'No cleaning tasks are scheduled right now'}
              </p>
            </div>
          ) : (
            tasks.map((t) => {
              const completed = Boolean(t.today_completion);
              return (
                <div
                  key={t.id}
                  className={`kcl-task ${completed ? 'completed' : ''}`}
                  onClick={() => toggleTask(t.id, completed)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                  }}
                >
                  <span
                    style={{
                      width: 24, height: 24, borderRadius: 6,
                      border: '2px solid #d1d5db',
                      background: completed ? '#E51636' : '#ffffff',
                      borderColor: completed ? '#E51636' : '#d1d5db',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                      transition: 'all 0.2s ease-out',
                    }}
                  >
                    {completed && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </span>
                  <span style={{ textDecoration: completed ? 'line-through' : 'none', color: completed ? '#6b7280' : '#111827' }}>
                    {t.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Task modal */}
      <FormModal
        isOpen={!!addModal}
        title="Add Cleaning Task"
        submitLabel="Add Task"
        size="sm"
        onClose={() => setAddModal(null)}
        onSubmit={submitAddTask}
        submitDisabled={!addModal?.name?.trim()}
        errorMessage={addError}
      >
        <TextField
          label="Task Name"
          value={addModal?.name || ''}
          onChange={(v) => setAddModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g. Wipe down ice machine"
          required
          autoFocus
        />
        <SelectField
          label="Frequency"
          value={addModal?.frequency || 'daily'}
          onChange={(v) => setAddModal((m) => m && ({ ...m, frequency: v }))}
          options={FREQUENCIES.map((f) => ({ value: f.id, label: f.label }))}
          required
        />
      </FormModal>

      {/* History drawer */}
      <HistoryDrawer
        isOpen={historyOpen}
        title="Kitchen Cleaning History"
        subtitle="Last 30 days of completions"
        rows={historyLoading ? [] : historyRows}
        emptyMessage={historyLoading ? 'Loading history…' : 'No recent kitchen cleaning history yet.'}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};

export default KitchenCleaning;
