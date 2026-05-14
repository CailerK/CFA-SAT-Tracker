import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './SetupSheetTemplateEdit.css';
import setupSheetsService from '../services/setupSheets';

// ----- Constants -----
const DAYS = [
  { id: 'monday', label: 'Monday', short: 'Mon' },
  { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { id: 'thursday', label: 'Thursday', short: 'Thu' },
  { id: 'friday', label: 'Friday', short: 'Fri' },
  { id: 'saturday', label: 'Saturday', short: 'Sat' },
  { id: 'sunday', label: 'Sunday', short: 'Sun' },
];

const DEPARTMENTS = [
  { id: 'front_counter', label: 'Front Counter', short: 'FC', dot: '#E51636' },
  { id: 'drive_thru', label: 'Drive-Thru', short: 'DT', dot: '#3b82f6' },
  { id: 'kitchen', label: 'Kitchen', short: 'Kitchen', dot: '#f59e0b' },
];

// ----- Icons (Lucide-matching) -----
const Icon = ({ d, paths, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round" {...props}>
    {d ? <path d={d}/> : null}
    {paths}
  </svg>
);
const IconArrowLeft = (p) => <Icon {...p} paths={<><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></>}/>;
const IconSave = (p) => <Icon {...p} paths={<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>}/>;
const IconPlus = (p) => <Icon {...p} paths={<><path d="M5 12h14"/><path d="M12 5v14"/></>}/>;
const IconCopy = (p) => <Icon {...p} paths={<><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>}/>;
const IconTrash = (p) => <Icon {...p} paths={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>}/>;
const IconPencil = (p) => <Icon {...p} paths={<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></>}/>;
const IconGrip = (p) => <Icon {...p} paths={<><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></>}/>;
const IconCheck = (p) => <Icon {...p} paths={<polyline points="20 6 9 17 4 12"/>}/>;
const IconX = (p) => <Icon {...p} paths={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>;

// ----- Helpers -----
const emptyPositions = () => ({ front_counter: [], drive_thru: [], kitchen: [] });

const newBlock = (day, order = 0) => ({
  // local-only id used as React key while unsaved.
  _key: `tmp-${Math.random().toString(36).slice(2)}`,
  day_of_week: day,
  start_time: '05:00',
  end_time: '06:00',
  label: '',
  order,
  positions_needed: emptyPositions(),
});

// Normalize an incoming block from the backend into the canonical UI shape.
const normalizeIncoming = (b, idx) => {
  const raw = b.positions_needed;
  let pn;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    pn = {
      front_counter: Array.isArray(raw.front_counter) ? raw.front_counter.slice() : [],
      drive_thru: Array.isArray(raw.drive_thru) ? raw.drive_thru.slice() : [],
      kitchen: Array.isArray(raw.kitchen) ? raw.kitchen.slice() : [],
    };
  } else if (Array.isArray(raw)) {
    pn = {
      front_counter: raw
        .map((it) => (typeof it === 'string' ? it : it?.role || ''))
        .filter(Boolean),
      drive_thru: [],
      kitchen: [],
    };
  } else {
    pn = emptyPositions();
  }
  return {
    _key: `srv-${b.id}`,
    id: b.id,
    day_of_week: b.day_of_week || 'monday',
    start_time: (b.start_time || '05:00').slice(0, 5),
    end_time: (b.end_time || '06:00').slice(0, 5),
    label: b.label || '',
    order: typeof b.order === 'number' ? b.order : idx,
    positions_needed: pn,
  };
};

// ----- Component -----
const SetupSheetTemplateEdit = ({ templateId, onBack }) => {
  const [template, setTemplate] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [activeDay, setActiveDay] = useState('monday');
  // Per-block department selection (so the user's tab choice persists per block).
  const [blockDept, setBlockDept] = useState({}); // { [_key]: 'front_counter' }
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copyMenuOpen, setCopyMenuOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState({}); // { tuesday: true, ... }
  // Position edit modal state
  const [posEdit, setPosEdit] = useState(null); // { blockKey, dept, index, value, isNew }

  // ----- Load -----
  const refresh = useCallback(async () => {
    if (!templateId) return;
    setIsLoading(true);
    try {
      const tpl = await setupSheetsService.getTemplate(templateId);
      setTemplate(tpl);
      const incoming = (tpl.time_blocks || [])
        .map(normalizeIncoming)
        .sort((a, b) => {
          const di = DAYS.findIndex((d) => d.id === a.day_of_week);
          const dj = DAYS.findIndex((d) => d.id === b.day_of_week);
          if (di !== dj) return di - dj;
          return a.order - b.order;
        });
      setBlocks(incoming);
      setErrorMsg('');
    } catch (err) {
      console.error('Failed to load template', err);
      setErrorMsg(err.message || 'Could not load template.');
    } finally {
      setIsLoading(false);
    }
  }, [templateId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ----- Derived -----
  const dayBlocks = useMemo(() => (
    blocks
      .filter((b) => b.day_of_week === activeDay)
      .sort((a, b) => a.order - b.order)
  ), [blocks, activeDay]);

  // ----- Block ops -----
  const addBlock = () => {
    const order = dayBlocks.length;
    const b = newBlock(activeDay, order);
    setBlocks((prev) => [...prev, b]);
  };

  const updateBlock = (key, patch) => {
    setBlocks((prev) => prev.map((b) => (b._key === key ? { ...b, ...patch } : b)));
  };

  const deleteBlock = (key) => {
    setBlocks((prev) => prev.filter((b) => b._key !== key));
  };

  const getBlockDept = (key) => blockDept[key] || 'front_counter';
  const setActiveDept = (key, dept) => setBlockDept((p) => ({ ...p, [key]: dept }));

  // ----- Position ops -----
  const openAddPosition = (blockKey, dept) => {
    setPosEdit({ blockKey, dept, index: -1, value: '', isNew: true });
  };
  const openEditPosition = (blockKey, dept, index, value) => {
    setPosEdit({ blockKey, dept, index, value, isNew: false });
  };
  const submitPosition = () => {
    if (!posEdit) return;
    const v = posEdit.value.trim();
    if (!v) { setPosEdit(null); return; }
    setBlocks((prev) => prev.map((b) => {
      if (b._key !== posEdit.blockKey) return b;
      const list = (b.positions_needed[posEdit.dept] || []).slice();
      if (posEdit.isNew) list.push(v);
      else list[posEdit.index] = v;
      return {
        ...b,
        positions_needed: { ...b.positions_needed, [posEdit.dept]: list },
      };
    }));
    setPosEdit(null);
  };
  const deletePosition = (blockKey, dept, index) => {
    setBlocks((prev) => prev.map((b) => {
      if (b._key !== blockKey) return b;
      const list = (b.positions_needed[dept] || []).slice();
      list.splice(index, 1);
      return {
        ...b,
        positions_needed: { ...b.positions_needed, [dept]: list },
      };
    }));
  };
  const movePosition = (blockKey, dept, from, to) => {
    setBlocks((prev) => prev.map((b) => {
      if (b._key !== blockKey) return b;
      const list = (b.positions_needed[dept] || []).slice();
      if (to < 0 || to >= list.length) return b;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return {
        ...b,
        positions_needed: { ...b.positions_needed, [dept]: list },
      };
    }));
  };

  // ----- Copy to Days -----
  const openCopyMenu = () => {
    const targets = {};
    DAYS.forEach((d) => { if (d.id !== activeDay) targets[d.id] = false; });
    setCopyTargets(targets);
    setCopyMenuOpen(true);
  };
  const toggleCopyTarget = (dayId) => {
    setCopyTargets((p) => ({ ...p, [dayId]: !p[dayId] }));
  };
  const applyCopy = () => {
    const targetDays = Object.keys(copyTargets).filter((d) => copyTargets[d]);
    if (!targetDays.length) { setCopyMenuOpen(false); return; }
    setBlocks((prev) => {
      // Drop existing blocks for target days, then clone source blocks into each.
      const filtered = prev.filter((b) => !targetDays.includes(b.day_of_week));
      const sourceBlocks = prev
        .filter((b) => b.day_of_week === activeDay)
        .sort((a, b) => a.order - b.order);
      const cloned = [];
      targetDays.forEach((day) => {
        sourceBlocks.forEach((b, idx) => {
          cloned.push({
            _key: `tmp-${Math.random().toString(36).slice(2)}`,
            day_of_week: day,
            start_time: b.start_time,
            end_time: b.end_time,
            label: b.label,
            order: idx,
            positions_needed: {
              front_counter: [...(b.positions_needed.front_counter || [])],
              drive_thru: [...(b.positions_needed.drive_thru || [])],
              kitchen: [...(b.positions_needed.kitchen || [])],
            },
          });
        });
      });
      return [...filtered, ...cloned];
    });
    setCopyMenuOpen(false);
  };

  // ----- Save -----
  const handleSave = async () => {
    if (!templateId) return;
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const payload = blocks.map((b, i) => ({
        day_of_week: b.day_of_week,
        start_time: b.start_time,
        end_time: b.end_time,
        label: b.label,
        order: typeof b.order === 'number' ? b.order : i,
        positions_needed: b.positions_needed,
      }));
      const updated = await setupSheetsService.saveTemplateTimeBlocks(templateId, payload);
      setTemplate(updated);
      const incoming = (updated.time_blocks || []).map(normalizeIncoming);
      setBlocks(incoming);
      setSuccessMsg('Template saved.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Save failed', err);
      setErrorMsg(err.message || 'Could not save template.');
    } finally {
      setIsSaving(false);
    }
  };

  // ----- Render -----
  if (isLoading) {
    return (
      <div className="sste-page">
        <div className="sste-container">
          <div className="sste-loading">Loading template…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="sste-page">
      <div className="sste-container">
        {/* Red gradient hero */}
        <div className="sste-hero">
          <div className="sste-hero-row">
            <div className="sste-hero-text">
              <h1 className="sste-hero-title">
                Edit Template: {template?.name || ''}
              </h1>
              <p className="sste-hero-sub">Modify your existing template</p>
            </div>
            <div className="sste-hero-actions">
              <button className="sste-btn sste-btn-ghost-light" onClick={onBack}>
                <IconArrowLeft className="sste-btn-icon"/>
                Back to Templates
              </button>
            </div>
          </div>
        </div>

        {/* Configure card */}
        <div className="sste-card">
          <div className="sste-card-header">
            <h2 className="sste-card-title">Configure Your Template</h2>
            <button
              className="sste-btn sste-btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <IconSave className="sste-btn-icon"/>
              {isSaving ? 'Saving…' : 'Save Template'}
            </button>
          </div>

          {errorMsg && (
            <div className="sste-banner-error">
              {errorMsg}
              <button
                type="button"
                className="sste-banner-dismiss"
                onClick={() => setErrorMsg('')}
              >
                <IconX className="sste-banner-dismiss-icon"/>
              </button>
            </div>
          )}
          {successMsg && (
            <div className="sste-banner-success">{successMsg}</div>
          )}

          <div className="sste-day-helper">
            <h3 className="sste-day-helper-label">Select a day to configure:</h3>
          </div>

          {/* Day tabs */}
          <div className="sste-day-tabs">
            {DAYS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`sste-day-tab ${activeDay === d.id ? 'active' : ''}`}
                onClick={() => setActiveDay(d.id)}
              >
                <span className="sste-day-tab-long">{d.label}</span>
                <span className="sste-day-tab-short">{d.short}</span>
              </button>
            ))}
          </div>

          {/* Day panel */}
          <div className="sste-day-panel">
            <div className="sste-day-toolbar">
              <div className="sste-day-toolbar-left">
                <h3 className="sste-day-title">
                  {DAYS.find((d) => d.id === activeDay)?.label} Time Blocks
                </h3>
                <button
                  type="button"
                  className="sste-btn sste-btn-outline"
                  onClick={openCopyMenu}
                  disabled={dayBlocks.length === 0}
                >
                  <IconCopy className="sste-btn-icon"/>
                  Copy to Days
                </button>
              </div>
              <button
                type="button"
                className="sste-btn sste-btn-soft"
                onClick={addBlock}
              >
                <IconPlus className="sste-btn-icon"/>
                Add Time Block
              </button>
            </div>

            {dayBlocks.length === 0 ? (
              <div className="sste-empty">
                No time blocks for {DAYS.find((d) => d.id === activeDay)?.label} yet.
                Click <strong>Add Time Block</strong> to create one.
              </div>
            ) : (
              <div className="sste-blocks">
                {dayBlocks.map((b) => {
                  const activeDept = getBlockDept(b._key);
                  const positions = b.positions_needed[activeDept] || [];
                  const deptMeta = DEPARTMENTS.find((d) => d.id === activeDept);
                  return (
                    <div key={b._key} className="sste-block">
                      <div className="sste-block-header">
                        <div className="sste-block-field">
                          <label className="sste-block-label">Start Time</label>
                          <input
                            type="time"
                            className="sste-input"
                            value={b.start_time}
                            onChange={(e) => updateBlock(b._key, { start_time: e.target.value })}
                          />
                        </div>
                        <div className="sste-block-field">
                          <label className="sste-block-label">End Time</label>
                          <input
                            type="time"
                            className="sste-input"
                            value={b.end_time}
                            onChange={(e) => updateBlock(b._key, { end_time: e.target.value })}
                          />
                        </div>
                        <button
                          type="button"
                          className="sste-icon-btn sste-icon-btn-trash"
                          aria-label="Delete time block"
                          onClick={() => deleteBlock(b._key)}
                        >
                          <IconTrash className="sste-icon-btn-svg"/>
                        </button>
                      </div>

                      {/* Department sub-tabs */}
                      <div className="sste-dept-tabs">
                        {DEPARTMENTS.map((dept) => (
                          <button
                            key={dept.id}
                            type="button"
                            className={`sste-dept-tab ${activeDept === dept.id ? 'active' : ''}`}
                            onClick={() => setActiveDept(b._key, dept.id)}
                          >
                            <span className="sste-dept-tab-long">{dept.label}</span>
                            <span className="sste-dept-tab-short">{dept.short}</span>
                          </button>
                        ))}
                      </div>

                      <div className="sste-dept-body">
                        <h4 className="sste-dept-heading">
                          <span
                            className="sste-dept-dot"
                            style={{ background: deptMeta?.dot }}
                          />
                          {deptMeta?.label} Positions
                        </h4>

                        {positions.length === 0 ? (
                          <div className="sste-positions-empty">
                            No {deptMeta?.label.toLowerCase()} positions yet.
                          </div>
                        ) : (
                          <div className="sste-positions">
                            {positions.map((p, idx) => (
                              <div key={`${idx}-${p}`} className="sste-position">
                                <div className="sste-position-left">
                                  <button
                                    type="button"
                                    className="sste-grip"
                                    aria-label="Reorder"
                                    onClick={() => movePosition(b._key, activeDept, idx, idx - 1)}
                                  >
                                    <IconGrip className="sste-grip-svg"/>
                                  </button>
                                  <p className="sste-position-name">{p}</p>
                                </div>
                                <div className="sste-position-actions">
                                  <button
                                    type="button"
                                    className="sste-icon-btn"
                                    aria-label="Edit position"
                                    onClick={() => openEditPosition(b._key, activeDept, idx, p)}
                                  >
                                    <IconPencil className="sste-icon-btn-svg"/>
                                  </button>
                                  <button
                                    type="button"
                                    className="sste-icon-btn sste-icon-btn-trash"
                                    aria-label="Delete position"
                                    onClick={() => deletePosition(b._key, activeDept, idx)}
                                  >
                                    <IconTrash className="sste-icon-btn-svg"/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          className="sste-add-position"
                          onClick={() => openAddPosition(b._key, activeDept)}
                        >
                          <IconPlus className="sste-btn-icon"/>
                          Add Position
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Copy to Days modal */}
      {copyMenuOpen && (
        <div className="sste-modal-overlay" onClick={() => setCopyMenuOpen(false)}>
          <div className="sste-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sste-modal-header">
              <h3 className="sste-modal-title">Copy {DAYS.find((d) => d.id === activeDay)?.label} blocks to…</h3>
              <button
                className="sste-icon-btn"
                onClick={() => setCopyMenuOpen(false)}
                aria-label="Close"
              >
                <IconX className="sste-icon-btn-svg"/>
              </button>
            </div>
            <p className="sste-modal-sub">
              Selected days will have their existing time blocks <strong>replaced</strong> with a copy of {DAYS.find((d) => d.id === activeDay)?.label}'s.
            </p>
            <div className="sste-modal-checks">
              {DAYS.filter((d) => d.id !== activeDay).map((d) => (
                <label key={d.id} className="sste-modal-check">
                  <input
                    type="checkbox"
                    checked={!!copyTargets[d.id]}
                    onChange={() => toggleCopyTarget(d.id)}
                  />
                  <span>{d.label}</span>
                </label>
              ))}
            </div>
            <div className="sste-modal-actions">
              <button className="sste-btn sste-btn-outline" onClick={() => setCopyMenuOpen(false)}>
                Cancel
              </button>
              <button className="sste-btn sste-btn-primary" onClick={applyCopy}>
                <IconCheck className="sste-btn-icon"/>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Position edit modal */}
      {posEdit && (
        <div className="sste-modal-overlay" onClick={() => setPosEdit(null)}>
          <div className="sste-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sste-modal-header">
              <h3 className="sste-modal-title">
                {posEdit.isNew ? 'Add Position' : 'Edit Position'}
              </h3>
              <button
                className="sste-icon-btn"
                onClick={() => setPosEdit(null)}
                aria-label="Close"
              >
                <IconX className="sste-icon-btn-svg"/>
              </button>
            </div>
            <label className="sste-block-label">Position name</label>
            <input
              type="text"
              autoFocus
              className="sste-input"
              value={posEdit.value}
              onChange={(e) => setPosEdit({ ...posEdit, value: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') submitPosition(); }}
              placeholder="e.g. Spa, Opening 1, Headset"
            />
            <div className="sste-modal-actions">
              <button className="sste-btn sste-btn-outline" onClick={() => setPosEdit(null)}>
                Cancel
              </button>
              <button className="sste-btn sste-btn-primary" onClick={submitPosition}>
                <IconCheck className="sste-btn-icon"/>
                {posEdit.isNew ? 'Add' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetupSheetTemplateEdit;
