import React, { useState, useEffect } from 'react';
import './WeeklyDigest.css';
import weeklyDigestService from '../services/weeklyDigest';

// Empty skeleton used while the digest loads / no data yet.
const EMPTY_DAY = {
  date: '',
  summary: { totalSales: '$0.00', transactions: 0, avgTicket: '$0.00', peakHour: '—' },
  highlights: [
    { label: 'Busiest Hour', value: '—', icon: '📊' },
    { label: 'Top Item', value: '—', icon: '🍗' },
    { label: 'Staff Performance', value: '—', icon: '⭐' },
    { label: 'Customer Satisfaction', value: '—', icon: '😊' },
  ],
  tasks: { completed: 0, total: 0, pending: [] },
  staffing: { scheduled: 0, present: 0, absent: 0 },
};

const WeeklyDigest = ({ onBack }) => {
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [digestData, setDigestData] = useState({});

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Load the current week's digest. Backend returns per-day records keyed by weekday name.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await weeklyDigestService.get();
        if (cancelled) return;
        // Expected shape: { week_start, days: {Monday: {...}, ...} }
        if (res && res.days && typeof res.days === 'object') {
          // Normalize each day's keys snake_case → camelCase for the summary block.
          const out = {};
          for (const [d, body] of Object.entries(res.days)) {
            out[d] = {
              date: body.date || '',
              summary: {
                totalSales: body.summary?.total_sales || '$0.00',
                transactions: body.summary?.transactions || 0,
                avgTicket: body.summary?.avg_ticket || '$0.00',
                peakHour: body.summary?.peak_hour || '—',
              },
              highlights: body.highlights || EMPTY_DAY.highlights,
              tasks: body.tasks || EMPTY_DAY.tasks,
              staffing: body.staffing || EMPTY_DAY.staffing,
            };
          }
          setDigestData(out);
        }
      } catch (err) {
        console.error('Failed to load weekly digest:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const currentData = digestData[selectedDay] || EMPTY_DAY;

  return (
    <div className="weekly-digest-page">
      {/* Header */}
      <header className="digest-header">
        <div className="digest-header-inner">
          <div className="digest-header-left">
            <button className="digest-back-btn" onClick={onBack} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <h1 className="digest-title">Weekly Digest</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="digest-main">
        {/* Day Selector */}
        <div className="day-selector">
          {days.map(day => (
            <button
              key={day}
              className={`day-button ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              {day.slice(0, 3)}
            </button>
          ))}
        </div>

        {/* Date Display */}
        <div className="digest-date">
          {currentData.date}
        </div>

        {/* Summary Cards */}
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-label">Total Sales</div>
            <div className="summary-value">{currentData.summary.totalSales}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Transactions</div>
            <div className="summary-value">{currentData.summary.transactions}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Avg Ticket</div>
            <div className="summary-value">{currentData.summary.avgTicket}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Peak Hour</div>
            <div className="summary-value">{currentData.summary.peakHour}</div>
          </div>
        </div>

        {/* Highlights Section */}
        <div className="digest-section">
          <h2 className="section-title">Key Highlights</h2>
          <div className="highlights-grid">
            {currentData.highlights.map((highlight, idx) => (
              <div key={idx} className="highlight-card">
                <div className="highlight-icon">{highlight.icon}</div>
                <div className="highlight-label">{highlight.label}</div>
                <div className="highlight-value">{highlight.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Section */}
        <div className="digest-section">
          <h2 className="section-title">Daily Tasks</h2>
          <div className="tasks-card">
            <div className="tasks-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentData.tasks.completed / currentData.tasks.total) * 100}%` }}
                />
              </div>
              <div className="progress-text">
                {currentData.tasks.completed} of {currentData.tasks.total} completed
              </div>
            </div>
            {currentData.tasks.pending.length > 0 && (
              <div className="pending-tasks">
                <div className="pending-title">Pending Tasks:</div>
                {currentData.tasks.pending.map((task, idx) => (
                  <div key={idx} className="pending-item">
                    • {task}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Staffing Section */}
        <div className="digest-section">
          <h2 className="section-title">Staffing</h2>
          <div className="staffing-grid">
            <div className="staffing-card">
              <div className="staffing-number">{currentData.staffing.scheduled}</div>
              <div className="staffing-label">Scheduled</div>
            </div>
            <div className="staffing-card">
              <div className="staffing-number">{currentData.staffing.present}</div>
              <div className="staffing-label">Present</div>
            </div>
            <div className="staffing-card">
              <div className="staffing-number">{currentData.staffing.absent}</div>
              <div className="staffing-label">Absent</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WeeklyDigest;
