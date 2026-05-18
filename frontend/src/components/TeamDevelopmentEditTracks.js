import React, { useState, useEffect, useCallback, useMemo } from 'react';
import leadershipService from '../services/leadership';
import { isAdminOrAbove } from '../utils/access';
import { ConfirmDialog, FormModal, TextField, SelectField } from './ui';
import ManageDevelopmentTracks from './ManageDevelopmentTracks';
import './TeamDevelopmentEditTracks.css';

/* ===== Inline icons (Lucide-style; never import from lucide-react) ===== */
const Icon = ({ size = 18, stroke = 2, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    {...rest}
  >{children}</svg>
);
const IconArrowLeft = (p) => (<Icon {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></Icon>);
const IconLock = (p) => (<Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Icon>);
const IconSave = (p) => (<Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></Icon>);
const IconX = (p) => (<Icon {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Icon>);
const IconTrash = (p) => (<Icon {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></Icon>);
const IconArrowLeftSm = (p) => (<Icon {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></Icon>);
const IconArrowRightSm = (p) => (<Icon {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Icon>);
const IconChevronRight = (p) => (<Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>);
const IconPlus = (p) => (<Icon {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Icon>);

// Card icons (one per `icon_key` from the backend's choice list).
const IconMapPin = (p) => (<Icon {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Icon>);
const IconGradCap = (p) => (<Icon {...p}><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>);
const IconTarget = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>);
const IconAward = (p) => (<Icon {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></Icon>);
const IconBriefcase = (p) => (<Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Icon>);
const IconUsers = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
const IconCrown = (p) => (<Icon {...p}><path d="M2 6l4 4 4-6 4 6 4-4 2 14H4z"/></Icon>);
const IconStar = (p) => (<Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>);

const ICON_MAP = {
  'map-pin':         IconMapPin,
  'graduation-cap':  IconGradCap,
  'target':          IconTarget,
  'award':           IconAward,
  'briefcase':       IconBriefcase,
  'users':           IconUsers,
  'crown':           IconCrown,
  'star':            IconStar,
};
const ICON_OPTIONS = [
  { value: 'map-pin',         label: 'Map Pin' },
  { value: 'graduation-cap',  label: 'Graduation Cap' },
  { value: 'target',          label: 'Target' },
  { value: 'award',           label: 'Award' },
  { value: 'briefcase',       label: 'Briefcase' },
  { value: 'users',           label: 'Users' },
  { value: 'crown',           label: 'Crown' },
  { value: 'star',            label: 'Star' },
];

// Color tokens — keep in sync with the backend's `COLOR_CHOICES`. Each
// entry drives the card background; text is always white.
const COLOR_MAP = {
  red:     { bg: '#E51636', label: 'CFA Red' },
  slate:   { bg: '#475569', label: 'Slate' },
  blue:    { bg: '#1d4ed8', label: 'Blue' },
  emerald: { bg: '#059669', label: 'Emerald' },
  amber:   { bg: '#d97706', label: 'Amber' },
  violet:  { bg: '#7c3aed', label: 'Violet' },
};
const COLOR_OPTIONS = Object.entries(COLOR_MAP).map(([value, { label }]) => ({ value, label }));

const TeamDevelopmentEditTracks = ({ user, onBack, onNavigate }) => {
  const canEdit = isAdminOrAbove(user);

  const [tracks, setTracks] = useState([]);
  const [originalTracks, setOriginalTracks] = useState([]);  // for dirty check
  const [visible, setVisible] = useState(true);
  const [originalVisible, setOriginalVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Modals
  const [editing, setEditing] = useState(null);    // track being edited via modal
  const [deleting, setDeleting] = useState(null);  // track pending delete
  const [adding, setAdding] = useState(null);      // new track draft

  /* ---------------- Load ---------------- */
  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const [tracksRes, settingsRes] = await Promise.all([
        leadershipService.listTracks(),
        leadershipService.getDevelopmentSettings(),
      ]);
      const rows = (tracksRes.results || tracksRes || []).slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      setTracks(rows);
      setOriginalTracks(rows);
      setVisible(!!settingsRes.dev_tracks_visible_to_team);
      setOriginalVisible(!!settingsRes.dev_tracks_visible_to_team);
    } catch (err) {
      console.error('Failed to load Edit Tracks page:', err);
      setErrorMessage('Could not load Career Path. Try refreshing.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /* ---------------- Dirty / save ---------------- */
  const isDirty = useMemo(() => {
    if (visible !== originalVisible) return true;
    if (tracks.length !== originalTracks.length) return true;
    return tracks.some((t, i) => {
      const o = originalTracks[i];
      if (!o) return true;
      return (
        o.id !== t.id
        || (o.display_name || '') !== (t.display_name || '')
        || (o.step_label   || '') !== (t.step_label   || '')
        || (o.icon_key     || '') !== (t.icon_key     || '')
        || (o.color_key    || '') !== (t.color_key    || '')
        || (o.name         || '') !== (t.name         || '')
      );
    });
  }, [tracks, originalTracks, visible, originalVisible]);

  const handleSave = async () => {
    if (!canEdit || !isDirty) return;
    setSaving(true);
    setErrorMessage('');
    try {
      // 1. Per-track patches for any visual fields that changed.
      const ops = [];
      tracks.forEach((t, i) => {
        const o = originalTracks.find((x) => x.id === t.id);
        if (!o) return; // newly-created tracks are POSTed via the modal
        const patch = {};
        ['name', 'display_name', 'step_label', 'icon_key', 'color_key'].forEach((k) => {
          if ((o[k] || '') !== (t[k] || '')) patch[k] = t[k] || '';
        });
        if (Object.keys(patch).length) ops.push(leadershipService.updateTrack(t.id, patch));
        // Reorder is handled separately below.
        if ((o.order ?? 0) !== i) {
          // Track changed position — captured by the bulk reorder call.
        }
      });
      if (ops.length) await Promise.all(ops);

      // 2. Bulk reorder (idempotent — server short-circuits if order is
      // already correct).
      await leadershipService.reorderTracks(tracks.map((t) => t.id));

      // 3. Visibility setting.
      if (visible !== originalVisible) {
        await leadershipService.updateDevelopmentSettings({
          dev_tracks_visible_to_team: visible,
        });
      }

      await refresh();
    } catch (err) {
      console.error('Save failed:', err);
      setErrorMessage(err?.data ? JSON.stringify(err.data) : (err?.message || 'Save failed.'));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Revert local state to last loaded snapshot.
    setTracks(originalTracks);
    setVisible(originalVisible);
    setErrorMessage('');
  };

  /* ---------------- Per-card actions ---------------- */
  const moveCard = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= tracks.length) return;
    const next = tracks.slice();
    const [card] = next.splice(index, 1);
    next.splice(target, 0, card);
    setTracks(next);
  };

  const openAdd = () => {
    if (!canEdit) return;
    setAdding({
      name: '',
      display_name: '',
      step_label: `Step ${tracks.length + 1}`,
      icon_key: 'map-pin',
      color_key: 'red',
    });
  };

  const submitAdd = async () => {
    if (!adding) return;
    if (!adding.name.trim()) {
      setErrorMessage('Role name is required.');
      throw new Error('missing name');
    }
    try {
      const created = await leadershipService.createTrack({
        name: adding.name.trim(),
        display_name: (adding.display_name || '').trim(),
        step_label: (adding.step_label || '').trim(),
        icon_key: adding.icon_key,
        color_key: adding.color_key,
        order: tracks.length,
      });
      // Append locally so the user keeps their unsaved reorder/edits.
      const newRow = { ...created, order: tracks.length };
      setTracks([...tracks, newRow]);
      setOriginalTracks([...originalTracks, newRow]);
      setAdding(null);
    } catch (err) {
      setErrorMessage(err?.data ? JSON.stringify(err.data) : 'Could not create role.');
      throw err;
    }
  };

  const submitEdit = async () => {
    if (!editing) return;
    setTracks((rows) => rows.map((t) => (t.id === editing.id ? editing : t)));
    setEditing(null);
  };

  const performDelete = async () => {
    if (!deleting) return;
    try {
      await leadershipService.deleteTrack(deleting.id);
      const remaining = tracks.filter((t) => t.id !== deleting.id);
      setTracks(remaining);
      setOriginalTracks(remaining);
      setDeleting(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setErrorMessage('Could not delete that role.');
    }
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="ttx-page">
      <div className="ttx-container">

        {/* Top bar */}
        <header className="ttx-topbar">
          <button
            type="button"
            className="ttx-back"
            onClick={() => {
              if (onBack) onBack();
              else if (onNavigate) onNavigate('team-development');
            }}
          >
            <IconArrowLeft size={16} />
            <span>Back to Team Development</span>
          </button>

          {canEdit && isDirty && (
            <div className="ttx-topbar-actions">
              <button type="button" className="ttx-btn ttx-btn-ghost" onClick={handleCancel} disabled={saving}>
                <IconX size={14} />
                <span>Discard</span>
              </button>
              <button type="button" className="ttx-btn ttx-btn-primary" onClick={handleSave} disabled={saving}>
                <IconSave size={14} />
                <span>{saving ? 'Saving…' : 'Save changes'}</span>
              </button>
            </div>
          )}
        </header>

        {!canEdit && (
          <div className="ttx-readonly">
            <IconLock size={14} />
            <span>You can view the Career Path, but only admins can edit it.</span>
          </div>
        )}

        {errorMessage && (
          <div className="ttx-error">{errorMessage}</div>
        )}

        {/* Visibility toggle card */}
        <section className="ttx-section">
          <div className="ttx-vis-row">
            <div className="ttx-vis-icon" aria-hidden="true">
              <IconLock size={18} />
            </div>
            <div className="ttx-vis-text">
              <p className="ttx-vis-title">Development Tracks Visibility</p>
              <p className="ttx-vis-sub">
                {visible
                  ? <><strong>Active</strong> — visible to team members</>
                  : <><strong>Hidden</strong> — only managers and admins can see the path</>
                }
              </p>
            </div>
            <div className="ttx-vis-pill">
              <span
                className={`ttx-vis-pill-text ${visible ? 'is-on' : ''}`}
                aria-hidden="true"
              >
                {visible ? 'Active' : 'Hidden'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={visible}
                disabled={!canEdit}
                className={`ttx-toggle ${visible ? 'is-on' : ''}`}
                onClick={() => canEdit && setVisible((v) => !v)}
              >
                <span className="ttx-toggle-knob" />
              </button>
            </div>
          </div>
        </section>

        {/* The Chick-fil-A Career Path editor */}
        <section className="ttx-section ttx-path-section">
          <div className="ttx-path-head">
            <div className="ttx-path-title-block">
              <h2 className="ttx-path-title">The Chick-fil-A Career Path</h2>
              <p className="ttx-path-sub">Every team member has the opportunity to grow and lead</p>
            </div>
          </div>

          {loading ? (
            <div className="ttx-loading">Loading career path…</div>
          ) : (
            <div className="ttx-path-grid" role="list">
              {tracks.map((t, i) => (
                <React.Fragment key={t.id}>
                  <PathCard
                    track={t}
                    index={i}
                    canEdit={canEdit}
                    onMoveLeft={() => moveCard(i, -1)}
                    onMoveRight={() => moveCard(i, +1)}
                    onEdit={() => setEditing({ ...t })}
                    onDelete={() => setDeleting(t)}
                  />
                  {i < tracks.length - 1 && (
                    <div className="ttx-path-arrow" aria-hidden="true">
                      <IconChevronRight size={20} />
                    </div>
                  )}
                </React.Fragment>
              ))}

              {canEdit && (
                <button
                  type="button"
                  className="ttx-path-add"
                  onClick={openAdd}
                  aria-label="Add role"
                >
                  <span className="ttx-path-add-tile">
                    <IconPlus size={26} />
                  </span>
                  <span className="ttx-path-add-label">Add Role</span>
                </button>
              )}
            </div>
          )}
        </section>

        {canEdit && (
          <ManageDevelopmentTracks user={user} />
        )}
      </div>

      {/* Edit role modal */}
      <FormModal
        isOpen={!!editing}
        title="Edit role"
        submitLabel="Apply"
        size="sm"
        onClose={() => setEditing(null)}
        onSubmit={submitEdit}
      >
        {editing && (
          <RoleFields
            value={editing}
            onChange={setEditing}
          />
        )}
      </FormModal>

      {/* Add role modal */}
      <FormModal
        isOpen={!!adding}
        title="Add role"
        submitLabel="Add role"
        size="sm"
        onClose={() => setAdding(null)}
        onSubmit={submitAdd}
        submitDisabled={!adding?.name?.trim()}
      >
        {adding && (
          <RoleFields
            value={adding}
            onChange={setAdding}
          />
        )}
      </FormModal>

      {/* Delete role confirm */}
      <ConfirmDialog
        isOpen={!!deleting}
        title="Remove this role from the path?"
        message={deleting
          ? `“${deleting.display_name || deleting.name}” will be archived. Existing team progress on it stays intact.`
          : ''}
        confirmLabel="Remove role"
        destructive
        onConfirm={performDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
};

/* ===== Path card ===== */
const PathCard = ({ track, index, canEdit, onMoveLeft, onMoveRight, onEdit, onDelete }) => {
  const Icon = ICON_MAP[track.icon_key] || IconMapPin;
  const color = COLOR_MAP[track.color_key] || COLOR_MAP.red;
  return (
    <div className="ttx-card-wrap" role="listitem">
      <div className="ttx-card" style={{ background: color.bg }}>
        {canEdit && (
          <button type="button" className="ttx-card-trash" onClick={onDelete} aria-label="Delete role">
            <IconTrash size={14} />
          </button>
        )}
        <span className="ttx-card-num" aria-hidden="true">{index + 1}</span>

        <button
          type="button"
          className="ttx-card-icon-btn"
          onClick={canEdit ? onEdit : undefined}
          disabled={!canEdit}
          aria-label={canEdit ? 'Edit role' : track.name}
        >
          <Icon size={26} stroke={2} />
        </button>

        {canEdit && (
          <div className="ttx-card-arrows">
            <button type="button" onClick={onMoveLeft} aria-label="Move left">
              <IconArrowLeftSm size={12} />
            </button>
            <button type="button" onClick={onMoveRight} aria-label="Move right">
              <IconArrowRightSm size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Below-card label & subtitle */}
      <button
        type="button"
        className="ttx-card-name"
        onClick={canEdit ? onEdit : undefined}
        disabled={!canEdit}
      >
        {track.display_name || track.name}
      </button>
      {track.step_label && (
        <p className="ttx-card-step">{track.step_label}</p>
      )}
    </div>
  );
};

/* ===== Reusable role form fields (modal body) ===== */
const RoleFields = ({ value, onChange }) => (
  <>
    <TextField
      label="Role name"
      value={value.name || ''}
      onChange={(v) => onChange({ ...value, name: v })}
      placeholder="e.g. Trainer"
      required
      autoFocus
    />
    <TextField
      label="Card label"
      help="Short label shown on the card itself (defaults to role name)."
      value={value.display_name || ''}
      onChange={(v) => onChange({ ...value, display_name: v })}
      placeholder="e.g. Trainer"
    />
    <TextField
      label="Step subtitle"
      help="Rendered beneath the card. Leave blank for none."
      value={value.step_label || ''}
      onChange={(v) => onChange({ ...value, step_label: v })}
      placeholder="e.g. Starting Point"
    />
    <SelectField
      label="Icon"
      value={value.icon_key || 'map-pin'}
      onChange={(v) => onChange({ ...value, icon_key: v })}
      options={ICON_OPTIONS}
    />
    <SelectField
      label="Card color"
      value={value.color_key || 'red'}
      onChange={(v) => onChange({ ...value, color_key: v })}
      options={COLOR_OPTIONS}
    />
  </>
);

export default TeamDevelopmentEditTracks;
