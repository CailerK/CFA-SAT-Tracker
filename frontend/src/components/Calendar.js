import React, { useState } from 'react';
import './Calendar.css';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const EVENTS = {
  '2024-05-13': [
    { id: 1, title: 'Shift Planning', color: '#ef4444' },
    { id: 2, title: 'Menu Review', color: '#a855f7' },
  ],
  '2024-05-18': [{ id: 3, title: 'Inventory Check', color: '#f97316' }],
  '2024-05-25': [{ id: 4, title: 'Team Celebration', color: '#ec4899' }],
  '2024-05-5':  [{ id: 5, title: 'Team Meeting',    color: '#3b82f6' }],
  '2024-05-8':  [{ id: 6, title: 'Staff Training',  color: '#10b981' }],
};

const pad = (n) => String(n).padStart(2, '0');

const Calendar = ({ onBack }) => {
  const [viewDate, setViewDate] = useState(new Date(2024, 4, 1)); // May 2024
  const [viewMode, setViewMode] = useState('month');

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
          <button className="cal-add-btn">
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
                    <div key={ev.id} className="cal-event" style={{ backgroundColor: ev.color }}>
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
