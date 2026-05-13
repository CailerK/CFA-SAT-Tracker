import React, { useState } from 'react';
import './WeeklyDigest.css';

const WeeklyDigest = ({ onBack }) => {
  const [selectedDay, setSelectedDay] = useState('Monday');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const digestData = {
    Monday: {
      date: 'May 13, 2024',
      summary: {
        totalSales: '$4,250.00',
        transactions: 142,
        avgTicket: '$29.93',
        peakHour: '12:00 PM - 1:00 PM'
      },
      highlights: [
        { label: 'Busiest Hour', value: '12:00 PM - 1:00 PM', icon: '📊' },
        { label: 'Top Item', value: 'Chicken Sandwich', icon: '🍗' },
        { label: 'Staff Performance', value: '94% Efficiency', icon: '⭐' },
        { label: 'Customer Satisfaction', value: '4.8/5.0', icon: '😊' }
      ],
      tasks: {
        completed: 16,
        total: 18,
        pending: [
          'Stock Ice cream supplies',
          'Clean shake machine'
        ]
      },
      staffing: {
        scheduled: 8,
        present: 8,
        absent: 0
      }
    },
    Tuesday: {
      date: 'May 14, 2024',
      summary: {
        totalSales: '$3,890.00',
        transactions: 128,
        avgTicket: '$30.39',
        peakHour: '1:00 PM - 2:00 PM'
      },
      highlights: [
        { label: 'Busiest Hour', value: '1:00 PM - 2:00 PM', icon: '📊' },
        { label: 'Top Item', value: 'Burger Combo', icon: '🍔' },
        { label: 'Staff Performance', value: '91% Efficiency', icon: '⭐' },
        { label: 'Customer Satisfaction', value: '4.7/5.0', icon: '😊' }
      ],
      tasks: {
        completed: 15,
        total: 18,
        pending: [
          'Restock napkins',
          'Clean coolers'
        ]
      },
      staffing: {
        scheduled: 7,
        present: 7,
        absent: 0
      }
    }
  };

  const currentData = digestData[selectedDay] || digestData.Monday;

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
