import React, { useState, useMemo, useEffect, useCallback } from 'react';
import kitchenService from '../services/kitchen';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenWasteTracker.css';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal,
  TextField, NumberField, SelectField, DatePicker,
} from './ui';

// ===== Icons =====
const IconLayoutDashboard = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>);
const IconBarChart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>);
const IconWrench = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
const IconShieldCheck = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>);
const IconSparkles = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>);
const IconClipboardList = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>);
const IconTrash = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>);
const IconHeart = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>);
const IconCalendar = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>);
const IconX = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
const getCurrentDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const MEAL_PERIODS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
];

// Format a backend ISO datetime as "9:40 AM" for the entries list.
const formatTime = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

// Normalize a backend WasteEntry to the row shape the existing UI uses.
const normalizeEntry = (raw) => ({
  id: raw.id,
  name: raw.menu_item_name || 'Item',
  qty: raw.qty,
  unit: raw.unit || 'pieces',
  price: Number(raw.unit_price_at_time || 0),
  time: formatTime(raw.recorded_at),
  // Keep raw menu_item id around so we can re-log etc.
  menuItemId: raw.menu_item,
});

// Format a yyyy-mm-dd string into 'Today' / 'Yesterday' / 'Apr 18'.
const formatDateChip = (iso) => {
  if (!iso) return 'Today';
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  if (iso === todayIso) return 'Today';
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (iso === y.toISOString().slice(0, 10)) return 'Yesterday';
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return iso; }
};

const KitchenWasteTracker = ({ onNavigate, user }) => {
  const canManage = isManagerOrAbove(user);
  const [mode, setMode] = useState('waste'); // waste | donations
  const [activeMeal, setActiveMeal] = useState('lunch');
  const [selectedReason, setSelectedReason] = useState(null);
  const [entries, setEntries] = useState([]);
  // ISO yyyy-mm-dd — controls which day's entries we show.
  const [entriesDate, setEntriesDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Server-loaded catalogs.
  const [menuItemsRaw, setMenuItemsRaw] = useState([]); // [{id, name, emoji, unit_price, meal_period_slug}]
  const [mealPeriodsRaw, setMealPeriodsRaw] = useState([]);
  const [reasonsRaw, setReasonsRaw] = useState([]);

  // ---- Modal state ----
  const [itemsManagerOpen, setItemsManagerOpen] = useState(false);
  const [itemModal, setItemModal] = useState(null);   // { id?, meal_period, name, emoji, unit_price }
  const [itemError, setItemError] = useState('');
  const [bulkModal, setBulkModal] = useState(null);   // { rows: [{ menu_item, qty }] }
  const [bulkError, setBulkError] = useState('');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null); // menu item record
  const [notImplemented, setNotImplemented] = useState(null);

  // Load menu items for the active meal whenever it changes.
  const refreshMenuItems = useCallback(async () => {
    try {
      const res = await kitchenService.listMenuItems({ meal: activeMeal });
      setMenuItemsRaw(res.results || res || []);
    } catch (err) {
      console.error('Failed to load menu items:', err);
    }
  }, [activeMeal]);

  useEffect(() => { refreshMenuItems(); }, [refreshMenuItems]);

  // Load entries for the selected date.
  const todayIso = new Date().toISOString().slice(0, 10);
  const refreshEntries = useCallback(async () => {
    try {
      // Backend accepts 'today' or an ISO yyyy-mm-dd string.
      const dateParam = entriesDate === todayIso ? 'today' : entriesDate;
      const res = await kitchenService.listEntries({ date: dateParam });
      const rows = res.results || res || [];
      setEntries(rows.map(normalizeEntry));
    } catch (err) {
      console.error('Failed to load waste entries:', err);
    }
  }, [entriesDate, todayIso]);

  useEffect(() => { refreshEntries(); }, [refreshEntries]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reasons, meals] = await Promise.all([
          kitchenService.listReasons(),
          kitchenService.listMealPeriods(),
        ]);
        if (!cancelled) {
          setReasonsRaw(reasons.results || reasons || []);
          setMealPeriodsRaw(meals.results || meals || []);
        }
      } catch (err) {
        console.error('Failed to load waste reasons:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      case 'lists': return onNavigate('kitchen-checklists');
      default: return;
    }
  };

  // Map backend menu items to the existing UI shape ({id, name, emoji, price}).
  const menuItems = useMemo(
    () => menuItemsRaw.map((m) => ({
      id: m.id,
      name: m.name,
      emoji: m.emoji,
      price: Number(m.unit_price || 0),
    })),
    [menuItemsRaw]
  );
  const totalWaste = useMemo(() => entries.reduce((s, e) => s + e.qty * e.price, 0), [entries]);

  // Top item across the currently-displayed day's entries (replaces hardcoded
  // "Filet / 12:15 PM"). Sums dollars by item name and keeps the latest time.
  const mostWasted = useMemo(() => {
    if (!entries.length) return null;
    const byName = new Map();
    for (const e of entries) {
      const prev = byName.get(e.name) || { name: e.name, total: 0, time: e.time };
      prev.total += e.qty * e.price;
      // entries come back newest-first from the backend, so the first time we
      // see a name has the most recent timestamp.
      byName.set(e.name, prev);
    }
    let best = null;
    for (const row of byName.values()) {
      if (!best || row.total > best.total) best = row;
    }
    return best;
  }, [entries]);

  // Tap a menu tile → POST a new waste entry with qty 1 and the selected reason.
  const handleItemTap = async (item) => {
    // Optimistic insert at the top.
    const tempId = `tmp-${Date.now()}`;
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setEntries((prev) => [
      { id: tempId, name: item.name, qty: 1, unit: 'pieces', price: item.price, time: now, menuItemId: item.id },
      ...prev,
    ]);
    try {
      const created = await kitchenService.logEntry({
        menu_item: item.id,
        qty: 1,
        unit: 'pieces',
        reason: selectedReason || null,
      });
      // Swap the temp row with the real one.
      setEntries((prev) => prev.map((e) =>
        e.id === tempId ? normalizeEntry(created) : e
      ));
    } catch (err) {
      console.error('Log waste entry failed:', err);
      // Roll back.
      setEntries((prev) => prev.filter((e) => e.id !== tempId));
    }
  };

  const handleDeleteEntry = async (id) => {
    const prev = entries;
    setEntries((curr) => curr.filter((e) => e.id !== id));
    // tmp-* IDs are local-only, no backend roundtrip.
    if (typeof id === 'string' && id.startsWith('tmp-')) return;
    try {
      await kitchenService.deleteEntry(id);
    } catch (err) {
      console.error('Delete waste entry failed:', err);
      setEntries(prev);
    }
  };

  // "Custom Entry" creates a real menu item for the current meal, then logs
  // a waste entry against it so the record survives refreshes.
  const canAddCustom = customName.trim() && customQty && customPrice;
  const handleAddCustom = async () => {
    if (!canAddCustom) return;
    try {
      const mealPeriod = mealPeriodsRaw.find((item) => item.slug === activeMeal);
      if (!mealPeriod) return;
      const createdItem = await kitchenService.createMenuItem({
        meal_period: mealPeriod.id,
        name: customName.trim(),
        emoji: '📝',
        unit_price: Number(customPrice),
      });
      await kitchenService.logEntry({
        menu_item: createdItem.id,
        qty: Number(customQty),
        unit: 'pieces',
        reason: selectedReason || null,
      });
      setCustomName('');
      setCustomQty('');
      setCustomPrice('');
      await refreshEntries();
      await refreshMenuItems();
    } catch (err) {
      console.error('Failed to create custom waste entry:', err);
    }
  };

  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Items Manager (⚙️ Items + 💲 Prices both open this) ----
  const openAddItem = () => {
    setItemError('');
    const meal = mealPeriodsRaw.find((m) => m.slug === activeMeal);
    setItemModal({
      meal_period: meal?.id || mealPeriodsRaw[0]?.id || null,
      name: '',
      emoji: '📝',
      unit_price: '',
    });
  };

  const openEditItem = (item) => {
    setItemError('');
    setItemModal({
      id: item.id,
      meal_period: item.meal_period,
      name: item.name,
      emoji: item.emoji || '',
      unit_price: item.unit_price ?? '',
    });
  };

  const submitItem = async () => {
    if (!itemModal) return;
    const { id, meal_period, name, emoji, unit_price } = itemModal;
    if (!name.trim() || unit_price === '' || unit_price == null) {
      setItemError('Name and price are required.');
      throw new Error('Missing fields');
    }
    try {
      const payload = {
        meal_period, name: name.trim(),
        emoji: emoji || '📝',
        unit_price: Number(unit_price),
      };
      if (id) {
        await kitchenService.updateMenuItem(id, payload);
      } else {
        await kitchenService.createMenuItem(payload);
      }
      setItemModal(null);
      await refreshMenuItems();
    } catch (err) {
      setItemError(buildErrorDetail(err));
      throw err;
    }
  };

  const performDeleteItem = async () => {
    if (!deleteItem) return;
    try {
      await kitchenService.deleteMenuItem(deleteItem.id);
      setDeleteItem(null);
      await refreshMenuItems();
    } catch (err) {
      console.error('Failed to delete menu item:', err);
      setDeleteItem(null);
    }
  };

  // ---- Bulk Entry ----
  const openBulkEntry = () => {
    setBulkError('');
    setBulkModal({
      rows: menuItems.slice(0, 8).map((m) => ({ menu_item: m.id, qty: '' })),
    });
  };

  const submitBulk = async () => {
    if (!bulkModal) return;
    const valid = bulkModal.rows.filter((r) => Number(r.qty) > 0);
    if (!valid.length) {
      setBulkError('Enter a quantity for at least one item.');
      throw new Error('No qty');
    }
    try {
      for (const row of valid) {
        await kitchenService.logEntry({
          menu_item: row.menu_item,
          qty: Number(row.qty),
          unit: 'pieces',
          reason: selectedReason || null,
        });
      }
      setBulkModal(null);
      await refreshEntries();
    } catch (err) {
      setBulkError(buildErrorDetail(err));
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
                <pattern id="kwt-hero-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#kwt-hero-pattern)" />
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
                className={`kd-tab ${id === 'waste' ? 'active' : ''}`}
                onClick={() => handleKitchenTabClick(id)}
              >
                <Icon className="kd-tab-icon" />
                <span className="kd-tab-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Waste / Donations mode pills */}
        <div className="kwt-mode-wrap">
          <button
            type="button"
            className={`kwt-mode-btn ${mode === 'waste' ? 'active' : ''}`}
            onClick={() => setMode('waste')}
          >
            <IconTrash className="kwt-mode-icon" /> Waste
          </button>
          <button
            type="button"
            className={`kwt-mode-btn ${mode === 'donations' ? 'active' : ''}`}
            onClick={() => setMode('donations')}
          >
            <IconHeart className="kwt-mode-icon" /> Donations
          </button>
        </div>

        {/* KPI summary */}
        <div className="kwt-kpis">
          <div className="kwt-kpi">
            <div className="kwt-kpi-head">
              <span className="kwt-kpi-emoji">💵</span>
              <span className="kwt-kpi-label">{formatDateChip(entriesDate) === 'Today' ? "Today's Waste" : `${formatDateChip(entriesDate)}'s Waste`}</span>
            </div>
            <p className="kwt-kpi-value">${totalWaste.toFixed(2)}</p>
            <p className="kwt-kpi-sub">{entries.length} items logged</p>
          </div>
          <div className="kwt-kpi">
            <div className="kwt-kpi-head">
              <span className="kwt-kpi-emoji">📦</span>
              <span className="kwt-kpi-label">Most Wasted</span>
            </div>
            <p className="kwt-kpi-value kwt-kpi-value-sm">{mostWasted?.name || '—'}</p>
            <p className="kwt-kpi-sub">{mostWasted ? `Last: ${mostWasted.time}` : 'No entries yet'}</p>
          </div>
        </div>

        {/* Items / Prices quick actions */}
        <div className="kwt-quick-actions">
          {canManage && (
            <>
              <button type="button" className="kwt-quick-btn" onClick={() => setItemsManagerOpen(true)}>⚙️ Items</button>
              <button type="button" className="kwt-quick-btn" onClick={() => setItemsManagerOpen(true)}>💲 Prices</button>
            </>
          )}
        </div>

        {/* Bulk Entry */}
        <button type="button" className="kwt-bulk-btn" onClick={openBulkEntry} disabled={!menuItems.length}>📝 Bulk Entry</button>

        {/* Menu items card */}
        <section className="kwt-items-card">
          <div className="kwt-meal-pills">
            {MEAL_PERIODS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`kwt-meal-pill ${activeMeal === m.id ? 'active' : ''}`}
                onClick={() => setActiveMeal(m.id)}
              >
                <span className="kwt-meal-emoji">{m.emoji}</span>
                <span className="kwt-meal-label">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="kwt-items-grid">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="kwt-item-tile"
                onClick={() => handleItemTap(item)}
              >
                <span className="kwt-item-emoji">{item.emoji}</span>
                <span className="kwt-item-name">{item.name}</span>
                <span className="kwt-item-price">${item.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Waste Reason card */}
        <section className="kwt-reason-card">
          <p className="kwt-section-label">Waste Reason</p>
          <div className="kwt-reasons">
            {reasonsRaw.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`kwt-reason ${selectedReason === r.id ? 'active' : ''}`}
                onClick={() => setSelectedReason(r.id === selectedReason ? null : r.id)}
              >
                <span className="kwt-reason-emoji">{r.emoji}</span>
                <span className="kwt-reason-label">{r.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Today's Entries card */}
        <section className="kwt-entries-card">
          <div className="kwt-entries-head">
            <div className="kwt-entries-title-wrap">
              <p className="kwt-section-label kwt-section-label-inline">
                {formatDateChip(entriesDate) === 'Today' ? "Today's Entries" : `Entries for ${formatDateChip(entriesDate)}`}
              </p>
              <button type="button" className="kwt-date-chip" onClick={() => setDatePickerOpen(true)}>
                <IconCalendar className="kwt-date-chip-icon" /> {formatDateChip(entriesDate)}
              </button>
            </div>
            <button
              type="button"
              className="kwt-notes-btn"
              onClick={() => setNotImplemented({
                title: 'Notes — coming soon',
                message: 'Per-day waste notes are on the roadmap. For now, capture context in your shift summary.',
              })}
            >📝 Notes</button>
          </div>
          <div className="kwt-entries-list">
            {entries.map((e) => (
              <div key={e.id} className="kwt-entry">
                <div className="kwt-entry-text">
                  <p className="kwt-entry-name">{e.name}</p>
                  <div className="kwt-entry-meta">
                    <span className="kwt-entry-qty">{e.qty} {e.unit}</span>
                    <span className="kwt-entry-price">${(e.qty * e.price).toFixed(2)}</span>
                    <span className="kwt-entry-time">{e.time}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="kwt-entry-delete"
                  aria-label={`Delete ${e.name} entry`}
                  onClick={() => handleDeleteEntry(e.id)}
                >
                  <IconX className="kwt-entry-delete-icon" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Entry */}
        <section className="kwt-custom-card">
          <p className="kwt-section-label">Custom Entry</p>
          <div className="kwt-custom-fields">
            <input
              type="text"
              className="kwt-input"
              placeholder="Item name"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
            />
            <div className="kwt-custom-row">
              <input
                type="number"
                className="kwt-input"
                placeholder="Qty"
                value={customQty}
                onChange={(e) => setCustomQty(e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                className="kwt-input"
                placeholder="Price ($)"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="kwt-add-btn"
              disabled={!canAddCustom}
              onClick={handleAddCustom}
            >
              ➕ Add Entry
            </button>
          </div>
        </section>
      </div>

      {/* ---- Items Manager modal ---- */}
      <FormModal
        isOpen={itemsManagerOpen}
        title={`Manage ${activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1)} Menu Items`}
        submitLabel="Done"
        size="md"
        onClose={() => setItemsManagerOpen(false)}
        onSubmit={async () => { setItemsManagerOpen(false); }}
      >
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Add, rename, or re-price items used to log waste. Switch meal periods with the pills at the top of the page.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', maxHeight: 320, overflowY: 'auto' }}>
          {menuItems.length === 0 ? (
            <li style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
              No items yet for {activeMeal}.
            </li>
          ) : menuItems.map((item) => (
            <li
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 4px', borderBottom: '1px solid #f3f4f6',
              }}
            >
              <span style={{ fontSize: 20 }}>{item.emoji || '📝'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{item.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>${item.price.toFixed(2)}</div>
              </div>
              <ActionMenu
                align="right"
                actions={[
                  { label: 'Edit', onClick: () => openEditItem(menuItemsRaw.find((m) => m.id === item.id)) },
                  { divider: true },
                  { label: 'Delete', destructive: true, onClick: () => setDeleteItem(menuItemsRaw.find((m) => m.id === item.id)) },
                ]}
                trigger={(
                  <button
                    type="button"
                    style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: '#6b7280' }}
                    aria-label={`More actions for ${item.name}`}
                  >
                    ⋮
                  </button>
                )}
              />
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={openAddItem}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 8,
            border: '1px dashed #d1d5db', background: '#fff',
            color: '#374151', fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Add new item
        </button>
      </FormModal>

      {/* ---- Add/Edit Item modal ---- */}
      <FormModal
        isOpen={!!itemModal}
        title={itemModal?.id ? 'Edit Menu Item' : 'Add Menu Item'}
        submitLabel={itemModal?.id ? 'Save' : 'Add Item'}
        size="sm"
        onClose={() => setItemModal(null)}
        onSubmit={submitItem}
        submitDisabled={!itemModal?.name?.trim() || itemModal?.unit_price === '' || itemModal?.unit_price == null}
        errorMessage={itemError}
      >
        <SelectField
          label="Meal Period"
          value={itemModal?.meal_period || ''}
          onChange={(v) => setItemModal((m) => m && ({ ...m, meal_period: Number(v) }))}
          options={mealPeriodsRaw.map((m) => ({ value: m.id, label: m.label }))}
          required
        />
        <TextField
          label="Name"
          value={itemModal?.name || ''}
          onChange={(v) => setItemModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g. Spicy Filet"
          required
          autoFocus
        />
        <TextField
          label="Emoji"
          value={itemModal?.emoji || ''}
          onChange={(v) => setItemModal((m) => m && ({ ...m, emoji: v }))}
          placeholder="📝"
        />
        <NumberField
          label="Unit Price ($)"
          value={itemModal?.unit_price ?? ''}
          onChange={(v) => setItemModal((m) => m && ({ ...m, unit_price: v }))}
          placeholder="e.g. 4.99"
          step="0.01"
          required
        />
      </FormModal>

      {/* ---- Bulk Entry modal ---- */}
      <FormModal
        isOpen={!!bulkModal}
        title={`Bulk ${mode === 'donations' ? 'Donation' : 'Waste'} Entry`}
        submitLabel="Log All"
        size="md"
        onClose={() => setBulkModal(null)}
        onSubmit={submitBulk}
        errorMessage={bulkError}
      >
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>
          Enter quantities for multiple items at once. Leave blank to skip.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 360, overflowY: 'auto' }}>
          {(bulkModal?.rows || []).map((row, idx) => {
            const item = menuItems.find((m) => m.id === row.menu_item);
            if (!item) return null;
            return (
              <li
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 4px', borderBottom: '1px solid #f3f4f6',
                }}
              >
                <span style={{ fontSize: 20 }}>{item.emoji || '📝'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>${item.price.toFixed(2)} each</div>
                </div>
                <input
                  type="number"
                  min="0"
                  value={row.qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBulkModal((m) => m && ({
                      ...m,
                      rows: m.rows.map((r, i) => i === idx ? { ...r, qty: v } : r),
                    }));
                  }}
                  placeholder="qty"
                  style={{
                    width: 80, padding: '6px 8px',
                    border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14,
                  }}
                />
              </li>
            );
          })}
        </ul>
      </FormModal>

      {/* ---- Date picker modal ---- */}
      <FormModal
        isOpen={datePickerOpen}
        title="Pick a Date"
        submitLabel="View Entries"
        size="sm"
        onClose={() => setDatePickerOpen(false)}
        onSubmit={async () => { setDatePickerOpen(false); }}
      >
        <DatePicker
          label="Entries Date"
          value={entriesDate}
          onChange={(v) => setEntriesDate(v || todayIso)}
        />
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>
          Showing waste entries logged on the selected day.
        </p>
      </FormModal>

      {/* ---- Delete confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteItem}
        title="Delete this menu item?"
        message={deleteItem
          ? `“${deleteItem.name}” will be archived. Past waste entries for it stay in history.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteItem}
        onClose={() => setDeleteItem(null)}
      />

      {/* ---- Not-implemented sentinel ---- */}
      <ConfirmDialog
        isOpen={!!notImplemented}
        title={notImplemented?.title || ''}
        message={notImplemented?.message || ''}
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setNotImplemented(null)}
        onClose={() => setNotImplemented(null)}
      />
    </div>
  );
};

export default KitchenWasteTracker;
