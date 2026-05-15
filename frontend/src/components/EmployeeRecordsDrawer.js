/**
 * <EmployeeRecordsDrawer> — Right-side panel listing every documentation
 * record for one employee.
 *
 * Opened from a card on the Team Documentation page. Provides:
 *   - Scrollable list of records (newest first).
 *   - "+ Add Record" button (manager+) that opens <EmployeeRecordModal>.
 *   - Per-row delete (manager+) that opens <ConfirmDialog>.
 *
 * Refreshes its own list after every add/delete and calls `onChanged`
 * so the parent page can refetch its KPI counts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import teamService from '../services/team';
import { ConfirmDialog } from './ui';
import EmployeeRecordModal from './EmployeeRecordModal';
import './EmployeeRecordsDrawer.css';

const KIND_LABEL = {
  admin: 'Admin Note',
  warning: 'Warning',
  pip: 'PIP',
  recognition: 'Recognition',
};

const STATUS_LABEL = {
  documented: 'Documented',
  pending: 'Pending',
  resolved: 'Resolved',
};

const formatDate = (iso) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return iso;
  }
};

const EmployeeRecordsDrawer = ({ isOpen, employee, canManage, onClose, onChanged }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // { record }

  const refresh = useCallback(async () => {
    if (!employee?.id) return;
    setLoading(true);
    try {
      const rows = await teamService.listEmployeeRecords(employee.id);
      setRecords(Array.isArray(rows) ? rows : (rows.results || []));
    } catch (err) {
      console.error('Failed to load records:', err);
    } finally {
      setLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
  }, [isOpen, refresh]);

  if (!isOpen || !employee) return null;

  const handleDelete = async () => {
    if (!confirmDel?.record) return;
    await teamService.deleteRecord(confirmDel.record.id);
    setConfirmDel(null);
    await refresh();
    if (onChanged) await onChanged();
  };

  return (
    <div
      className="erd-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <aside className="erd-panel" role="dialog" aria-modal="true" aria-labelledby="erd-title">
        <header className="erd-header">
          <div className="erd-header-text">
            <h2 id="erd-title" className="erd-title">Documentation</h2>
            <p className="erd-subtitle">{employee.name} · {employee.role || ''}</p>
          </div>
          <button
            type="button"
            className="erd-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {canManage && (
          <div className="erd-actions">
            <button
              type="button"
              className="erd-add-btn"
              onClick={() => setAddOpen(true)}
            >
              <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              <span>Add Record</span>
            </button>
          </div>
        )}

        <div className="erd-list">
          {loading && <p className="erd-empty">Loading records…</p>}

          {!loading && records.length === 0 && (
            <p className="erd-empty">No documentation records yet.</p>
          )}

          {!loading && records.map((r) => (
            <article key={r.id} className={`erd-record erd-record-${r.kind}`}>
              <div className="erd-record-head">
                <div>
                  <span className={`erd-kind-pill erd-kind-${r.kind}`}>
                    {KIND_LABEL[r.kind] || r.kind}
                  </span>
                  <h3 className="erd-record-title">{r.title}</h3>
                </div>
                {canManage && (
                  <button
                    type="button"
                    className="erd-record-delete"
                    onClick={() => setConfirmDel({ record: r })}
                    aria-label={`Delete record ${r.title}`}
                    title="Delete this record"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                      <path d="M3 6h18" />
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      <line x1="10" x2="10" y1="11" y2="17" />
                      <line x1="14" x2="14" y1="11" y2="17" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="erd-record-meta">
                <span>{formatDate(r.recorded_at)}</span>
                <span className={`erd-status erd-status-${r.status}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
                {r.recorded_by_name && (
                  <span className="erd-record-by">by {r.recorded_by_name}</span>
                )}
              </div>

              {r.body && <p className="erd-record-body">{r.body}</p>}
            </article>
          ))}
        </div>
      </aside>

      <EmployeeRecordModal
        isOpen={addOpen}
        employee={employee}
        onClose={() => setAddOpen(false)}
        onSaved={async () => {
          setAddOpen(false);
          await refresh();
          if (onChanged) await onChanged();
        }}
      />

      <ConfirmDialog
        isOpen={!!confirmDel}
        title="Delete this record?"
        message={confirmDel
          ? `“${confirmDel.record.title}” will be permanently removed. This cannot be undone.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setConfirmDel(null)}
      />
    </div>
  );
};

export default EmployeeRecordsDrawer;
