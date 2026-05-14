import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './KitchenFoodSafety.css';
import equipmentService from '../services/equipment';

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
  const [activeTab, setActiveTab] = useState('safety');
  const [activeTaskTab, setActiveTaskTab] = useState('morning');
  const [activeTempTab, setActiveTempTab] = useState('equipment');
  const [tasksByDaypart, setTasksByDaypart] = useState({ morning: [], lunch: [], dinner: [] });
  const [tempsByKind, setTempsByKind] = useState({ equipment: [], product: [] });

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

  const handleRecordTemp = async () => {
    const targets = temperatureLog[activeTempTab];
    if (!targets.length) return;
    const targetName = window.prompt(
      `Record a temperature for which ${activeTempTab} item?\n${targets.map((item) => item.name).join('\n')}`
    );
    if (!targetName?.trim()) return;
    const target = targets.find((item) => item.name.toLowerCase() === targetName.trim().toLowerCase());
    if (!target) return;
    const value = window.prompt(`Temperature for ${target.name}`);
    if (value == null || value === '') return;
    try {
      await equipmentService.logReading({ target: target.id, value: Number(value), unit: 'F' });
      await refresh();
    } catch (err) {
      console.error('Failed to record temperature:', err);
    }
  };

  const handleViewHistory = async () => {
    try {
      const readings = await equipmentService.listRecentReadings({ kind: activeTempTab, range: '7d' });
      const rows = readings.results || readings || [];
      const preview = rows.slice(0, 10).map((reading) => {
        const targetName = reading.target_name || 'Unknown';
        const recordedAt = reading.recorded_at
          ? new Date(reading.recorded_at).toLocaleString('en-US')
          : 'Unknown time';
        return `${targetName}: ${reading.value}${reading.unit || 'F'} at ${recordedAt}`;
      });
      window.alert(preview.length ? preview.join('\n') : 'No recent temperature readings.');
    } catch (err) {
      console.error('Failed to load temperature history:', err);
    }
  };

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
              <p className="column-subtitle">0 remaining for morning</p>
            </div>
            <button className="column-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>

          {/* Task Tabs */}
          <div className="task-tabs">
            <button 
              className={`task-tab ${activeTaskTab === 'morning' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('morning')}
            >
              🌅 Morning
            </button>
            <button 
              className={`task-tab ${activeTaskTab === 'lunch' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('lunch')}
            >
              ☀️ Lunch <span className="task-count">10</span>
            </button>
            <button 
              className={`task-tab ${activeTaskTab === 'dinner' ? 'active' : ''}`}
              onClick={() => setActiveTaskTab('dinner')}
            >
              🌙 Dinner <span className="task-count">10</span>
            </button>
          </div>

          {/* Task List */}
          <div className="task-list">
            {safetyTasks[activeTaskTab].map(task => (
              <div
                key={task.id}
                className={`task-item ${task.completed ? 'completed' : ''}`}
                onClick={() => toggleSafetyTask(task.id, task.completed)}
                style={{ cursor: 'pointer' }}
              >
                <div className="task-checkbox">
                  {task.completed && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20,6 9,17 4,12"/>
                    </svg>
                  )}
                </div>
                <div className="task-content">
                  <div className="task-text">{task.text}</div>
                  {task.completed && (
                    <div className="task-meta">{task.user} • {task.time}</div>
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
              <p className="column-subtitle">14/17 for morning</p>
            </div>
            <button className="column-settings-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
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
    </div>
  );
};

export default KitchenFoodSafety;
