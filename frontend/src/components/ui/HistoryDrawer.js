/**
 * <HistoryDrawer> — read-only modal listing a sequence of timestamped rows.
 *
 * Used by all the "View History" buttons across the app that used to dump a
 * raw `window.alert(JSON.stringify(...))` payload. Caller supplies the
 * already-flattened row data; this component just renders the styling.
 *
 * Usage:
 *   <HistoryDrawer
 *     isOpen={open}
 *     title="Maintenance History"
 *     subtitle="Pizza Oven 1"
 *     rows={[
 *       { id: 1, primary: 'Cleaning', secondary: 'Wiped vent hood',
 *         timestamp: '2026-04-18 8:30 PM', kind: 'cleaning' },
 *       ...
 *     ]}
 *     emptyMessage="No history yet."
 *     onClose={() => setOpen(false)}
 *   />
 *
 * `rows[].kind` (optional) colors the left edge: cleaning, maintenance, issue, history.
 */
import React from 'react';
import './ui.css';

const KIND_COLORS = {
  cleaning:    '#3b82f6',
  maintenance: '#f59e0b',
  issue:       '#E51636',
  history:     '#6b7280',
  win:         '#10b981',
  warning:     '#f59e0b',
  critical:    '#E51636',
  good:        '#10b981',
};

const HistoryDrawer = ({
  isOpen,
  title = 'History',
  subtitle = '',
  rows = [],
  emptyMessage = 'Nothing here yet.',
  onClose,
  size = 'md',
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div
        className={`ui-modal-content ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="ui-modal-header">
          <div>
            <h2 className="ui-modal-title">{title}</h2>
            {subtitle && (
              <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: 13 }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ui-modal-body" style={{ paddingTop: 8 }}>
          {rows.length === 0 ? (
            <p style={{ padding: '24px 12px', textAlign: 'center', color: '#6b7280' }}>
              {emptyMessage}
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {rows.map((row) => {
                const accent = KIND_COLORS[row.kind] || '#d1d5db';
                return (
                  <li
                    key={row.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 12px',
                      borderLeft: `3px solid ${accent}`,
                      borderBottom: '1px solid #f3f4f6',
                      background: '#fff',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                        {row.primary}
                      </div>
                      {row.secondary && (
                        <div style={{ marginTop: 2, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>
                          {row.secondary}
                        </div>
                      )}
                    </div>
                    {row.timestamp && (
                      <div style={{ flexShrink: 0, fontSize: 12, color: '#6b7280' }}>
                        {row.timestamp}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="ui-modal-footer">
          <button type="button" className="ui-btn ui-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryDrawer;
