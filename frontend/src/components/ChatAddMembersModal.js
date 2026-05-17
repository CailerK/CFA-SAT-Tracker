/**
 * <ChatAddMembersModal> — searchable user picker for adding members to a
 * Team Chat group.
 *
 * - Loads the store roster (active members) once on open
 * - Excludes anyone already in the group (passed in via `existingMemberIds`)
 * - Search filters by name, email, role, department
 * - Multi-select with checkboxes; "Add N members" button bulk-POSTs
 *   `{ user_ids: [...] }` to /chat/channels/:id/members/
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import chatService from '../services/chat';
import teamService from '../services/team';
import './ChatAddMembersModal.css';

const I = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconSearch = (p) => <I {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></I>;
const IconX      = (p) => <I {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></I>;
const IconCheck  = (p) => <I {...p}><polyline points="20 6 9 17 4 12"/></I>;
const IconUserPlus = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></I>;

const formatRole = (role) => {
  if (!role) return 'Team Member';
  return role
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const ChatAddMembersModal = ({
  isOpen,
  channel,                      // { id, name }
  existingMemberIds = [],       // user IDs already in the group
  onClose,
  onAdded,                      // (count) => void — called after successful add
}) => {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  /* ---- Load roster on open ---- */
  const loadRoster = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError('');
    try {
      const res = await teamService.listMembers({ status: 'active' });
      const rows = res.results || res || [];
      setRoster(rows);
    } catch (err) {
      console.error('Failed to load roster:', err);
      setError('Could not load team roster.');
    } finally {
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  // Reset selection / search every time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setSelected(new Set());
      setSearch('');
      setError('');
    }
  }, [isOpen]);

  /* ---- Filter ---- */
  const eligible = useMemo(() => {
    const exclude = new Set((existingMemberIds || []).map(Number));
    return roster.filter((m) => !exclude.has(Number(m.id)));
  }, [roster, existingMemberIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((m) => {
      const blob = [
        m.name,
        m.email,
        m.role,
        ...((Array.isArray(m.depts) ? m.depts : []) || []),
      ].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }, [eligible, search]);

  /* ---- Toggle selection ---- */
  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ---- Submit ---- */
  const handleAdd = async () => {
    if (!channel?.id || selected.size === 0) return;
    setSubmitting(true);
    setError('');
    try {
      const ids = Array.from(selected);
      const res = await chatService.addMembers(channel.id, ids);
      if (typeof onAdded === 'function') onAdded(res?.added ?? ids.length);
      onClose && onClose();
    } catch (err) {
      console.error('Add members failed:', err);
      setError(err?.data?.detail || err?.message || 'Could not add members.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cam-overlay" onClick={onClose}>
      <div
        className="cam-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cam-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="cam-head">
          <div>
            <h2 id="cam-title" className="cam-title">Add Members</h2>
            <p className="cam-sub">
              {channel?.name ? <>to <strong>{channel.name}</strong></> : 'to this group'}
            </p>
          </div>
          <button type="button" className="cam-close" aria-label="Close" onClick={onClose}>
            <IconX size={18} />
          </button>
        </header>

        {/* Search */}
        <div className="cam-search">
          <IconSearch size={14} />
          <input
            type="text"
            placeholder="Search by name, role, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && <div className="cam-error">{error}</div>}

        {/* Roster list */}
        <div className="cam-list">
          {loading ? (
            <div className="cam-empty">Loading roster…</div>
          ) : filtered.length === 0 ? (
            <div className="cam-empty">
              {eligible.length === 0
                ? 'Everyone is already in this group.'
                : `No matches for "${search}".`}
            </div>
          ) : filtered.map((m) => {
            const isSelected = selected.has(m.id);
            const depts = Array.isArray(m.depts) ? m.depts.join(', ') : '';
            return (
              <button
                key={m.id}
                type="button"
                role="checkbox"
                aria-checked={isSelected}
                className={`cam-row ${isSelected ? 'is-selected' : ''}`}
                onClick={() => toggle(m.id)}
              >
                <span className={`cam-check ${isSelected ? 'is-on' : ''}`} aria-hidden="true">
                  {isSelected && <IconCheck size={12} />}
                </span>
                <span className="cam-avatar" aria-hidden="true">{m.initials || '??'}</span>
                <div className="cam-row-text">
                  <p className="cam-row-name">
                    {m.name}
                    {m.isAdmin && <span className="cam-badge">Admin</span>}
                  </p>
                  <p className="cam-row-meta">
                    {formatRole(m.role)}
                    {depts && <> · {depts}</>}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <footer className="cam-foot">
          <span className="cam-count">
            {selected.size} selected
          </span>
          <div className="cam-foot-actions">
            <button type="button" className="cam-btn cam-btn-ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="cam-btn cam-btn-primary"
              onClick={handleAdd}
              disabled={submitting || selected.size === 0}
            >
              <IconUserPlus size={14} />
              <span>{submitting ? 'Adding…' : `Add ${selected.size || ''} Member${selected.size === 1 ? '' : 's'}`}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ChatAddMembersModal;
