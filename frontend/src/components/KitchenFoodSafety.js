import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './KitchenFoodSafety.css';
import equipmentService from '../services/equipment';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal, HistoryDrawer,
  TextField, SelectField, NumberField,
} from './ui';

const DAYPART_OPTIONS = [
  { value: 'morning', label: '🌅 Morning' },
  { value: 'lunch',   label: '☀️ Lunch' },
  { value: 'dinner',  label: '🌙 Dinner' },
];

const TEMP_KIND_OPTIONS = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'product',   label: 'Product' },
];

const TEMP_UNIT_OPTIONS = [
  { value: 'F', label: '°F' },
  { value: 'C', label: '°C' },
];

// Normalize backend FoodSafetyTask to {id, text, completed, user, time}.
const normalizeTask = (raw) => {
  const comp = raw.today_completion;
  let time = '';
  if (comp?.completed_at) {
    try {
      time = new Date(comp.completed_at).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      });
    } catch {}
  }
  return {
    id: raw.id,
    text: raw.text,
    completed: Boolean(comp),
    user: comp?.completed_by_name || '',
    time,
  };
};

// Normalize backend TemperatureTarget to the row shape the UI uses.
const normalizeTempRow = (raw) => {
  const r = raw.last_reading;
  let displayTime = 'No reading yet';
  if (r?.recorded_at) {
    try {
      const d = new Date(r.recorded_at);
      const isToday = d.toLocaleDateString() === new Date().toLocaleDateString();
      const t = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      displayTime = `${isToday ? 'Today' : d.toLocaleDateString()} at ${t}`;
    } catch {}
  }
  return {
    id: raw.id,
    name: raw.name,
    temp: r ? `${Number(r.value).toFixed(0)}°${r.unit || 'F'}` : '—',
    range: `${Number(raw.expected_min).toFixed(0)}°F - ${Number(raw.expected_max).toFixed(0)}°F`,
    time: displayTime,
    status: r?.status || 'good',
  };
};

const KitchenFoodSafety = ({ onNavigate, user }) => {
  const canManage = isManagerOrAbove(user);
  const [activeTab, setActiveTab] = useState('safety');
  const [activeTaskTab, setActiveTaskTab] = useState('morning');
  const [activeTempTab, setActiveTempTab] = useState('equipment');
  const [tasksByDaypart, setTasksByDaypart] = useState({ morning: [], lunch: [], dinner: [] });
  const [tempsByKind, setTempsByKind] = useState({ equipment: [], product: [] });

  // ---- Modal state ----
  const [recordModal, setRecordModal] = useState(null);     // { target, value, unit }
  const [recordError, setRecordError] = useState('');
  const [taskModal, setTaskModal] = useState(null);         // { id?, daypart, text }
  const [taskError, setTaskError] = useState('');
  const [targetModal, setTargetModal] = useState(null);     // { id?, kind, name, expected_min, expected_max }
  const [targetError, setTargetError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);   // { kind: 'task'|'target', record }
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [morning, lunch, dinner, eqTargets, prodTargets] = await Promise.all([
        equipmentService.listSafetyTasks({ daypart: 'morning' }),
        equipmentService.listSafetyTasks({ daypart: 'lunch' }),
        equipmentService.listSafetyTasks({ daypart: 'dinner' }),
        equipmentService.listTemperatureTargets({ kind: 'equipment' }),
        equipmentService.listTemperatureTargets({ kind: 'product' }),
      ]);
      setTasksByDaypart({
        morning: ((morning.results || morning) || []).map(normalizeTask),
        lunch: ((lunch.results || lunch) || []).map(normalizeTask),
        dinner: ((dinner.results || dinner) || []).map(normalizeTask),
      });
      setTempsByKind({
        equipment: ((eqTargets.results || eqTargets) || []).map(normalizeTempRow),
        product: ((prodTargets.results || prodTargets) || []).map(normalizeTempRow),
      });
    } catch (err) {
      console.error('Failed to load food safety:', err);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleSafetyTask = async (taskId, currentlyCompleted) => {
    setTasksByDaypart((prev) => ({
      ...prev,
      [activeTaskTab]: prev[activeTaskTab].map((t) =>
        t.id === taskId
          ? { ...t, completed: !currentlyCompleted, user: !currentlyCompleted ? 'You' : '', time: !currentlyCompleted ? 'just now' : '' }
          : t
      ),
    }));
    try {
      if (currentlyCompleted) await equipmentService.uncompleteSafetyTask(taskId);
      else await equipmentService.completeSafetyTask(taskId);
    } catch (err) {
      console.error('Safety task toggle failed:', err);
      refresh();
    }
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
    { id: 'equip', label: 'Equip', icon: '🔧' },
    { id: 'safety', label: 'Safety', icon: '🛡️' },
    { id: 'clean', label: 'Clean', icon: '✨' },
    { id: 'lists', label: 'Lists', icon: '📋' },
    { id: 'waste', label: 'Waste', icon: '🗑️' }
  ];

  // KPIs computed from loaded state.
  const stats = useMemo(() => {
    const allTasks = [
      ...tasksByDaypart.morning,
      ...tasksByDaypart.lunch,
      ...tasksByDaypart.dinner,
    ];
    const allTemps = [...tempsByKind.equipment, ...tempsByKind.product];
    const totalT = allTasks.length;
    const doneT = allTasks.filter(t => t.completed).length;
    const completePct = totalT ? Math.round((doneT / totalT) * 100) : 0;
    const morningT = tasksByDaypart.morning;
    const morningDone = morningT.filter(t => t.completed).length;
    const critical = allTemps.filter(t => t.status === 'critical').length;
    const warning = allTemps.filter(t => t.status === 'warning').length;
    return [
      { id: 'complete', label: 'COMPLETE', value: `${completePct}%`, sublabel: 'daily items', icon: '✅', color: '#10b981' },
      { id: 'temps', label: 'TEMPS', value: `${morningDone}/${morningT.length}`, sublabel: 'morning tasks', icon: '🌡️', color: '#6b7280' },
      { id: 'overdue', label: 'WARNING', value: String(warning), sublabel: 'temp warnings', icon: '⚠️', color: '#f59e0b' },
      { id: 'critical', label: 'CRITICAL', value: String(critical), sublabel: 'temp critical', icon: '🔴', color: '#E51636' },
    ];
  }, [tasksByDaypart, tempsByKind]);

  // Aliases that match the original variable names used by the render below.
  const safetyTasks = tasksByDaypart;
  const temperatureLog = tempsByKind;

  const handleTabClick = (tabId) => {
    if (tabId === 'home') {
      onNavigate('kitchen');
    } else if (tabId === 'analytics') {
      onNavigate('kitchen-analytics');
    } else if (tabId === 'equip') {
      onNavigate('kitchen-equipment');
    } else if (tabId === 'safety') {
      onNavigate('kitchen-safety');
    } else if (tabId === 'clean') {
      onNavigate('kitchen-cleaning');
    } else if (tabId === 'lists') {
      onNavigate('kitchen-checklists');
    } else if (tabId === 'waste') {
      onNavigate('kitchen-waste');
    } else {
      setActiveTab(tabId);
    }
  };

  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Record Temperature modal ----
  const handleRecordTemp = () => {
    const targets = tempsByKind[activeTempTab];
    if (!targets.length) return;
    setRecordError('');
    setRecordModal({
      target: targets[0].id,
      value: '',
      unit: 'F',
    });
  };

  const submitRecord = async () => {
    if (!recordModal) return;
    const { target, value, unit } = recordModal;
    if (!target || value === '' || value == null) {
      setRecordError('Pick a target and enter a value.');
      throw new Error('Missing fields');
    }
    try {
      await equipmentService.logReading({
        target,
        value: Number(value),
        unit: unit || 'F',
      });
      setRecordModal(null);
      await refresh();
    } catch (err) {
      setRecordError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- History drawer (recent temperature readings) ----
  const handleViewHistory = async () => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const readings = await equipmentService.listRecentReadings({
        kind: activeTempTab, range: '7d',
      });
      const rows = (readings.results || readings || []).slice(0, 50).map((reading) => ({
        id: reading.id ?? `${reading.target_name}-${reading.recorded_at}`,
        primary: reading.target_name || 'Unknown',
        secondary: `${reading.value}°${reading.unit || 'F'}`,
        timestamp: reading.recorded_at
          ? new Date(reading.recorded_at).toLocaleString('en-US', {
              month: 'short', day: 'numeric',
              hour: 'numeric', minute: '2-digit',
            })
          : '',
        kind: reading.status || 'good',
      }));
      setHistoryRows(rows);
    } catch (err) {
      console.error('Failed to load temperature history:', err);
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---- Manage Safety Tasks (gear over the left column) ----
  const openAddTask = () => {
    setTaskError('');
    setTaskModal({ daypart: activeTaskTab, text: '', order: 0 });
  };

  const openEditTask = (task) => {
    setTaskError('');
    setTaskModal({
      id: task.id,
      daypart: activeTaskTab,
      text: task.text || '',
    });
  };

  const submitTask = async () => {
    if (!taskModal) return;
    const { id, daypart, text } = taskModal;
    if (!text.trim()) {
      setTaskError('Text is required.');
      throw new Error('Missing text');
    }
    try {
      if (id) {
        await equipmentService.updateSafetyTask(id, {
          daypart, text: text.trim(),
        });
      } else {
        await equipmentService.createSafetyTask({
          daypart, text: text.trim(),
          order: (tasksByDaypart[daypart] || []).length,
        });
      }
      setTaskModal(null);
      if (daypart !== activeTaskTab) setActiveTaskTab(daypart);
      await refresh();
    } catch (err) {
      setTaskError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Manage Temperature Targets (gear over the right column) ----
  const openAddTarget = () => {
    setTargetError('');
    setTargetModal({
      kind: activeTempTab,
      name: '',
      expected_min: '',
      expected_max: '',
    });
  };

  const openEditTarget = (target) => {
    setTargetError('');
    setTargetModal({
      id: target.id,
      kind: activeTempTab,
      name: target.name || '',
      // The normalized row only carries strings; pull min/max from the raw row text.
      expected_min: (target.range || '').split(' - ')[0]?.replace('°F', '') || '',
      expected_max: (target.range || '').split(' - ')[1]?.replace('°F', '') || '',
    });
  };

  const submitTarget = async () => {
    if (!targetModal) return;
    const { id, kind, name, expected_min, expected_max } = targetModal;
    if (!name.trim() || expected_min === '' || expected_max === '') {
      setTargetError('Name and both expected temperatures are required.');
      throw new Error('Missing fields');
    }
    try {
      const payload = {
        kind, name: name.trim(),
        expected_min: Number(expected_min),
        expected_max: Number(expected_max),
      };
      if (id) {
        await equipmentService.updateTemperatureTarget(id, payload);
      } else {
        await equipmentService.createTemperatureTarget({
          ...payload,
          order: (tempsByKind[kind] || []).length,
        });
      }
      setTargetModal(null);
      if (kind !== activeTempTab) setActiveTempTab(kind);
      await refresh();
    } catch (err) {
      setTargetError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Delete confirm (shared) ----
  const performDelete = async () => {
    if (!deleteTarget) return;
    const { kind, record } = deleteTarget;
    try {
      if (kind === 'task') {
        await equipmentService.deleteSafetyTask(record.id);
      } else if (kind === 'target') {
        await equipmentService.deleteTemperatureTarget(record.id);
      }
      await refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  // Derived subtitles — these used to be hardcoded strings ("0 remaining for morning" /
  // "14/17 for morning") which lied about real state.
  const activeTaskSubtitle = useMemo(() => {
    const list = safetyTasks[activeTaskTab] || [];
    const remaining = list.filter((t) => !t.completed).length;
    return `${remaining} remaining for ${activeTaskTab}`;
  }, [safetyTasks, activeTaskTab]);

  const activeTempSubtitle = useMemo(() => {
    const list = temperatureLog[activeTempTab] || [];
    const withReadings = list.filter((t) => t.temp && t.temp !== '—').length;
    return `${withReadings}/${list.length} ${activeTempTab} items logged`;
  }, [temperatureLog, activeTempTab]);

  return (
    <div className="kitchen-safety-page">
      {/* Red Header Banner */}
      <div className="kitchen-safety-banner">
        <div className="banner-icon">☀️</div>
        <div className="banner-content">
          <h1 className="banner-title">Good morning, {user?.firstName || 'Demo'}!</h1>
          <p className="banner-date">Monday, April 20</p>
          <p className="banner-subtitle">Let's keep our kitchen running smoothly today</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="kitchen-safety-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`safety-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="safety-action-buttons">
        <button className="safety-btn-history" onClick={handleViewHistory}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12,6 12,12 16,14"/>
          </svg>
          History
        </button>
        <button className="safety-btn-record" onClick={handleRecordTemp}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
          </svg>
          Record Temps
        </button>
      </div>

      {/* Stats Cards */}
      <div className="safety-stats-grid">
        {stats.map(stat => (
          <div key={stat.id} className="safety-stat-card">
            <div className="stat-header">
              <span className="stat-icon">{stat.icon}</span>
              <span className="stat-label" style={{ color: stat.color }}>{stat.label}</span>
            </div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-sublabel">{stat.sublabel}</div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="safety-content-grid">
        {/* Daily Safety Tasks Column */}
        <div className="safety-tasks-column">
          <div className="column-header">
            <div>
              <h3 className="column-title">DAILY SAFETY TASKS</h3>
              <p className="column-subtitle">{activeTaskSubtitle}</p>
            </div>
            {canManage && (
              <div onClick={(e) => e.stopPropagation()}>
                <ActionMenu
                  align="right"
                  actions={[
                    { label: `Add ${activeTaskTab} task`, onClick: openAddTask },
                    ...((safetyTasks[activeTaskTab] || []).map((task) => ([
                      { divider: true },
                      { label: `Edit “${task.text}”`, onClick: () => openEditTask(task) },
                      { label: `Delete “${task.text}”`, destructive: true,
                        onClick: () => setDeleteTarget({ kind: 'task', record: task }) },
                    ])).flat()),
                  ]}
                  trigger={(
                    <button className="column-settings-btn" type="button" aria-label="Manage safety tasks">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </button>
                  )}
                />
              </div>
            )}
          </div>

          {/* Task Tabs */}
          <div className="kfs-task-tabs">
            <button 
              className={`kfs-task-tab ${activeTaskTab === 'morning' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('morning')}
            >
              🌅 Morning
            </button>
            <button 
              className={`kfs-task-tab ${activeTaskTab === 'lunch' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('lunch')}
            >
              ☀️ Lunch <span className="kfs-task-count">10</span>
            </button>
            <button 
              className={`kfs-task-tab ${activeTaskTab === 'dinner' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('dinner')}
            >
              🌙 Dinner <span className="kfs-task-count">10</span>
            </button>
          </div>

          {/* Task List */}
          <div className="kfs-task-list">
            {safetyTasks[activeTaskTab].map(task => (
              <div
                key={task.id}
                className={`kfs-task-item ${task.completed ? 'completed' : ''}`}
                onClick={() => toggleSafetyTask(task.id, task.completed)}
                style={{ cursor: 'pointer' }}
              >
                <div className="kfs-task-checkbox">
                  {task.completed && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </div>
                <div className="kfs-task-content">
                  <div className="kfs-task-text">{task.text}</div>
                  {task.completed && (
                    <div className="kfs-task-meta">{task.user} • {task.time}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Temperature Log Column */}
        <div className="safety-temps-column">
          <div className="column-header">
            <div>
              <h3 className="column-title">TEMPERATURE LOG</h3>
              <p className="column-subtitle">{activeTempSubtitle}</p>
            </div>
            {canManage && (
              <div onClick={(e) => e.stopPropagation()}>
                <ActionMenu
                  align="right"
                  actions={[
                    { label: `Add ${activeTempTab} target`, onClick: openAddTarget },
                    ...((tempsByKind[activeTempTab] || []).map((target) => ([
                      { divider: true },
                      { label: `Edit “${target.name}”`, onClick: () => openEditTarget(target) },
                      { label: `Delete “${target.name}”`, destructive: true,
                        onClick: () => setDeleteTarget({ kind: 'target', record: target }) },
                    ])).flat()),
                  ]}
                  trigger={(
                    <button className="column-settings-btn" type="button" aria-label="Manage temperature targets">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </button>
                  )}
                />
              </div>
            )}
          </div>

          {/* Temp Tabs */}
          <div className="temp-tabs">
            <button 
              className={`temp-tab ${activeTempTab === 'equipment' ? 'active' : ''}`}
              onClick={() => setActiveTempTab('equipment')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Equipment
            </button>
            <button 
              className={`temp-tab ${activeTempTab === 'product' ? 'active' : ''}`}
              onClick={() => setActiveTempTab('product')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Product
            </button>
          </div>

          {/* Temperature List */}
          <div className="temp-list">
            {temperatureLog[activeTempTab].map(item => (
              <div key={item.id} className={`temp-item ${item.status}`}>
                <div className="temp-info">
                  <div className="temp-name">{item.name}</div>
                  <div className="temp-range">{item.range}</div>
                </div>
                <div className="temp-reading">
                  <div className="temp-value">{item.temp}</div>
                  <div className="temp-time">{item.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Record Temperature modal ---- */}
      <FormModal
        isOpen={!!recordModal}
        title={`Record ${activeTempTab.charAt(0).toUpperCase() + activeTempTab.slice(1)} Temperature`}
        submitLabel="Save Reading"
        size="sm"
        onClose={() => setRecordModal(null)}
        onSubmit={submitRecord}
        submitDisabled={!recordModal?.target || recordModal?.value === '' || recordModal?.value == null}
        errorMessage={recordError}
      >
        <SelectField
          label="Target"
          value={recordModal?.target || ''}
          onChange={(v) => setRecordModal((m) => m && ({ ...m, target: Number(v) }))}
          options={(tempsByKind[activeTempTab] || []).map((t) => ({
            value: t.id, label: `${t.name} (${t.range})`,
          }))}
          required
        />
        <NumberField
          label="Temperature"
          value={recordModal?.value ?? ''}
          onChange={(v) => setRecordModal((m) => m && ({ ...m, value: v }))}
          placeholder="e.g. 38"
          step="0.1"
          required
          autoFocus
        />
        <SelectField
          label="Unit"
          value={recordModal?.unit || 'F'}
          onChange={(v) => setRecordModal((m) => m && ({ ...m, unit: v }))}
          options={TEMP_UNIT_OPTIONS}
        />
      </FormModal>

      {/* ---- Add/Edit Safety Task modal ---- */}
      <FormModal
        isOpen={!!taskModal}
        title={taskModal?.id ? 'Edit Safety Task' : 'Add Safety Task'}
        submitLabel={taskModal?.id ? 'Save' : 'Add Task'}
        size="sm"
        onClose={() => setTaskModal(null)}
        onSubmit={submitTask}
        submitDisabled={!taskModal?.text?.trim()}
        errorMessage={taskError}
      >
        <SelectField
          label="Daypart"
          value={taskModal?.daypart || 'morning'}
          onChange={(v) => setTaskModal((m) => m && ({ ...m, daypart: v }))}
          options={DAYPART_OPTIONS}
          required
        />
        <TextField
          label="Task Text"
          value={taskModal?.text || ''}
          onChange={(v) => setTaskModal((m) => m && ({ ...m, text: v }))}
          placeholder="e.g. Verify hand-wash station soap"
          required
          autoFocus
        />
      </FormModal>

      {/* ---- Add/Edit Temperature Target modal ---- */}
      <FormModal
        isOpen={!!targetModal}
        title={targetModal?.id ? 'Edit Temperature Target' : 'Add Temperature Target'}
        submitLabel={targetModal?.id ? 'Save' : 'Add Target'}
        size="sm"
        onClose={() => setTargetModal(null)}
        onSubmit={submitTarget}
        submitDisabled={!targetModal?.name?.trim() || targetModal?.expected_min === '' || targetModal?.expected_max === ''}
        errorMessage={targetError}
      >
        <SelectField
          label="Kind"
          value={targetModal?.kind || 'equipment'}
          onChange={(v) => setTargetModal((m) => m && ({ ...m, kind: v }))}
          options={TEMP_KIND_OPTIONS}
          required
        />
        <TextField
          label="Name"
          value={targetModal?.name || ''}
          onChange={(v) => setTargetModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g. Walk-in Cooler"
          required
          autoFocus
        />
        <NumberField
          label="Expected Min (°F)"
          value={targetModal?.expected_min ?? ''}
          onChange={(v) => setTargetModal((m) => m && ({ ...m, expected_min: v }))}
          placeholder="e.g. 35"
          required
        />
        <NumberField
          label="Expected Max (°F)"
          value={targetModal?.expected_max ?? ''}
          onChange={(v) => setTargetModal((m) => m && ({ ...m, expected_max: v }))}
          placeholder="e.g. 41"
          required
        />
      </FormModal>

      {/* ---- Delete confirm (shared) ---- */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={deleteTarget?.kind === 'target' ? 'Delete temperature target?' : 'Delete safety task?'}
        message={deleteTarget?.kind === 'target'
          ? `“${deleteTarget?.record?.name || ''}” will be archived. Existing readings stay in history.`
          : `“${deleteTarget?.record?.text || ''}” will be archived from the safety checklist.`}
        confirmLabel="Delete"
        destructive
        onConfirm={performDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* ---- History drawer ---- */}
      <HistoryDrawer
        isOpen={historyOpen}
        title="Recent Temperature Readings"
        subtitle={`${activeTempTab.charAt(0).toUpperCase() + activeTempTab.slice(1)} — last 7 days`}
        rows={historyLoading ? [] : historyRows}
        emptyMessage={historyLoading ? 'Loading history…' : 'No recent temperature readings.'}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};

export default KitchenFoodSafety;
