/**
 * Dashboard "My Priorities" widget.
 *
 * Fetches GET /api/dashboard/priorities/ on mount and renders the LD-Growth
 * style priorities card:
 *   - When count > 0: red-tile header (⚡), expand/collapse chevron, scrollable
 *     list of priority rows with red target icons + due dates + "View Roadmap →".
 *   - When count === 0: green "All Caught Up! 🎉" empty state (same as before).
 *
 * Clicking "View Roadmap →" or a whole row routes to the relevant page using
 * the `onNavigate(pageKey)` prop passed in from Dashboard.
 */

import React, { useState, useEffect, useCallback } from 'react';
import dashboardService from '../services/dashboard';
import './MyPriorities.css';

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const MyPriorities = ({ onNavigate }) => {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await dashboardService.getPriorities();
      setItems(res.items || []);
      setCount(res.count ?? (res.items?.length || 0));
    } catch (err) {
      console.error('Failed to load priorities:', err);
      setItems([]);
      setCount(0);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Empty / all-caught-up state.
  if (loaded && count === 0) {
    return (
      <div className="mp-status">
        <div className="mp-status-inner">
          <div className="mp-status-bg mp-status-bg-1" aria-hidden="true" />
          <div className="mp-status-bg mp-status-bg-2" aria-hidden="true" />
          <div className="mp-status-content">
            <div className="mp-status-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
            </div>
            <h3 className="mp-status-title">All Caught Up! 🎉</h3>
            <p className="mp-status-sub">
              You have no urgent priorities at the moment. Great job staying on top of things!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading skeleton — keep the layout but stay quiet.
  if (!loaded) {
    return <div className="mp-card mp-card-loading" />;
  }

  return (
    <div className="mp-card">
      <button
        type="button"
        className="mp-head"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
      >
        <span className="mp-head-tile" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </span>
        <span className="mp-head-text">
          <span className="mp-head-title">My Priorities</span>
          <span className="mp-head-sub">{count} item{count === 1 ? '' : 's'} require attention</span>
        </span>
        <span className={`mp-badge ${count > 0 ? 'is-warn' : ''}`}>{count} Pending</span>
        <span className={`mp-chevron ${expanded ? 'is-open' : ''}`} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {expanded && (
        <ul className="mp-list">
          {items.map((p) => (
            <li
              key={p.id}
              className={`mp-row ${p.is_overdue ? 'is-overdue' : ''}`}
              onClick={() => onNavigate && onNavigate(p.navigate_to)}
            >
              <span className="mp-row-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </span>
              <div className="mp-row-body">
                <div className="mp-row-title">{p.title}</div>
                <div className="mp-row-sub">{p.subtitle}</div>
                {p.due_at && (
                  <div className="mp-row-due">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>{p.is_overdue ? 'Overdue ' : 'Due '}{fmtDate(p.due_at)}</span>
                  </div>
                )}
              </div>
              <span className="mp-row-dot" aria-hidden="true" />
              <button
                type="button"
                className="mp-row-cta"
                onClick={(e) => { e.stopPropagation(); onNavigate && onNavigate(p.navigate_to); }}
              >
                View Roadmap
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyPriorities;
