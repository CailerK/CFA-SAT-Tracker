/**
 * <ConfirmDialog> — styled replacement for window.confirm().
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null);
 *   ...
 *   <ConfirmDialog
 *     isOpen={!!confirm}
 *     title="Delete this task?"
 *     message="This can't be undone."
 *     confirmLabel="Delete"
 *     destructive
 *     onConfirm={async () => { await del(confirm.id); setConfirm(null); }}
 *     onClose={() => setConfirm(null)}
 *   />
 *
 * Props:
 *   - isOpen (bool, required)
 *   - title (string, required)
 *   - message (string | ReactNode)
 *   - confirmLabel (default 'Confirm')
 *   - cancelLabel (default 'Cancel')
 *   - destructive (bool — uses red Delete-style button)
 *   - onConfirm (async function — keeps the dialog open while awaiting)
 *   - onClose (function)
 */
import React, { useState } from 'react';
import './ui.css';

const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!onConfirm) {
      onClose && onClose();
      return;
    }
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose && onClose(); }}
    >
      <div className="ui-modal-content ui-modal-sm" role="alertdialog" aria-modal="true">
        <div className="ui-modal-header">
          <h2 className="ui-modal-title">{title}</h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="ui-modal-body">
          {typeof message === 'string' ? (
            <p style={{ margin: 0, color: '#374151', fontSize: 14, lineHeight: 1.5 }}>{message}</p>
          ) : (
            message
          )}
        </div>
        <div className="ui-modal-footer">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-btn ${destructive ? 'ui-btn-danger' : 'ui-btn-primary'}`}
            onClick={handleConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
