import React, { useState, useEffect, useCallback } from 'react';
import './Calendar.css';
import calendarService from '../services/calendar';

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

const pad = (n) => String(n).padStart(2, '0');

const Calendar = ({ onBack }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [EVENTS, setEVENTS] = useState({});

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

  const handleAddEvent = async () => {
    const title = window.prompt('Event title');
    if (!title?.trim()) return;
    const date = window.prompt(
      'Event date (YYYY-MM-DD)',
      `${viewDate.getFullYear()}-${pad(viewDate.getMonth() + 1)}-${pad(today.getDate())}`
    );
    if (!date?.trim()) return;
    const category = window.prompt(
      `Category (${Object.keys(CATEGORY_COLOR).join(', ')})`,
      'store_event'
    );
    if (!category?.trim()) return;
    try {
      await calendarService.create({
        title: title.trim(),
        category: category.trim(),
        starts_at: `${date.trim()}T12:00:00`,
        all_day: true,
      });
      await loadEvents();
    } catch (err) {
      console.error('Failed to create calendar event:', err);
    }
  };

  const handleEventClick = async (event) => {
    const action = window.prompt(`Type "edit" to rename or "delete" to remove "${event.title}".`, 'edit');
    if (!action) return;
    if (action.toLowerCase() === 'delete') {
      const confirmed = window.confirm(`Delete "${event.title}"?`);
      if (!confirmed) return;
      try {
        await calendarService.remove(event.id);
        await loadEvents();
      } catch (err) {
        console.error('Failed to delete calendar event:', err);
      }
      return;
    }
    const nextTitle = window.prompt('Updated event title', event.title);
    if (!nextTitle?.trim()) return;
    try {
      await calendarService.update(event.id, { title: nextTitle.trim() });
      await loadEvents();
    } catch (err) {
      console.error('Failed to update calendar event:', err);
    }
  };

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
          <button className="cal-add-btn" onClick={handleAddEvent}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Event
          </button>
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
            const evts = EVENTS[key] || [];
            const today_ = isToday(cell.date);
            return (
              <div key={i} className={`cal-cell ${!cell.cur ? 'other' : ''} ${today_ ? 'today' : ''}`}>
                <div className="cal-cell-num">
                  <span className={today_ ? 'today-badge' : ''}>{cell.date.getDate()}</span>
                </div>
                <div className="cal-cell-events">
                  {evts.map(ev => (
                    <div key={ev.id} className="cal-event" style={{ backgroundColor: ev.color }} onClick={() => handleEventClick(ev)}>
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

      {/* Legend */}
      <div className="cal-legend">
        {[
          { label: 'Weekly Tasks',  color: '#ef4444' },
          { label: 'Out of School', color: '#f97316' },
          { label: 'Store Event',   color: '#10b981' },
          { label: 'Local Event',   color: '#3b82f6' },
          { label: 'Announcement',  color: '#a855f7' },
          { label: 'Deadline',      color: '#ec4899' },
          { label: 'Other',         color: '#6b7280' },
        ].map(l => (
          <div key={l.label} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ backgroundColor: l.color }}/>
            <span>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Calendar;
