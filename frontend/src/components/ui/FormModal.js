/**
 * <FormModal> — generic modal shell for "Add X" / "Edit X" forms.
 *
 * Renders an overlay with header (title + close X), scrollable body
 * (your form fields go in `children`), and a footer with Cancel + Save.
 * The Save button awaits the `onSubmit` promise and shows a status pill.
 *
 * Usage:
 *   const [open, setOpen] = useState(false);
 *   ...
 *   <FormModal
 *     isOpen={open}
 *     title="Add Team Member"
 *     onClose={() => setOpen(false)}
 *     onSubmit={async () => {
 *       await teamService.createMember(form);
 *       setOpen(false);
 *       await refreshList();
 *     }}
 *   >
 *     <TextField label="Name" value={name} onChange={setName} required />
 *     <TextField label="Email" value={email} onChange={setEmail} type="email" required />
 *   </FormModal>
 *
 * Props:
 *   - isOpen (bool, required)
 *   - title (string, required)
 *   - children (form fields)
 *   - onSubmit (async function — gets called when user clicks Save)
 *   - onClose (function)
 *   - submitLabel (default 'Save')
 *   - cancelLabel (default 'Cancel')
 *   - size: 'sm' | 'default' | 'lg' (default 'default')
 *   - submitDisabled (bool — manually disable the Save button)
 *   - errorMessage (string — shows in footer next to buttons)
 */
import React, { useState } from 'react';
import './ui.css';

const FormModal = ({
  isOpen,
  title,
  children,
  onSubmit,
  onClose,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  size = 'default',
  submitDisabled = false,
  errorMessage = '',
}) => {
  const [status, setStatus] = useState(null); // 'saving' | 'error' | null
  const [localError, setLocalError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e && e.preventDefault();
    if (!onSubmit) return;
    setStatus('saving');
    setLocalError('');
    try {
      await onSubmit();
      setStatus(null);
    } catch (err) {
      console.error('FormModal submit failed:', err);
      setLocalError(err?.message || 'Save failed. Please try again.');
      setStatus('error');
    }
  };

  const sizeClass = size === 'lg' ? 'ui-modal-lg' : size === 'sm' ? 'ui-modal-sm' : '';

  return (
    <div
      className="ui-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && status !== 'saving') onClose && onClose(); }}
    >
      <form
        className={`ui-modal-content ${sizeClass}`}
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ui-modal-title"
      >
        <div className="ui-modal-header">
          <h2 id="ui-modal-title" className="ui-modal-title">{title}</h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            disabled={status === 'saving'}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="ui-modal-body">
          {children}
        </div>

        <div className="ui-modal-footer">
          {(errorMessage || localError) && (
            <span className="ui-save-status error">
              {errorMessage || localError}
            </span>
          )}
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={onClose}
            disabled={status === 'saving'}
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={submitDisabled || status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormModal;
