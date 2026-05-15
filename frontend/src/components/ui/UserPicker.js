/**
 * <UserPicker> — searchable combobox for selecting a user from the store roster.
 *
 * Usage:
 *   <UserPicker
 *     label="Assign To"
 *     value={assignedToId}
 *     onChange={(userId, userObj) => setAssignedTo(userId)}
 *     filter={(u) => u.is_active}   // optional client-side filter
 *     placeholder="Search by name or email…"
 *     required
 *   />
 *
 * Loads the roster once from /api/team/members/ and filters client-side.
 * If `value` is set on mount, it pre-fills the input with that user's name.
 */
import React, { useState, useEffect, useRef } from 'react';
import './ui.css';
import teamService from '../../services/team';

const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const UserPicker = ({
  label, value, onChange, placeholder = 'Search by name or email…',
  filter, required, error, help, id,
}) => {
  const fieldId = id || `f-${slug(label)}-userpicker`;
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wrapRef = useRef(null);

  // Load users on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await teamService.listMembers({ status: 'active' });
        const rows = res.results || res || [];
        if (!cancelled) setUsers(rows);
      } catch (err) {
        console.error('UserPicker: failed to load members:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Pre-fill query if a value is set on mount.
  useEffect(() => {
    if (value && users.length) {
      const match = users.find((u) => u.id === value);
      if (match && !query) {
        setQuery(`${match.name || match.email}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, users]);

  // Close on outside click.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isOpen]);

  const visible = users.filter((u) => {
    if (filter && !filter(u)) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  });

  const pick = (u) => {
    onChange && onChange(u.id, u);
    setQuery(u.name || u.email || '');
    setIsOpen(false);
  };

  const clear = () => {
    onChange && onChange(null, null);
    setQuery('');
  };

  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`} ref={wrapRef}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <div className="ui-user-picker">
        <input
          id={fieldId}
          type="text"
          className="ui-field-input ui-user-picker-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={isLoading ? 'Loading users…' : placeholder}
          autoComplete="off"
          required={required}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'transparent', border: 0, color: '#6b7280', cursor: 'pointer',
              padding: '4px', fontSize: 16,
            }}
            aria-label="Clear"
          >
            ×
          </button>
        )}
        {isOpen && visible.length > 0 && (
          <div className="ui-user-picker-dropdown">
            {visible.slice(0, 50).map((u) => (
              <div
                key={u.id}
                className={`ui-user-picker-item ${u.id === value ? 'selected' : ''}`}
                onClick={() => pick(u)}
              >
                <div className="ui-user-picker-avatar">{u.initials || '??'}</div>
                <div>
                  <div className="ui-user-picker-name">{u.name || u.email}</div>
                  {u.role && (
                    <div className="ui-user-picker-meta">{u.role}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {isOpen && !isLoading && visible.length === 0 && (
          <div className="ui-user-picker-dropdown">
            <div className="ui-user-picker-item" style={{ color: '#6b7280', cursor: 'default' }}>
              No users match "{query}".
            </div>
          </div>
        )}
      </div>
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

export default UserPicker;
