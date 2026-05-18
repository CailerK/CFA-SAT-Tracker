/**
 * Manage Development Tracks — LD Growth /team-development/my-plans bottom half.
 *
 * Layout per position bucket (Team Member, Trainer, Zone Leader, Shift Lead):
 *   header (icon + name + "N tracks available") .... [+ Create Track]
 *   ↳ if plans: pastel-red track cards with icon→icon, "Default" pill,
 *      name, target_role caption, "N steps" check row, Edit + chevron + trash
 *   ↳ if no plans: dashed empty state with "+ Create First Track"
 *
 * Click Edit → opens an Edit Development Track modal with:
 *   - Basic Information (Template Name, Target Role, Description)
 *   - Track Steps list (Add Step, per-row title + kind dropdown + delete)
 *   - Cancel + Save Track footer
 *
 * Wires to /api/team-development/plans/ (DevelopmentTrackPlan model).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import leadershipService from '../services/leadership';
import { isAdminOrAbove } from '../utils/access';
import { FormModal, ConfirmDialog, TextField, TextArea, SelectField } from './ui';
import './ManageDevelopmentTracks.css';

// 4 buckets shown even when empty — matches LD Growth.
const POSITION_BUCKETS = [
  { slug: 'team-member', label: 'Team Member', icon: 'pin' },
  { slug: 'trainer',     label: 'Trainer',     icon: 'cap' },
  { slug: 'zone-leader', label: 'Zone Leader', icon: 'target' },
  { slug: 'shift-lead',  label: 'Shift Lead',  icon: 'award' },
];

const STEP_KIND_OPTIONS = [
  { value: 'mastery',          label: 'Mastery Check' },
  { value: 'dual_check',       label: 'Dual Check' },
  { value: 'training_session', label: 'Training Sessions' },
  { value: 'feedback',         label: 'Feedback' },
  { value: 'approval',         label: 'Approval' },
  { value: 'other',            label: 'Other' },
];
const stepKindLabel = (k) =>
  (STEP_KIND_OPTIONS.find(o => o.value === k) || { label: 'Other' }).label;

// ===== inline icons =====
const I = ({ size = 16, children, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
const IconPin    = (p) => <I {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></I>;
const IconCap    = (p) => <I {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 4 3 6 3s6-1.34 6-3v-5"/></I>;
const IconTarget = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></I>;
const IconAward  = (p) => <I {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></I>;
const IconArrowR = (p) => <I {...p}><polyline points="9 18 15 12 9 6"/></I>;
const IconCheck  = (p) => <I {...p}><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></I>;
const IconPlus   = (p) => <I {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></I>;
const IconEdit   = (p) => <I {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></I>;
const IconTrash  = (p) => <I {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></I>;
const IconChevD  = (p) => <I {...p}><polyline points="6 9 12 15 18 9"/></I>;
const IconDrag   = (p) => <I {...p}><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></I>;

const ICONS = { pin: IconPin, cap: IconCap, target: IconTarget, award: IconAward };

const ManageDevelopmentTracks = ({ user }) => {
  const canManage = isAdminOrAbove(user);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // edit modal: null | { id?, from_position, target_role, name, description, steps:[], is_default }
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await leadershipService.listPlans();
      const rows = res.results || res || [];
      setPlans(rows);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not load development tracks.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const plansByPosition = useMemo(() => {
    const m = {};
    for (const b of POSITION_BUCKETS) m[b.slug] = [];
    for (const p of plans) {
      if (m[p.from_position]) m[p.from_position].push(p);
    }
    return m;
  }, [plans]);

  const openCreate = (positionSlug) => {
    if (!canManage) return;
    const fromLabel = POSITION_BUCKETS.find(b => b.slug === positionSlug)?.label || '';
    setEditing({
      from_position: positionSlug,
      target_role: '',
      name: '',
      description: `Complete pathway from ${fromLabel} to the next step.`,
      is_default: false,
      steps: [],
    });
  };
  const openEdit = (plan) => {
    if (!canManage) return;
    setEditing({
      id: plan.id,
      from_position: plan.from_position,
      target_role: plan.target_role || '',
      name: plan.name || '',
      description: plan.description || '',
      is_default: !!plan.is_default,
      steps: Array.isArray(plan.steps) ? plan.steps.map(s => ({ ...s })) : [],
    });
  };

  const addStep = () => {
    if (!editing) return;
    setEditing(e => ({
      ...e,
      steps: [...e.steps, { title: '', kind: 'other' }],
    }));
  };
  const updateStep = (idx, patch) => {
    setEditing(e => ({
      ...e,
      steps: e.steps.map((s, i) => i === idx ? { ...s, ...patch } : s),
    }));
  };
  const removeStep = (idx) => {
    setEditing(e => ({
      ...e,
      steps: e.steps.filter((_, i) => i !== idx),
    }));
  };

  const savePlan = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const payload = {
        from_position: editing.from_position,
        target_role: (editing.target_role || '').trim(),
        name: (editing.name || '').trim(),
        description: editing.description || '',
        is_default: !!editing.is_default,
        steps: editing.steps.map(s => ({
          title: (s.title || '').trim(),
          kind: s.kind || 'other',
        })).filter(s => s.title),
      };
      if (editing.id) {
        await leadershipService.updatePlan(editing.id, payload);
      } else {
        await leadershipService.createPlan(payload);
      }
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!toDelete) return;
    await leadershipService.deletePlan(toDelete.id);
    setToDelete(null);
    await refresh();
  };

  if (loading) return <div className="mdt-loading">Loading tracks…</div>;
  if (error)   return <div className="mdt-error">{error}</div>;

  return (
    <section className="mdt">
      <header className="mdt-head">
        <h2 className="mdt-title">
          {canManage ? 'Manage Development Tracks' : 'Development Tracks'}
        </h2>
        <p className="mdt-sub">
          {canManage
            ? 'Configure the requirements for each career transition'
            : 'See what it takes to grow into the next role'}
        </p>
      </header>

      <div className="mdt-buckets">
        {POSITION_BUCKETS.map(bucket => {
          const items = plansByPosition[bucket.slug] || [];
          const PosIcon = ICONS[bucket.icon] || IconPin;
          return (
            <div className="mdt-bucket" key={bucket.slug}>
              <header className="mdt-bucket-head">
                <span className="mdt-bucket-icon" aria-hidden="true"><PosIcon size={18} /></span>
                <div className="mdt-bucket-titles">
                  <span className="mdt-bucket-title">{bucket.label} Tracks</span>
                  <span className="mdt-bucket-count">
                    {items.length} track{items.length === 1 ? '' : 's'} available
                  </span>
                </div>
                {canManage && (
                  <button className="mdt-create" onClick={() => openCreate(bucket.slug)}>
                    <IconPlus size={14} /> Create Track
                  </button>
                )}
              </header>

              {items.length === 0 ? (
                <div className="mdt-empty">
                  <p>No tracks configured for {bucket.label}s yet</p>
                  {canManage && (
                    <button className="mdt-empty-cta" onClick={() => openCreate(bucket.slug)}>
                      <IconPlus size={14} /> Create First Track
                    </button>
                  )}
                </div>
              ) : (
                <div className="mdt-cards">
                  {items.map(p => (
                    <article className="mdt-card" key={p.id}>
                      <div className="mdt-card-top">
                        <span className="mdt-card-icon" aria-hidden="true"><PosIcon size={16} /></span>
                        <IconArrowR size={14} className="mdt-card-arrow" />
                        <span className="mdt-card-icon-next" aria-hidden="true"><IconCap size={16} /></span>
                        {p.is_default && <span className="mdt-pill mdt-pill-default">Default</span>}
                      </div>
                      <div className="mdt-card-body">
                        <div className="mdt-card-name">{p.target_role || 'Target role'}</div>
                        <div className="mdt-card-sub">{p.name}</div>
                        <div className="mdt-card-meta">
                          <IconCheck size={14} /> {p.step_count ?? (p.steps?.length || 0)} steps
                        </div>
                      </div>
                      <div className="mdt-card-actions">
                        {canManage ? (
                          <button
                            className="mdt-edit-btn"
                            onClick={() => openEdit(p)}
                          >
                            <IconEdit size={14} /> Edit
                          </button>
                        ) : (
                          <button
                            className="mdt-edit-btn"
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          >
                            <IconChevD size={14} /> View steps
                          </button>
                        )}
                        {canManage && (
                          <button
                            className="mdt-icon-btn"
                            aria-label="Expand"
                            onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          >
                            <IconChevD size={14} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            className="mdt-icon-btn mdt-icon-btn-danger"
                            aria-label="Delete"
                            onClick={() => setToDelete(p)}
                          >
                            <IconTrash size={14} />
                          </button>
                        )}
                      </div>
                      {expandedId === p.id && (
                        <div className="mdt-card-expand">
                          {(p.steps || []).length === 0 ? (
                            <div className="mdt-card-expand-empty">No steps yet — click Edit to add some.</div>
                          ) : (
                            <ol className="mdt-step-list-mini">
                              {(p.steps || []).map((s, i) => (
                                <li key={i}>
                                  <span className="mdt-step-num">{i + 1}</span>
                                  <span className="mdt-step-title">{s.title}</span>
                                  <span className="mdt-step-kind">{stepKindLabel(s.kind)}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Edit Development Track modal ===== */}
      <FormModal
        isOpen={!!editing}
        title={editing?.id ? 'Edit Development Track' : 'Create Development Track'}
        size="lg"
        submitLabel="Save Track"
        onClose={() => setEditing(null)}
        onSubmit={savePlan}
        submitDisabled={
          !editing
          || !(editing.name || '').trim()
          || !(editing.target_role || '').trim()
          || saving
        }
      >
        {editing && (() => {
          const fromLabel = POSITION_BUCKETS.find(b => b.slug === editing.from_position)?.label
                          || editing.from_position;
          return (
            <>
              <p className="mdt-edit-intro">
                {editing.id ? 'Update' : 'Create'} the development track from <b>{fromLabel}</b> to{' '}
                <b>{editing.target_role || '…'}</b>
              </p>

              <div className="mdt-edit-card">
                <div className="mdt-edit-card-head">
                  <IconCap size={16} className="mdt-edit-card-head-icon" />
                  <span>Basic Information</span>
                </div>
                <div className="mdt-field-row">
                  <TextField
                    label="Template Name"
                    value={editing.name}
                    onChange={(v) => setEditing(e => ({ ...e, name: v }))}
                    placeholder="Trainer Certification (Calhoun)"
                    required
                  />
                  <TextField
                    label="Target Role"
                    value={editing.target_role}
                    onChange={(v) => setEditing(e => ({ ...e, target_role: v }))}
                    placeholder="Trainer"
                    required
                  />
                </div>
                <TextArea
                  label="Description"
                  value={editing.description}
                  onChange={(v) => setEditing(e => ({ ...e, description: v }))}
                  rows={3}
                  help="Provide an overview of what this development track entails and what the team member will learn."
                />
              </div>

              <div className="mdt-edit-card">
                <div className="mdt-edit-card-head">
                  <IconTarget size={16} className="mdt-edit-card-head-icon" />
                  <span>Track Steps ({editing.steps.length})</span>
                  <span className="mdt-spacer" />
                  <button type="button" className="mdt-add-step" onClick={addStep}>
                    <IconPlus size={14} /> Add Step
                  </button>
                </div>
                <p className="mdt-edit-card-sub">
                  Build the journey from skill assessment → practice → feedback → approval
                </p>

                {editing.steps.length === 0 ? (
                  <div className="mdt-step-empty">
                    No steps yet. Click "Add Step" to start.
                  </div>
                ) : (
                  <div className="mdt-step-list">
                    {editing.steps.map((s, i) => (
                      <div className="mdt-step-row" key={i}>
                        <span className="mdt-step-drag" aria-hidden="true"><IconDrag size={14} /></span>
                        <span className="mdt-step-circle">{i + 1}</span>
                        <div className="mdt-step-fields">
                          <input
                            type="text"
                            className="mdt-step-input"
                            value={s.title}
                            placeholder="Step title"
                            onChange={(e) => updateStep(i, { title: e.target.value })}
                          />
                          <SelectField
                            value={s.kind}
                            onChange={(v) => updateStep(i, { kind: v })}
                            options={STEP_KIND_OPTIONS}
                          />
                        </div>
                        <button
                          type="button"
                          className="mdt-step-delete"
                          aria-label="Remove step"
                          onClick={() => removeStep(i)}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </FormModal>

      <ConfirmDialog
        isOpen={!!toDelete}
        title={`Delete "${toDelete?.name}"?`}
        message="This development track will be archived. Active assignments are unaffected."
        destructive
        confirmLabel="Delete Track"
        onConfirm={deletePlan}
        onClose={() => setToDelete(null)}
      />
    </section>
  );
};

export default ManageDevelopmentTracks;
