import React, { useState, useMemo, useEffect, useCallback } from 'react';
import kitchenService from '../services/kitchen';
import './SetupSheetTemplates.css'; // banner
import './KitchenDashboard.css';     // kitchen nav
import './KitchenWasteTracker.css';

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

// ===== DEMO DATA (see FAKE_DATA.md) =====
const MEAL_PERIODS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
];

const MENU_ITEMS_BY_PERIOD = {
  breakfast: [
    { id: 'cfa-biscuit',  name: 'CFA Chicken Biscuit', emoji: '🍗', price: 0.83 },
    { id: 'egg-whites',   name: 'Egg Whites',          emoji: '🥚', price: 0.19 },
    { id: 'bf-spicy',     name: 'Spicy Filet',         emoji: '🍗', price: 1.25 },
    { id: 'bf-filet',     name: 'Filet',               emoji: '🍗', price: 1.02 },
  ],
  lunch: [
    { id: 'spicy-filet',   name: 'Spicy Filet',    emoji: '🍗', price: 1.25 },
    { id: 'filet',         name: 'Filet',          emoji: '🍗', price: 1.02 },
    { id: 'grilled-filet', name: 'Grilled Filet',  emoji: '🔥', price: 1.12 },
    { id: 'nuggets',       name: 'Nuggets',        emoji: '🍗', price: 0.15 },
    { id: 'grl-nuggets',   name: 'Grilled Nuggets', emoji: '🔥', price: 0.17 },
    { id: 'strips',        name: 'Strips',         emoji: '🍗', price: 0.53 },
    { id: 'mac-cheese',    name: 'Mac & Cheese',   emoji: '🧀', price: 1.01 },
    { id: 'white-bun',     name: 'White Bun',      emoji: '🍞', price: 0.16 },
    { id: 'multi-bun',     name: 'Multigrain Bun', emoji: '🥖', price: 0.33 },
    { id: 'gf-bun',        name: 'Gluten Free Bun', emoji: '🍞', price: 0.85 },
    { id: 'sandwich',      name: 'sandwich',       emoji: '🍽️', price: 1.00 },
  ],
  dinner: [
    { id: 'd-filet',    name: 'Filet',       emoji: '🍗', price: 1.02 },
    { id: 'd-spicy',    name: 'Spicy Filet', emoji: '🍗', price: 1.25 },
    { id: 'd-nuggets',  name: 'Nuggets',     emoji: '🍗', price: 0.15 },
    { id: 'd-strips',   name: 'Strips',      emoji: '🍗', price: 0.53 },
  ],
};

const WASTE_REASONS = [
  { id: 'overproduction', emoji: '📈', label: 'Overproduction' },
  { id: 'quality',        emoji: '❌', label: 'Quality Issues' },
  { id: 'expired',        emoji: '⏰', label: 'Expired' },
  { id: 'dropped',        emoji: '💧', label: 'Dropped' },
];

const TODAY_ENTRIES = [
  { id: 1,  name: 'Filet',                qty: 1, unit: 'pieces',   price: 1.02, time: '12:15 PM' },
  { id: 2,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:11 PM' },
  { id: 3,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:11 PM' },
  { id: 4,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:11 PM' },
  { id: 5,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:00 PM' },
  { id: 6,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:00 PM' },
  { id: 7,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:00 PM' },
  { id: 8,  name: 'Strips',               qty: 1, unit: 'pieces',   price: 0.53, time: '12:00 PM' },
  { id: 9,  name: 'Filet',                qty: 1, unit: 'pieces',   price: 1.02, time: '11:01 AM' },
  { id: 10, name: 'CFA Chicken Biscuit',  qty: 1, unit: 'pieces',   price: 0.83, time: '9:41 AM'  },
  { id: 11, name: 'CFA Chicken Biscuit',  qty: 1, unit: 'pieces',   price: 0.83, time: '9:41 AM'  },
  { id: 12, name: 'Egg Whites',           qty: 1, unit: 'portions', price: 0.19, time: '9:41 AM'  },
  { id: 13, name: 'Spicy Filet',          qty: 1, unit: 'pieces',   price: 1.25, time: '9:41 AM'  },
  { id: 14, name: 'Filet',                qty: 1, unit: 'pieces',   price: 1.02, time: '9:40 AM'  },
  { id: 15, name: 'Filet',                qty: 1, unit: 'pieces',   price: 1.02, time: '9:40 AM'  },
  { id: 16, name: 'Filet',                qty: 1, unit: 'pieces',   price: 1.02, time: '9:40 AM'  },
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

const KitchenWasteTracker = ({ onNavigate, user }) => {
  const [mode, setMode] = useState('waste'); // waste | donations
  const [activeMeal, setActiveMeal] = useState('lunch');
  const [selectedReason, setSelectedReason] = useState(null);
  const [entries, setEntries] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Server-loaded catalogs.
  const [menuItemsRaw, setMenuItemsRaw] = useState([]); // [{id, name, emoji, unit_price, meal_period_slug}]
  const [reasonsRaw, setReasonsRaw] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load menu items for the active meal whenever it changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await kitchenService.listMenuItems({ meal: activeMeal });
        if (!cancelled) setMenuItemsRaw(res.results || res || []);
      } catch (err) {
        console.error('Failed to load menu items:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [activeMeal]);

  // Load reasons + today's entries on mount.
  const refreshEntries = useCallback(async () => {
    try {
      const res = await kitchenService.listEntries({ date: 'today' });
      const rows = res.results || res || [];
      setEntries(rows.map(normalizeEntry));
    } catch (err) {
      console.error('Failed to load waste entries:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const reasons = await kitchenService.listReasons();
        if (!cancelled) {
          setReasonsRaw(reasons.results || reasons || []);
        }
      } catch (err) {
        console.error('Failed to load waste reasons:', err);
      } finally {
        await refreshEntries();
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshEntries]);

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

  // "Custom Entry" form — for items that don't appear in the catalog yet.
  // For now we can't POST a custom entry without a menu_item FK, so we treat
  // this as a local-only add. (Future: allow creating ad-hoc menu items.)
  const canAddCustom = customName.trim() && customQty && customPrice;
  const handleAddCustom = () => {
    if (!canAddCustom) return;
    const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    setEntries((prev) => [
      { id: `tmp-${Date.now()}`, name: customName.trim(), qty: Number(customQty), unit: 'pieces', price: Number(customPrice), time: now },
      ...prev,
    ]);
    setCustomName(''); setCustomQty(''); setCustomPrice('');
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
              <span className="kwt-kpi-label">Today's Waste</span>
            </div>
            <p className="kwt-kpi-value">${totalWaste.toFixed(2)}</p>
            <p className="kwt-kpi-sub">{entries.length} items logged</p>
          </div>
          <div className="kwt-kpi">
            <div className="kwt-kpi-head">
              <span className="kwt-kpi-emoji">📦</span>
              <span className="kwt-kpi-label">Most Wasted</span>
            </div>
            <p className="kwt-kpi-value kwt-kpi-value-sm">Filet</p>
            <p className="kwt-kpi-sub">Last: 12:15 PM</p>
          </div>
        </div>

        {/* Items / Prices quick actions */}
        <div className="kwt-quick-actions">
          <button type="button" className="kwt-quick-btn">⚙️ Items</button>
          <button type="button" className="kwt-quick-btn">💲 Prices</button>
        </div>

        {/* Bulk Entry */}
        <button type="button" className="kwt-bulk-btn">📝 Bulk Entry</button>

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
              <p className="kwt-section-label kwt-section-label-inline">Today's Entries</p>
              <button type="button" className="kwt-date-chip">
                <IconCalendar className="kwt-date-chip-icon" /> Today
              </button>
            </div>
            <button type="button" className="kwt-notes-btn">📝 Notes</button>
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
    </div>
  );
};

export default KitchenWasteTracker;
