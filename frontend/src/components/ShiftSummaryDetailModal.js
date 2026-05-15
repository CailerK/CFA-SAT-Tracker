/**
 * <ShiftSummaryDetailModal> — read-only view of a submitted shift summary.
 *
 * Opened from the ShiftSummaryHistory list when a manager clicks a row.
 * Shows every field captured at submit time (lead, date, shift type, status,
 * rating, recap, sales note, labor %, SoS, handoff, follow-up flag, and the
 * tag chips for wins / challenges).
 */
import React from 'react';

// Pretty-print enum slugs the backend emits.
const SHIFT_TYPE_LABEL = {
  opening: 'Opening',
  mid: 'Mid',
  closing: 'Closing',
};
const SHIFT_STATUS_LABEL = {
  normal: 'Normal',
  busy: 'Busy',
  slow: 'Slow',
  incident: 'Incident',
};

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    });
  } catch (e) {
    return iso;
  }
};

const FieldRow = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#6b7280', margin: 0 }}>{label}</p>
    <div style={{ marginTop: 4, fontSize: 14, color: '#111827', whiteSpace: 'pre-wrap' }}>
      {children || <span style={{ color: '#9ca3af' }}>—</span>}
    </div>
  </div>
);

const ShiftSummaryDetailModal = ({ isOpen, summary, onClose }) => {
  if (!isOpen || !summary) return null;

  const wins = (summary.tags || []).filter((t) => t.kind === 'win');
  const challenges = (summary.tags || []).filter((t) => t.kind === 'challenge');

  // We render a custom overlay (matching the FormModal styling) since
  // ConfirmDialog forces button labels — we only want a Close button here.
  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div className="ui-modal-content ui-modal-lg" role="dialog" aria-modal="true">
        <div className="ui-modal-header">
          <h2 className="ui-modal-title">
            Shift Summary — {summary.shift_lead_name || 'Unknown'}
          </h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ui-modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <FieldRow label="Shift Date">{formatDate(summary.shift_date)}</FieldRow>
            <FieldRow label="Shift Type">
              {SHIFT_TYPE_LABEL[summary.shift_type] || summary.shift_type}
            </FieldRow>
            <FieldRow label="Status">
              {SHIFT_STATUS_LABEL[summary.shift_status] || summary.shift_status}
            </FieldRow>
            <FieldRow label="Rating">
              {summary.rating ? `${summary.rating} / 5` : '—'}
            </FieldRow>
            <FieldRow label="Labor %">
              {summary.labor_percent != null ? `${summary.labor_percent}%` : '—'}
            </FieldRow>
            <FieldRow label="Follow-up Needed">
              {summary.needs_follow_up ? 'Yes' : 'No'}
            </FieldRow>
          </div>

          <FieldRow label="Recap">{summary.recap}</FieldRow>
          <FieldRow label="Sales Note">{summary.sales_note}</FieldRow>
          <FieldRow label="Speed of Service Note">{summary.sos_note}</FieldRow>
          <FieldRow label="Handoff Note">{summary.handoff_note}</FieldRow>

          <FieldRow label="Wins">
            {wins.length ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {wins.map((t) => (
                  <span
                    key={t.id}
                    style={{ background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
          </FieldRow>

          <FieldRow label="Challenges">
            {challenges.length ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {challenges.map((t) => (
                  <span
                    key={t.id}
                    style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
          </FieldRow>
        </div>

        <div className="ui-modal-footer">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShiftSummaryDetailModal;
