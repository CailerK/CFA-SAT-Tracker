import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './Calendar.css';
import calendarService from '../services/calendar';
import { isManagerOrAbove } from '../utils/access';
import {
  FormModal, ConfirmDialog,
  TextField, TextArea, SelectField, DatePicker, TimePicker, Toggle,
} from './ui';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Color palette per category — matches the legend strip in the existing UI.
const CATEGORY_COLOR = {
  weekly_task: '#3b82f6',
  out_of_school: '#10b981',
  store_event: '#ef4444',
  local_event: '#f97316',
  announcement: '#a855f7',
  deadline: '#ec4899',
  other: '#6b7280',
};

// Human-friendly labels (also used by the Create/Edit modal SelectField).
const CATEGORY_LABEL = {
  weekly_task: 'Weekly Task',
  out_of_school: 'Out of School',
  store_event: 'Store Event',
  local_event: 'Local Event',
  announcement: 'Announcement',
  deadline: 'Deadline',
  other: 'Other',
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_COLOR).map((k) => ({
  value: k,
  label: CATEGORY_LABEL[k],
}));

const pad = (n) => String(n).padStart(2, '0');

// Derive YYYY-MM-DD + HH:MM strings from an ISO datetime so the modal's
// DatePicker/TimePicker can work with them directly.
const splitISO = (iso) => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

const Calendar = ({ onBack, user }) => {
  const canManage = isManagerOrAbove(user);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [EVENTS, setEVENTS] = useState({});

  // ---- Category legend filters ----
  // hiddenCategories: Set<categoryKey>. A category is hidden when its key is
  // present. Empty set = show everything (default).
  const [hiddenCategories, setHiddenCategories] = useState(new Set());
  const toggleCategoryFilter = (key) =>
    setHiddenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // ---- Modal state ----
  // eventModal: { id?, title, category, date, time, allDay, notes } | null
  const [eventModal, setEventModal] = useState(null);
  const [eventError, setEventError] = useState('');
  // deleteEvent: full event row — ConfirmDialog opens when set.
  const [deleteEvent, setDeleteEvent] = useState(null);

  const loadEvents = useCallback(async () => {
    const monthStr = `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}`;
    const res = await calendarService.list({ month: monthStr });
    const rows = res.results || res || [];
    const bucket = {};
    for (const e of rows) {
      if (!e.starts_at) continue;
      const d = new Date(e.starts_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      (bucket[key] ||= []).push({
        id: e.id,
        title: e.title,
        category: e.category,
        startsAt: e.starts_at,
        color: CATEGORY_COLOR[e.category] || '#6b7280',
      });
    }
    setEVENTS(bucket);
  }, [viewDate]);

  // Load events for the current month whenever the view date changes.
  useEffect(() => {
    (async () => {
      try {
        await loadEvents();
      } catch (err) {
        console.error('Failed to load calendar:', err);
      }
    })();
  }, [loadEvents]);

  const today = new Date();
  const isToday = (d) =>
    d.getDate()     === today.getDate()  &&
    d.getMonth()    === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDOW    = (y, m) => new Date(y, m, 1).getDay();

  const buildGrid = () => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(y, m);
    const firstDOW = getFirstDOW(y, m);
    const prevDays = getDaysInMonth(y, m - 1);
    const cells = [];

    for (let i = firstDOW - 1; i >= 0; i--)
      cells.push({ date: new Date(y, m - 1, prevDays - i), cur: false });

    for (let d = 1; d <= daysInMonth; d++)
      cells.push({ date: new Date(y, m, d), cur: true });

    while (cells.length % 7 !== 0)
      cells.push({ date: new Date(y, m + 1, cells.length - daysInMonth - firstDOW + 1), cur: false });

    return cells;
  };

  const getKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${d.getDate()}`;

  const cells = buildGrid();

  const prev = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const next = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); };

  // ---- Build error detail string for FormModal errorMessage ----
  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Open Add Event modal (button click — manager only) ----
  const openAddEvent = (preselectedDate) => {
    if (!canManage) return;
    setEventError('');
    const baseDate = preselectedDate || new Date(
      viewDate.getFullYear(), viewDate.getMonth(), today.getDate()
    );
    setEventModal({
      title: '',
      category: 'store_event',
      date: `${baseDate.getFullYear()}-${pad(baseDate.getMonth() + 1)}-${pad(baseDate.getDate())}`,
      time: '12:00',
      allDay: true,
      notes: '',
    });
  };

  // ---- Open Edit Event modal (event click) ----
  const openEditEvent = (ev) => {
    if (!canManage) return;
    setEventError('');
    const { date, time } = splitISO(ev.startsAt);
    setEventModal({
      id: ev.id,
      title: ev.title || '',
      category: ev.category || 'other',
      date,
      time: time || '12:00',
      allDay: ev.allDay !== false,
      notes: ev.notes || '',
    });
  };

  // ---- Submit (create OR update) ----
  const submitEvent = async () => {
    if (!eventModal) return;
    const { id, title, category, date, time, allDay, notes } = eventModal;
    if (!title.trim()) {
      setEventError('Title is required.');
      throw new Error('Missing title');
    }
    if (!date) {
      setEventError('Pick a date.');
      throw new Error('Missing date');
    }
    const startsAt = allDay
      ? `${date}T12:00:00`
      : `${date}T${time || '12:00'}:00`;
    const payload = {
      title: title.trim(),
      category,
      starts_at: startsAt,
      all_day: !!allDay,
      notes: (notes || '').trim(),
    };
    try {
      if (id) await calendarService.update(id, payload);
      else await calendarService.create(payload);
      setEventModal(null);
      await loadEvents();
    } catch (err) {
      setEventError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Delete confirm flow ----
  const performDeleteEvent = async () => {
    if (!deleteEvent) return;
    try {
      await calendarService.remove(deleteEvent.id);
      setDeleteEvent(null);
      await loadEvents();
    } catch (err) {
      console.error('Failed to delete calendar event:', err);
      setDeleteEvent(null);
    }
  };

  // ---- Day cell click — open Add Event prefilled with that date (manager) ----
  const handleDayClick = (cell) => {
    if (!canManage) return;
    if (!cell.cur) return;
    openAddEvent(cell.date);
  };

  // ---- Filter events by active legend toggles ----
  const visibleEvents = useMemo(() => {
    if (hiddenCategories.size === 0) return EVENTS;
    const out = {};
    for (const [k, list] of Object.entries(EVENTS)) {
      const filtered = list.filter((ev) => !hiddenCategories.has(ev.category));
      if (filtered.length) out[k] = filtered;
    }
    return out;
  }, [EVENTS, hiddenCategories]);

  return (
    <div className="cal-page">
      {/* Page header row */}
      <div className="cal-page-header">
        <div className="cal-page-title-block">
          <div className="cal-icon-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8"  y1="2" x2="8"  y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h1 className="cal-page-title">Calendar</h1>
            <p className="cal-page-sub">{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
          </div>
        </div>

        <div className="cal-controls">
          <button className={`cal-view-btn ${viewMode === 'month' ? 'active' : ''}`} onClick={() => setViewMode('month')}>Month</button>
          <button className={`cal-view-btn ${viewMode === 'week'  ? 'active' : ''}`} onClick={() => setViewMode('week')}>Week</button>
          <button className="cal-nav-btn" onClick={prev}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <button className="cal-nav-btn" onClick={next}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          {canManage && (
            <button className="cal-add-btn" onClick={() => openAddEvent()}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Event
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="cal-grid-wrap">
        {/* Day name header */}
        <div className="cal-dow-row">
          {DAY_NAMES.map(d => <div key={d} className="cal-dow">{d}</div>)}
        </div>

        {/* Day cells */}
        <div className="cal-days">
          {cells.map((cell, i) => {
            const key = getKey(cell.date);
            const evts = visibleEvents[key] || [];
            const today_ = isToday(cell.date);
            return (
              <div
                key={i}
                className={`cal-cell ${!cell.cur ? 'other' : ''} ${today_ ? 'today' : ''}`}
                onClick={() => handleDayClick(cell)}
                role={canManage && cell.cur ? 'button' : undefined}
                tabIndex={canManage && cell.cur ? 0 : undefined}
                onKeyDown={canManage && cell.cur
                  ? (ev) => {
                      if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        handleDayClick(cell);
                      }
                    }
                  : undefined}
                style={canManage && cell.cur ? { cursor: 'pointer' } : undefined}
              >
                <div className="cal-cell-num">
                  <span className={today_ ? 'today-badge' : ''}>{cell.date.getDate()}</span>
                </div>
                <div className="cal-cell-events">
                  {evts.map(ev => (
                    <div
                      key={ev.id}
                      className="cal-event"
                      style={{ backgroundColor: ev.color }}
                      onClick={(e) => {
                        // Stop propagation so day-cell click doesn't also fire.
                        e.stopPropagation();
                        if (canManage) openEditEvent(ev);
                      }}
                      role={canManage ? 'button' : undefined}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.8, flexShrink: 0 }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                      <span>{ev.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend — each item is now a toggle filter (click to hide that category) */}
      <div className="cal-legend">
        {Object.keys(CATEGORY_COLOR).map((key) => {
          const isHidden = hiddenCategories.has(key);
          return (
            <button
              key={key}
              type="button"
              className="cal-legend-item"
              onClick={() => toggleCategoryFilter(key)}
              aria-pressed={!isHidden}
              title={isHidden ? 'Click to show' : 'Click to hide'}
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
                opacity: isHidden ? 0.4 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
              }}
            >
              <span className="cal-legend-dot" style={{ backgroundColor: CATEGORY_COLOR[key] }}/>
              <span>{CATEGORY_LABEL[key]}</span>
            </button>
          );
        })}
        {hiddenCategories.size > 0 && (
          <button
            type="button"
            onClick={() => setHiddenCategories(new Set())}
            style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: 999,
              padding: '2px 10px',
              fontSize: 12,
              color: '#374151',
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            Show all
          </button>
        )}
      </div>

      {/* ---- Create / Edit Event modal ---- */}
      <FormModal
        isOpen={!!eventModal}
        title={eventModal?.id ? 'Edit Event' : 'New Event'}
        submitLabel={eventModal?.id ? 'Save Event' : 'Create Event'}
        size="sm"
        onClose={() => setEventModal(null)}
        onSubmit={submitEvent}
        submitDisabled={!eventModal?.title?.trim() || !eventModal?.date}
        errorMessage={eventError}
        leftFooterSlot={eventModal?.id ? (
          <button
            type="button"
            className="ui-btn ui-btn-danger"
            onClick={() => {
              const id = eventModal.id;
              const title = eventModal.title;
              setEventModal(null);
              setDeleteEvent({ id, title });
            }}
          >
            Delete
          </button>
        ) : null}
      >
        <TextField
          label="Title"
          value={eventModal?.title || ''}
          onChange={(v) => setEventModal((m) => m && ({ ...m, title: v }))}
          placeholder="e.g. Spirit Night"
          required
          autoFocus
        />
        <SelectField
          label="Category"
          value={eventModal?.category || 'store_event'}
          onChange={(v) => setEventModal((m) => m && ({ ...m, category: v }))}
          options={CATEGORY_OPTIONS}
          required
        />
        <DatePicker
          label="Date"
          value={eventModal?.date || ''}
          onChange={(v) => setEventModal((m) => m && ({ ...m, date: v }))}
          required
        />
        <Toggle
          label="All-day event"
          value={!!eventModal?.allDay}
          onChange={(v) => setEventModal((m) => m && ({ ...m, allDay: v }))}
        />
        {!eventModal?.allDay && (
          <TimePicker
            label="Time"
            value={eventModal?.time || '12:00'}
            onChange={(v) => setEventModal((m) => m && ({ ...m, time: v }))}
          />
        )}
        <TextArea
          label="Notes"
          value={eventModal?.notes || ''}
          onChange={(v) => setEventModal((m) => m && ({ ...m, notes: v }))}
          placeholder="Optional details for the team."
          rows={3}
        />
      </FormModal>

      {/* ---- Delete confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteEvent}
        title="Delete this event?"
        message={deleteEvent ? `“${deleteEvent.title}” will be permanently removed.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteEvent}
        onClose={() => setDeleteEvent(null)}
      />
    </div>
  );
};

export default Calendar;
