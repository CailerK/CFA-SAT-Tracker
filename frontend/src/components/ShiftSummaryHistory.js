import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './ShiftSummaryHistory.css';
import shiftSummaryService from '../services/shiftSummary';
import { ActionMenu, ConfirmDialog } from './ui';
import ShiftSummaryDetailModal from './ShiftSummaryDetailModal';

// ----- Filter option lists -----
// Each entry's `value` is what we hand back to the backend (for shift/status)
// or what computeRange() turns into ISO start/end for date ranges.
const DATE_RANGE_OPTIONS = [
  { value: 'this-week',   label: 'This week' },
  { value: 'last-week',   label: 'Last week' },
  { value: 'this-month',  label: 'This month' },
  { value: 'last-30',     label: 'Last 30 days' },
  { value: 'last-90',     label: 'Last 90 days' },
  { value: 'all',         label: 'All time' },
];

const SHIFT_OPTIONS = [
  { value: 'all',     label: 'All shifts' },
  { value: 'opening', label: 'Opening' },
  { value: 'mid',     label: 'Mid' },
  { value: 'closing', label: 'Closing' },
];

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All statuses' },
  { value: 'normal',   label: 'Normal' },
  { value: 'busy',     label: 'Busy' },
  { value: 'slow',     label: 'Slow' },
  { value: 'incident', label: 'Incident' },
];

const SUMMARY_OPTIONS = [
  { value: 'all',         label: 'All summaries' },
  { value: 'follow-up',   label: 'Follow-up only' },
];

// Compute ISO yyyy-mm-dd start/end for a preset range. `null` for either side
// means "don't constrain that bound."
const toIso = (d) => d.toISOString().slice(0, 10);
const computeRange = (preset) => {
  const now = new Date();
  if (preset === 'all') return { start: null, end: null };
  if (preset === 'this-week') {
    // Sunday-anchored week.
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { start: toIso(start), end: toIso(now) };
  }
  if (preset === 'last-week') {
    const end = new Date(now);
    end.setDate(now.getDate() - now.getDay() - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start: toIso(start), end: toIso(end) };
  }
  if (preset === 'this-month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toIso(start), end: toIso(now) };
  }
  if (preset === 'last-30') {
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    return { start: toIso(start), end: toIso(now) };
  }
  if (preset === 'last-90') {
    const start = new Date(now);
    start.setDate(now.getDate() - 90);
    return { start: toIso(start), end: toIso(now) };
  }
  return { start: null, end: null };
};

// Render a label like "Apr 12 - Apr 18, 2026" for the date-range button.
const rangeLabel = (preset) => {
  const opt = DATE_RANGE_OPTIONS.find((o) => o.value === preset);
  if (!opt) return 'Date range';
  if (preset === 'all') return 'All time';
  const { start, end } = computeRange(preset);
  if (!start || !end) return opt.label;
  const fmt = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const year = new Date(end + 'T00:00:00').getFullYear();
  return `${fmt(start)} – ${fmt(end)}, ${year}`;
};

const ShiftSummaryHistory = ({ onNavigate, user }) => {
  const [activeTab, setActiveTab] = useState('history');
  // Each filter is stored as the underlying option `value` slug, not the label.
  const [datePreset, setDatePreset] = useState('this-week');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [summaryFilter, setSummaryFilter] = useState('all');
  const [summaries, setSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Detail modal + not-implemented sentinel state.
  const [detailSummary, setDetailSummary] = useState(null);
  const [notImplemented, setNotImplemented] = useState(null);

  // Build the API params from the current filter state and refetch.
  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { start, end } = computeRange(datePreset);
    try {
      const res = await shiftSummaryService.list({
        start_date: start || undefined,
        end_date: end || undefined,
        shift: shiftFilter !== 'all' ? shiftFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        follow_up: summaryFilter === 'follow-up' ? true : undefined,
      });
      const rows = res.results || res || [];
      setSummaries(rows);
    } catch (err) {
      console.error('Failed to load shift summaries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [datePreset, shiftFilter, statusFilter, summaryFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  // Pretty labels for the filter buttons.
  const dateLabel = useMemo(() => rangeLabel(datePreset), [datePreset]);
  const shiftLabel = SHIFT_OPTIONS.find((o) => o.value === shiftFilter)?.label || 'All shifts';
  const statusLabel = STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'All statuses';
  const summaryLabel = SUMMARY_OPTIONS.find((o) => o.value === summaryFilter)?.label || 'All summaries';

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const handlePdf = () => {
    setNotImplemented({
      title: 'PDF export — coming soon',
      message: 'Server-side PDF rendering is on the roadmap. For now use Print and “Save as PDF” in the system print dialog.',
    });
  };

  const tabs = [
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'new', label: 'New', icon: '+' },
    { id: 'saved', label: 'Saved', icon: '💾' },
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'history', label: 'History', icon: '🔄' }
  ];

  const handleTabClick = (tabId) => {
    if (tabId === 'summary') {
      onNavigate('shift-summary');
    } else if (tabId === 'templates') {
      onNavigate('setup-sheet-templates');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="shift-history-page">
      {/* Red Header Banner */}
      <div className="shift-history-banner">
        <div className="banner-icon">☀️</div>
        <div className="banner-content">
          <h1 className="banner-title">Good morning, {user?.firstName || 'Demo User'}!</h1>
          <p className="banner-date">Saturday, April 18</p>
          <p className="banner-subtitle">Review the week, spot patterns, and keep follow-up items visible</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="shift-history-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`history-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.icon && <span className="tab-icon">{tab.icon}</span>}
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <ActionMenu
            actions={DATE_RANGE_OPTIONS.map((opt) => ({
              label: opt.label,
              onClick: () => setDatePreset(opt.value),
            }))}
            trigger={(
              <button type="button" className="filter-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{dateLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>
            )}
          />

          <ActionMenu
            actions={SHIFT_OPTIONS.map((opt) => ({
              label: opt.label,
              onClick: () => setShiftFilter(opt.value),
            }))}
            trigger={(
              <button type="button" className="filter-item">
                <span>{shiftLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>
            )}
          />

          <ActionMenu
            actions={STATUS_OPTIONS.map((opt) => ({
              label: opt.label,
              onClick: () => setStatusFilter(opt.value),
            }))}
            trigger={(
              <button type="button" className="filter-item">
                <span>{statusLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>
            )}
          />

          <ActionMenu
            actions={SUMMARY_OPTIONS.map((opt) => ({
              label: opt.label,
              onClick: () => setSummaryFilter(opt.value),
            }))}
            trigger={(
              <button type="button" className="filter-item">
                <span>{summaryLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>
            )}
          />
        </div>

        <div className="filter-actions">
          <button type="button" className="filter-btn" onClick={handlePdf}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10,9 9,9 8,9"/>
            </svg>
            PDF
          </button>
          <button type="button" className="filter-btn" onClick={handlePrint}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6,9 6,2 18,2 18,9"/>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Print
          </button>
        </div>
      </div>

      {/* List of saved summaries */}
      {isLoading ? (
        <div className="history-empty-state">
          <p>Loading shift summaries…</p>
        </div>
      ) : summaries.length === 0 ? (
        <div className="history-empty-state">
          <p>No saved summaries matched this filter range.</p>
        </div>
      ) : (
        <div className="history-list" style={{ padding: '16px 24px' }}>
          {summaries.map((s) => (
            <div
              key={s.id}
              className="history-row"
              role="button"
              tabIndex={0}
              onClick={() => setDetailSummary(s)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  setDetailSummary(s);
                }
              }}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {s.shift_lead_name || 'Unknown'} — {s.shift_type} shift
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>
                    {s.shift_date} • Status: {s.shift_status} • Rating: {s.rating}/5
                  </div>
                </div>
                {s.needs_follow_up && (
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: 12, fontSize: 12 }}>
                    Follow-up
                  </span>
                )}
              </div>
              {s.recap && (
                <p style={{ marginTop: 8, color: '#374151', fontSize: 14 }}>
                  {s.recap}
                </p>
              )}
              {s.tags && s.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {s.tags.map((t) => (
                    <span
                      key={t.id}
                      style={{
                        fontSize: 12,
                        padding: '3px 8px',
                        borderRadius: 12,
                        background: t.kind === 'win' ? '#dcfce7' : '#fee2e2',
                        color: t.kind === 'win' ? '#166534' : '#991b1b',
                      }}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Read-only summary detail modal. */}
      <ShiftSummaryDetailModal
        isOpen={!!detailSummary}
        summary={detailSummary}
        onClose={() => setDetailSummary(null)}
      />

      {/* PDF "Coming soon" sentinel. */}
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

export default ShiftSummaryHistory;
