/**
 * <ChatGroupSettingsModal> — Members + Settings tabs for a chat group.
 *
 * Mirrors the LD Growth "Group" modal:
 *   - Header: red icon tile, group name + crown (if you're the creator),
 *     description, close X.
 *   - Tabs: Members(N) | Settings.
 *   - Members tab: red "Add Members" button (owner/manager only) + list
 *     of current members with role · departments · shift.
 *   - Settings tab:
 *       * Danger Zone — Delete Group (owner/manager only) + Leave Group
 *         (any member except the creator).
 *       * Who Can Send Messages? — role checkboxes that map to the
 *         channel's `allowed_roles` JSONField. Empty list = "no
 *         restrictions".
 *       * Save Messaging Permissions — PATCHes `allowed_roles`.
 *       * Group Actions — secondary "Add Members" entry point.
 *   - Footer: Close.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import chatService from '../services/chat';
import { ConfirmDialog } from './ui';
import ChatAddMembersModal from './ChatAddMembersModal';
import './ChatGroupSettingsModal.css';

/* ---------- Inline icons ---------- */
const I = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    {children}
  </svg>
);
const IconUsers = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></I>;
const IconUserPlus = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></I>;
const IconSettings = (p) => <I {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></I>;
const IconCrown = (p) => <I {...p}><path d="M2 6l4 4 4-6 4 6 4-4 2 14H4z"/></I>;
const IconX     = (p) => <I {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></I>;
const IconTrash = (p) => <I {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></I>;
const IconLogOut = (p) => <I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></I>;
const IconLightbulb = (p) => <I {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14a5 5 0 1 0-6.18 0c.55.46 1.09 1 1.09 2v1h4v-1c0-1 .54-1.54 1.09-2z"/></I>;
const IconUserMinus = (p) => <I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></I>;

/* ---------- Constants ---------- */
// The 4 "positions" the LD Growth UI exposes for messaging permissions.
// Slugs match `User.role` values (or future role values) so the backend's
// `perform_create` filter does the right thing.
const ROLE_OPTIONS = [
  { slug: 'team_member', label: 'Team Member' },
  { slug: 'trainer',     label: 'Trainer' },
  { slug: 'shift_lead',  label: 'Leader' },   // "Leader" in UI, "shift_lead" on the user model
  { slug: 'director',    label: 'Director' },
];

const formatRole = (role) => {
  if (!role) return 'Team Member';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatShift = (shift) => {
  if (!shift) return '';
  if (typeof shift === 'string') return shift.replace(/_/g, ' ');
  // shift_preference is a JSON object — render the `preferred` slot.
  if (typeof shift === 'object' && shift.preferred) {
    return String(shift.preferred).replace(/_/g, ' ') + ' shift';
  }
  return '';
};

/* =========================================================================
 * Component
 * ========================================================================= */
const ChatGroupSettingsModal = ({
  isOpen,
  channel,                  // full channel record (id, name, description, is_default, allowed_roles, created_by, ...)
  user,                     // current user
  canManage,                // boolean — `manager+ OR creator`
  onClose,
  onChanged,                // () => void — called after any mutation so parent can refetch
  onDeleted,                // () => void — called after the group itself is deleted
}) => {
  const [tab, setTab] = useState('members');   // 'members' | 'settings'
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Local "draft" of allowed_roles so the user can toggle without losing
  // state until they click "Save Messaging Permissions".
  const [draftRoles, setDraftRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmKick, setConfirmKick] = useState(null);   // member row pending removal
  const [addOpen, setAddOpen] = useState(false);

  /* ---- Reset whenever a new channel is opened ---- */
  useEffect(() => {
    if (!isOpen) return;
    setTab('members');
    setDraftRoles(Array.isArray(channel?.allowed_roles) ? channel.allowed_roles : []);
    setRolesError('');
  }, [isOpen, channel?.id, channel?.allowed_roles]);

  /* ---- Load members ---- */
  const refreshMembers = useCallback(async () => {
    if (!isOpen || !channel?.id) return;
    setLoading(true);
    try {
      const rows = await chatService.listMembers(channel.id);
      setMembers(Array.isArray(rows) ? rows : (rows.results || []));
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, channel?.id]);

  useEffect(() => { refreshMembers(); }, [refreshMembers]);

  const isCreator = !!channel?.created_by && channel.created_by === user?.id;
  const isMember = members.some((m) => m.user_id === user?.id);
  const showLeave = isMember && !isCreator;   // creators can't leave their own group; they delete it instead

  /* ---- Permissions toggle ---- */
  const toggleRole = (slug) => {
    if (!canManage) return;
    setDraftRoles((prev) => (
      prev.includes(slug)
        ? prev.filter((r) => r !== slug)
        : [...prev, slug]
    ));
    setRolesError('');
  };

  const savePermissions = async () => {
    if (!canManage) return;
    setSavingRoles(true);
    setRolesError('');
    try {
      await chatService.updateChannel(channel.id, { allowed_roles: draftRoles });
      onChanged && onChanged();
    } catch (err) {
      console.error('Save permissions failed:', err);
      setRolesError(err?.data?.detail || 'Could not save permissions.');
    } finally {
      setSavingRoles(false);
    }
  };

  const permissionsDirty = useMemo(() => {
    const orig = Array.isArray(channel?.allowed_roles) ? channel.allowed_roles : [];
    if (orig.length !== draftRoles.length) return true;
    const a = [...orig].sort().join('|');
    const b = [...draftRoles].sort().join('|');
    return a !== b;
  }, [channel?.allowed_roles, draftRoles]);

  if (!isOpen || !channel) return null;

  /* ---- Delete / Leave / Kick ---- */
  const performDelete = async () => {
    try {
      await chatService.deleteChannel(channel.id);
      setConfirmDelete(false);
      onDeleted && onDeleted();
    } catch (err) {
      console.error('Delete group failed:', err);
      alert(err?.data?.detail || 'Could not delete this group.');
    }
  };

  const performLeave = async () => {
    if (!user?.id) return;
    try {
      await chatService.removeMember(channel.id, user.id);
      setConfirmLeave(false);
      onDeleted && onDeleted();   // same effect — current user is no longer in the group
    } catch (err) {
      console.error('Leave group failed:', err);
      alert(err?.data?.detail || 'Could not leave this group.');
    }
  };

  const performKick = async () => {
    if (!confirmKick) return;
    try {
      await chatService.removeMember(channel.id, confirmKick.user_id);
      setConfirmKick(null);
      await refreshMembers();
      onChanged && onChanged();
    } catch (err) {
      console.error('Remove member failed:', err);
      alert(err?.data?.detail || 'Could not remove that member.');
    }
  };

  /* ---- Render ---- */
  return (
    <>
      <div className="cgs-overlay" onClick={onClose}>
        <div
          className="cgs-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cgs-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <header className="cgs-head">
            <div className="cgs-head-left">
              <span className="cgs-icon-tile" aria-hidden="true">
                <IconUsers size={18} />
              </span>
              <div className="cgs-head-text">
                <div className="cgs-head-title-row">
                  <h2 id="cgs-title" className="cgs-title">{channel.name}</h2>
                  {isCreator && (
                    <span className="cgs-crown" title="You created this group">
                      <IconCrown size={14} />
                    </span>
                  )}
                </div>
                {channel.description && (
                  <p className="cgs-desc">{channel.description}</p>
                )}
              </div>
            </div>
            <button type="button" className="cgs-close" aria-label="Close" onClick={onClose}>
              <IconX size={18} />
            </button>
          </header>

          {/* Tabs */}
          <div className="cgs-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'members'}
              className={`cgs-tab ${tab === 'members' ? 'is-active' : ''}`}
              onClick={() => setTab('members')}
            >
              <IconUsers size={14} />
              <span>Members ({members.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'settings'}
              className={`cgs-tab ${tab === 'settings' ? 'is-active' : ''}`}
              onClick={() => setTab('settings')}
            >
              <IconSettings size={14} />
              <span>Settings</span>
            </button>
          </div>

          {/* Body */}
          <div className="cgs-body">
            {tab === 'members' ? (
              <MembersTab
                members={members}
                loading={loading}
                canManage={canManage}
                channelCreatedBy={channel.created_by}
                currentUserId={user?.id}
                onAddClick={() => setAddOpen(true)}
                onKick={(m) => setConfirmKick(m)}
              />
            ) : (
              <SettingsTab
                channel={channel}
                canManage={canManage}
                showLeave={showLeave}
                draftRoles={draftRoles}
                onToggleRole={toggleRole}
                permissionsDirty={permissionsDirty}
                savingRoles={savingRoles}
                rolesError={rolesError}
                onSavePermissions={savePermissions}
                onDeleteClick={() => setConfirmDelete(true)}
                onLeaveClick={() => setConfirmLeave(true)}
                onAddMembersClick={() => setAddOpen(true)}
              />
            )}
          </div>

          {/* Footer */}
          <footer className="cgs-foot">
            <button type="button" className="cgs-btn cgs-btn-ghost" onClick={onClose}>
              Close
            </button>
          </footer>
        </div>
      </div>

      {/* Add members modal */}
      <ChatAddMembersModal
        isOpen={addOpen}
        channel={channel}
        existingMemberIds={members.map((m) => m.user_id)}
        onClose={() => setAddOpen(false)}
        onAdded={async () => {
          await refreshMembers();
          onChanged && onChanged();
        }}
      />

      {/* Confirm: delete group */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete this group?"
        message={`"${channel.name}" and all its messages will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete Group"
        destructive
        onConfirm={performDelete}
        onClose={() => setConfirmDelete(false)}
      />

      {/* Confirm: leave group */}
      <ConfirmDialog
        isOpen={confirmLeave}
        title="Leave this group?"
        message={`You'll stop receiving messages in "${channel.name}". An admin or the group owner can re-add you later.`}
        confirmLabel="Leave Group"
        destructive
        onConfirm={performLeave}
        onClose={() => setConfirmLeave(false)}
      />

      {/* Confirm: kick member */}
      <ConfirmDialog
        isOpen={!!confirmKick}
        title="Remove this member?"
        message={confirmKick
          ? `${confirmKick.name} will lose access to "${channel.name}".`
          : ''}
        confirmLabel="Remove"
        destructive
        onConfirm={performKick}
        onClose={() => setConfirmKick(null)}
      />
    </>
  );
};

/* =========================================================================
 * Members tab
 * ========================================================================= */
const MembersTab = ({
  members, loading, canManage, channelCreatedBy, currentUserId,
  onAddClick, onKick,
}) => {
  return (
    <>
      {canManage && (
        <button type="button" className="cgs-add-btn" onClick={onAddClick}>
          <IconUserPlus size={16} />
          <span>Add Members</span>
        </button>
      )}

      {loading ? (
        <p className="cgs-empty">Loading members…</p>
      ) : members.length === 0 ? (
        <p className="cgs-empty">No members yet.</p>
      ) : (
        <ul className="cgs-member-list">
          {members.map((m) => {
            const isOwner = channelCreatedBy && m.user_id === channelCreatedBy;
            const isSelf = m.user_id === currentUserId;
            return (
              <li key={m.id} className="cgs-member">
                <span className="cgs-avatar" aria-hidden="true">
                  {m.initials || '??'}
                  <span className="cgs-online-dot" aria-hidden="true" />
                </span>
                <div className="cgs-member-text">
                  <p className="cgs-member-name">
                    <span>{m.name}</span>
                    {isOwner && (
                      <span className="cgs-crown sm" title="Group owner">
                        <IconCrown size={12} />
                      </span>
                    )}
                  </p>
                  <p className="cgs-member-meta">
                    {formatRole(m.role)}
                    {m.department && <> · {m.department}</>}
                    {formatShift(m.shift) && <> · {formatShift(m.shift)}</>}
                  </p>
                </div>
                {canManage && !isOwner && !isSelf && (
                  <button
                    type="button"
                    className="cgs-kick-btn"
                    onClick={() => onKick(m)}
                    aria-label={`Remove ${m.name}`}
                    title="Remove from group"
                  >
                    <IconUserMinus size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
};

/* =========================================================================
 * Settings tab
 * ========================================================================= */
const SettingsTab = ({
  channel, canManage, showLeave,
  draftRoles, onToggleRole,
  permissionsDirty, savingRoles, rolesError, onSavePermissions,
  onDeleteClick, onLeaveClick, onAddMembersClick,
}) => {
  // Default channels can never be deleted, regardless of role.
  const canDelete = canManage && !channel.is_default;
  const noRestrictions = (draftRoles?.length || 0) === 0;

  return (
    <>
      {/* Danger Zone */}
      {(canDelete || showLeave) && (
        <section className="cgs-danger">
          <div className="cgs-danger-text">
            <p className="cgs-danger-title">Danger Zone</p>
            <p className="cgs-danger-sub">
              {canDelete
                ? 'Delete this group or leave it. This cannot be undone.'
                : 'Leave this group. You can be re-added later by an owner or manager.'}
            </p>
          </div>
          <div className="cgs-danger-actions">
            {showLeave && (
              <button type="button" className="cgs-btn cgs-btn-danger-ghost" onClick={onLeaveClick}>
                <IconLogOut size={14} />
                <span>Leave Group</span>
              </button>
            )}
            {canDelete && (
              <button type="button" className="cgs-btn cgs-btn-danger-ghost" onClick={onDeleteClick}>
                <IconTrash size={14} />
                <span>Delete Group</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Who Can Send Messages */}
      <section className="cgs-perms">
        <div className="cgs-perms-head">
          <p className="cgs-perms-title">Who Can Send Messages?</p>
          <p className="cgs-perms-sub">
            Select which positions can send messages. Others can view but not send.
          </p>
        </div>

        <ul className="cgs-roles">
          {ROLE_OPTIONS.map((opt) => {
            const checked = draftRoles.includes(opt.slug);
            return (
              <li key={opt.slug}>
                <label className={`cgs-role-row ${canManage ? '' : 'is-disabled'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRole(opt.slug)}
                    disabled={!canManage}
                  />
                  <span className="cgs-role-label">{opt.label}</span>
                </label>
              </li>
            );
          })}
        </ul>

        {noRestrictions && (
          <div className="cgs-perms-info">
            <IconLightbulb size={14} />
            <span>No restrictions - all members can send messages</span>
          </div>
        )}

        {rolesError && <div className="cgs-error">{rolesError}</div>}

        {canManage && (
          <button
            type="button"
            className="cgs-btn cgs-btn-primary cgs-perms-save"
            onClick={onSavePermissions}
            disabled={savingRoles || !permissionsDirty}
          >
            {savingRoles ? 'Saving…' : 'Save Messaging Permissions'}
          </button>
        )}
      </section>

      {/* Group Actions */}
      {canManage && (
        <section className="cgs-actions">
          <p className="cgs-actions-title">Group Actions</p>
          <button type="button" className="cgs-action-row" onClick={onAddMembersClick}>
            <IconUserPlus size={16} />
            <span>Add Members</span>
          </button>
        </section>
      )}
    </>
  );
};

export default ChatGroupSettingsModal;
