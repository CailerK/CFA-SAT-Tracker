import React, { useState, useMemo, useEffect, useCallback } from 'react';
import equipmentService from '../services/equipment';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenEquipment.css';

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconCalendarDays = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>);
const IconSettings = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>);
const IconPlus = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="M12 5v14"/></svg>);
const IconFlame = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>);
const IconBeef = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/></svg>);
const IconHistory = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>);
const IconBrush = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>);
const IconAlertCircle = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>);
const IconPencil = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const CATEGORIES = [
  { id: 'hvac', label: 'hvac', emoji: '📦', count: 4 },
  { id: 'cleaning', label: 'cleaning', emoji: '🧽', count: 4 },
  { id: 'pos_tech', label: 'pos tech', emoji: '📦', count: 4 },
  { id: 'safety', label: 'safety', emoji: '📦', count: 4 },
  { id: 'cooking', label: 'cooking', emoji: '🔥', count: 4 },
  { id: 'refrigeration', label: 'refrigeration', emoji: '❄️', count: 4 },
  { id: 'preparation', label: 'preparation', emoji: '🔪', count: 0 },
  { id: 'beverage', label: 'beverage', emoji: '🥤', count: 0 },
];

const EquipIcon = ({ type, className }) => {
  switch (type) {
    case 'beef': return <IconBeef className={className} />;
    case 'flame':
    default: return <IconFlame className={className} />;
  }
};

const KitchenEquipment = ({ onNavigate, user }) => {
  const [activeCategory, setActiveCategory] = useState('cooking');
  const [categoriesRaw, setCategoriesRaw] = useState([]);
  const [equipmentRaw, setEquipmentRaw] = useState([]);

  const refreshCategories = useCallback(async () => {
    try {
      const res = await equipmentService.listCategories();
      setCategoriesRaw(res.results || res || []);
    } catch (err) {
      console.error('Failed to load equipment categories:', err);
    }
  }, []);

  const refreshEquipment = useCallback(async () => {
    try {
      const res = await equipmentService.listEquipment({ category: activeCategory });
      setEquipmentRaw(res.results || res || []);
    } catch (err) {
      console.error('Failed to load equipment:', err);
    }
  }, [activeCategory]);

  useEffect(() => { refreshCategories(); }, [refreshCategories]);
  useEffect(() => { refreshEquipment(); }, [refreshEquipment]);

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
      case 'safety': return onNavigate('kitchen-safety');
      case 'clean': return onNavigate('kitchen-cleaning');
      case 'lists': return onNavigate('kitchen-checklists');
      case 'waste': return onNavigate('kitchen-waste');
      default: return;
    }
  };

  // Map backend equipment rows to the existing UI shape ({id, name, icon, status, schedule}).
  const equipment = useMemo(
    () => equipmentRaw.map((e) => ({
      id: e.id,
      name: e.name,
      icon: e.icon || 'flame',
      // Backend returns 'ok'|'needs_attention'|'down'; UI displays uppercase 'OK'/'NEEDS ATTENTION'/'DOWN'.
      status: (e.status || 'ok').replace('_', ' ').toUpperCase(),
      schedule: e.schedule,  // either null or {id, task, cadence, date, urgency}
    })),
    [equipmentRaw]
  );

  // Categories source-of-truth — fall back to the static CATEGORIES list while loading.
  const categories = categoriesRaw.length
    ? categoriesRaw.map((c) => ({
        id: c.slug, label: c.label, emoji: c.emoji, count: c.count,
      }))
    : CATEGORIES;
  const activeCategoryRow = categoriesRaw.find((category) => category.slug === activeCategory) || null;

  // Running totals derived from real data.
  const runningTotal = equipment.filter((e) => e.status === 'OK').length;
  const runningOf = equipment.length;
  const runningPct = runningOf ? Math.round((runningTotal / runningOf) * 100) : 0;
  const upcomingCount = equipment.filter((item) => item.schedule).length;

  const handleCompleteSchedule = async (scheduleId) => {
    try {
      await equipmentService.completeSchedule(scheduleId);
      await refreshEquipment();
    } catch (err) {
      console.error('Failed to complete maintenance schedule:', err);
    }
  };

  const handleLogAction = async (equipment, kind) => {
    const notes = window.prompt(`Notes for ${equipment.name} (${kind})`, '');
    if (notes == null) return;
    try {
      await equipmentService.addEquipmentLog(equipment.id, { kind, notes });
      await refreshEquipment();
    } catch (err) {
      console.error(`Failed to log ${kind} event:`, err);
    }
  };

  const handleViewHistory = async (equipment) => {
    try {
      const res = await equipmentService.getEquipmentLogs(equipment.id);
      const rows = res.results || res || [];
      const preview = rows.slice(0, 10).map((log) => {
        const when = log.performed_at ? new Date(log.performed_at).toLocaleString('en-US') : 'Unknown time';
        return `${log.kind}: ${log.notes || 'No notes'} (${when})`;
      });
      window.alert(preview.length ? preview.join('\n') : 'No maintenance history yet.');
    } catch (err) {
      console.error('Failed to load maintenance history:', err);
    }
  };

  const handleViewUpcomingTasks = () => {
    const preview = equipment
      .filter((item) => item.schedule)
      .slice(0, 10)
      .map((item) => `${item.name}: ${item.schedule.task} (${item.schedule.cadence}) due ${item.schedule.date}`);
    window.alert(preview.length ? preview.join('\n') : 'No upcoming maintenance schedules in this category.');
  };

  const handleAddCategory = async () => {
    const label = window.prompt('Category label');
    if (!label?.trim()) return;
    const slugDefault = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const slug = window.prompt('Category slug', slugDefault);
    if (!slug?.trim()) return;
    const emoji = window.prompt('Category emoji', '🔧') || '🔧';
    try {
      await equipmentService.createCategory({
        label: label.trim(),
        slug: slug.trim().toLowerCase(),
        emoji: emoji.trim(),
        order: categoriesRaw.length,
      });
      await refreshCategories();
      setActiveCategory(slug.trim().toLowerCase());
    } catch (err) {
      console.error('Failed to create equipment category:', err);
    }
  };

  const handleAddEquipment = async () => {
    if (!activeCategoryRow) return;
    const name = window.prompt(`Equipment name for ${activeCategoryRow.label}`);
    if (!name?.trim()) return;
    const status = window.prompt('Status (ok, needs_attention, down)', 'ok');
    if (!status?.trim()) return;
    const icon = window.prompt('Icon key (flame or beef)', 'flame') || 'flame';
    try {
      await equipmentService.createEquipment({
        category: activeCategoryRow.id,
        name: name.trim(),
        status: status.trim().toLowerCase(),
        icon: icon.trim().toLowerCase(),
      });
      await Promise.all([refreshCategories(), refreshEquipment()]);
    } catch (err) {
      console.error('Failed to create equipment:', err);
    }
  };

  const handleManageEquipment = async () => {
    const action = window.prompt('Type add, edit, or delete equipment', 'add');
    if (!action) return;
    const choice = action.trim().toLowerCase();
    if (choice === 'add') {
      await handleAddEquipment();
      return;
    }
    if (!equipment.length) return;

    const name = window.prompt(
      `Which equipment?\n${equipment.map((item) => item.name).join('\n')}`,
      equipment[0]?.name || ''
    );
    if (!name?.trim()) return;
    const target = equipment.find((item) => item.name.toLowerCase() === name.trim().toLowerCase());
    if (!target) return;

    try {
      if (choice === 'delete') {
        const confirmed = window.confirm(`Delete "${target.name}"?`);
        if (!confirmed) return;
        await equipmentService.removeEquipment(target.id);
        await Promise.all([refreshCategories(), refreshEquipment()]);
        return;
      }

      if (choice !== 'edit') return;
      const nextName = window.prompt('Equipment name', target.name);
      if (!nextName?.trim()) return;
      const nextStatus = window.prompt('Status (ok, needs_attention, down)', target.status.toLowerCase().replace(/ /g, '_'));
      if (!nextStatus?.trim()) return;
      await equipmentService.updateEquipment(target.id, {
        name: nextName.trim(),
        status: nextStatus.trim().toLowerCase(),
      });
      await refreshEquipment();
    } catch (err) {
      console.error('Failed to manage equipment:', err);
    }
  };

  const handleAddSchedule = async (equipmentItem) => {
    const taskName = window.prompt(`Maintenance task for ${equipmentItem.name}`);
    if (!taskName?.trim()) return;
    const cadence = window.prompt('Cadence (daily, weekly, monthly, quarterly, yearly)', 'weekly');
    if (!cadence?.trim()) return;
    const nextDue = window.prompt('Next due date (YYYY-MM-DD)');
    if (!nextDue?.trim()) return;
    try {
      await equipmentService.createEquipmentSchedule(equipmentItem.id, {
        task_name: taskName.trim(),
        cadence: cadence.trim().toLowerCase(),
        next_due: nextDue.trim(),
      });
      await refreshEquipment();
    } catch (err) {
      console.error('Failed to create equipment schedule:', err);
    }
  };

  const handleEditSchedule = async (equipmentItem) => {
    if (!equipmentItem.schedule) return;
    const taskName = window.prompt('Maintenance task', equipmentItem.schedule.task);
    if (!taskName?.trim()) return;
    const cadence = window.prompt('Cadence', equipmentItem.schedule.cadence);
    if (!cadence?.trim()) return;
    const nextDue = window.prompt('Next due date (YYYY-MM-DD)', equipmentItem.schedule.next_due || '');
    if (!nextDue?.trim()) return;
    try {
      await equipmentService.updateEquipmentSchedule(equipmentItem.schedule.id, {
        task_name: taskName.trim(),
        cadence: cadence.trim().toLowerCase(),
        next_due: nextDue.trim(),
      });
      await refreshEquipment();
    } catch (err) {
      console.error('Failed to update equipment schedule:', err);
    }
  };

  const handleDeleteSchedule = async (equipmentItem) => {
    if (!equipmentItem.schedule) return;
    const confirmed = window.confirm(`Delete the maintenance schedule for ${equipmentItem.name}?`);
    if (!confirmed) return;
    try {
      await equipmentService.deleteEquipmentSchedule(equipmentItem.schedule.id);
      await refreshEquipment();
    } catch (err) {
      console.error('Failed to delete equipment schedule:', err);
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
                <pattern id="ke-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ke-hero-pattern)" />
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
                className={`kd-tab ${id === 'equip' ? 'active' : ''}`}
                onClick={() => handleKitchenTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Summary toolbar */}
        <div className="ke-toolbar">
          <div className="ke-toolbar-running">
            <span className="ke-running-count">
              <span className="ke-running-num">{runningTotal}/{runningOf}</span>
              <span className="ke-running-label">running</span>
            </span>
            <div className="ke-running-track">
              <div className="ke-running-fill" style={{ width: `${runningPct}%` }}></div>
            </div>
          </div>
          <div className="ke-toolbar-actions">
            <button type="button" className="ke-toolbar-btn" aria-label="Upcoming tasks" onClick={handleViewUpcomingTasks}>
              <IconCalendarDays className="ke-toolbar-btn-icon" />
              <span className="ke-badge">{upcomingCount}</span>
            </button>
            <button type="button" className="ke-toolbar-btn" aria-label="Manage equipment" onClick={handleManageEquipment}>
              <IconSettings className="ke-toolbar-btn-icon" />
            </button>
          </div>
        </div>

        {/* Category chips */}
        <div className="ke-cats-wrap">
          <div className="ke-cats">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`ke-cat ${activeCategory === c.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(c.id)}
              >
                <span className="ke-cat-emoji" role="img" aria-hidden="true">{c.emoji}</span>
                <span className="ke-cat-label">{c.label}</span>
                <span className="ke-cat-count">{c.count}</span>
              </button>
            ))}
            <button type="button" className="ke-cat ke-cat-add" onClick={handleAddCategory}>
              <IconPlus className="ke-cat-add-icon" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Equipment grid */}
        <div className="ke-grid-wrap">
          {equipment.length === 0 ? (
            <div className="ke-empty">
              <p className="ke-empty-title">No equipment in this category yet</p>
              <p className="ke-empty-sub">Add equipment to start tracking maintenance and cleaning.</p>
              <button type="button" className="ke-action ke-action-amber" onClick={handleAddEquipment}>
                <IconPlus className="ke-action-icon" /> <span>Add Equipment</span>
              </button>
            </div>
          ) : (
            <div className="ke-grid">
              {equipment.map((eq) => (
                <article key={eq.id} className="ke-card">
                  <div className="ke-card-head">
                    <div className="ke-card-icon">
                      <EquipIcon type={eq.icon} className="ke-card-icon-svg" />
                    </div>
                    <div className="ke-card-name-wrap">
                      <h3 className="ke-card-name">{eq.name}</h3>
                    </div>
                    <span className="ke-status-pill">{eq.status}</span>
                  </div>

                  {eq.schedule ? (
                    <div className="ke-schedule">
                      <div className="ke-schedule-row">
                        <IconWrench className="ke-schedule-icon" />
                        <div className="ke-schedule-meta">
                          <span className="ke-schedule-task">{eq.schedule.task}</span>
                          <span className="ke-schedule-dot">·</span>
                          <span className="ke-schedule-sub">{eq.schedule.cadence}</span>
                          <span className="ke-schedule-dot">·</span>
                          <span className="ke-schedule-sub">{eq.schedule.date}</span>
                          <span className="ke-schedule-urgency">{eq.schedule.urgency}</span>
                        </div>
                        <div className="ke-schedule-actions">
                          <button className="ke-schedule-mini" type="button" aria-label="Edit" onClick={() => handleEditSchedule(eq)}>
                            <IconPencil className="ke-schedule-mini-icon" />
                          </button>
                          <button className="ke-schedule-mini ke-schedule-mini-delete" type="button" aria-label="Delete" onClick={() => handleDeleteSchedule(eq)}>
                            <IconTrash className="ke-schedule-mini-icon" />
                          </button>
                          <button className="ke-schedule-done" type="button" onClick={() => handleCompleteSchedule(eq.schedule.id)}>Done</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="ke-no-schedule" onClick={() => handleAddSchedule(eq)}>Add maintenance schedule</button>
                  )}

                  <div className="ke-card-actions">
                    <button type="button" className="ke-action ke-action-gray" aria-label="View history" onClick={() => handleViewHistory(eq)}>
                      <IconHistory className="ke-action-icon" /> <span>History</span>
                    </button>
                    <button type="button" className="ke-action ke-action-amber" aria-label="Add maintenance" onClick={() => handleLogAction(eq, 'maintenance')}>
                      <IconWrench className="ke-action-icon" /> <span>Maint.</span>
                    </button>
                    <button type="button" className="ke-action ke-action-blue" aria-label="Add cleaning" onClick={() => handleLogAction(eq, 'cleaning')}>
                      <IconBrush className="ke-action-icon" /> <span>Clean</span>
                    </button>
                    <button type="button" className="ke-action ke-action-red" aria-label="Report issue" onClick={() => handleLogAction(eq, 'issue')}>
                      <IconAlertCircle className="ke-action-icon" /> <span>Issue</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KitchenEquipment;
