import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CreateCleaningTaskModal.css';
import cleaningService from '../services/cleaning';

// ----- Constants -----
const FREQUENCIES = [
  { id: 'daily', label: 'Daily', emoji: '\u2600\uFE0F' },           // ☀️
  { id: 'weekly', label: 'Weekly', emoji: '\uD83D\uDCC5' },         // 📅
  { id: 'monthly', label: 'Monthly', emoji: '\uD83D\uDDD3\uFE0F' }, // 🗓️
  { id: 'quarterly', label: 'Quarterly', emoji: '\uD83D\uDCCA' },   // 📊
];

const DAYS_OF_WEEK = [
  { id: 'sun', label: 'Sun' },
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
];

// ----- Icons -----
const Icon = ({ paths, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round"
       strokeLinejoin="round" {...props}>
    {paths}
  </svg>
);
const IconX = (p) => <Icon {...p} paths={<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>}/>;
const IconPlus = (p) => <Icon {...p} paths={<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>}/>;
const IconTrash = (p) => <Icon {...p} paths={<><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></>}/>;
const IconSearch = (p) => <Icon {...p} paths={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>}/>;

// ----- Helpers -----
const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  return ((parts[0][0] || '') + (parts[1]?.[0] || '')).toUpperCase();
};

// ----- Component -----
const CreateCleaningTaskModal = ({ scope = 'foh', onClose, onCreated }) => {
  // Top-level fields
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [description, setDescription] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState('');

  // Links list (each item has id for stable React keys + a draft slot for new items).
  const [links, setLinks] = useState([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Supplies list.
  const [supplies, setSupplies] = useState([]);
  const [newSupply, setNewSupply] = useState('');

  // Assignee picker.
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState(null); // {id, name, email, role}
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [assigneeLoading, setAssigneeLoading] = useState(false);
  const assigneeBoxRef = useRef(null);

  // Submission state.
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // ----- Frequency / days -----
  const toggleDay = (id) => {
    setScheduleDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  // ----- Links -----
  const addLink = () => {
    const label = newLinkLabel.trim();
    const url = newLinkUrl.trim();
    if (!label && !url) return;
    setLinks((prev) => [
      ...prev,
      { _key: `lk-${Math.random().toString(36).slice(2)}`, label, url },
    ]);
    setNewLinkLabel('');
    setNewLinkUrl('');
  };
  const removeLink = (key) => {
    setLinks((prev) => prev.filter((l) => l._key !== key));
  };

  // ----- Supplies -----
  const addSupply = () => {
    const v = newSupply.trim();
    if (!v) return;
    if (supplies.some((s) => s.toLowerCase() === v.toLowerCase())) {
      setNewSupply('');
      return;
    }
    setSupplies((prev) => [...prev, v]);
    setNewSupply('');
  };
  const removeSupply = (idx) => {
    setSupplies((prev) => prev.filter((_, i) => i !== idx));
  };

  // ----- Assignee search (debounced) -----
  const fetchAssignees = useCallback(async (q) => {
    setAssigneeLoading(true);
    try {
      const rows = await cleaningService.searchTeamMembers({ q, limit: 8 });
      setAssigneeResults(rows);
    } catch (err) {
      console.error('Assignee search failed', err);
      setAssigneeResults([]);
    } finally {
      setAssigneeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!assigneeOpen) return;
    const t = setTimeout(() => fetchAssignees(assigneeQuery), 200);
    return () => clearTimeout(t);
  }, [assigneeQuery, assigneeOpen, fetchAssignees]);

  // Close assignee dropdown on outside click.
  useEffect(() => {
    if (!assigneeOpen) return;
    const onDocClick = (e) => {
      if (assigneeBoxRef.current && !assigneeBoxRef.current.contains(e.target)) {
        setAssigneeOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [assigneeOpen]);

  // ----- Submit -----
  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Task name is required.');
      return;
    }
    if (!area.trim()) {
      setErrorMsg('Area is required.');
      return;
    }
    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        scope,
        name: trimmedName,
        area: area.trim(),
        frequency,
        days: scheduleDays,
        description: description.trim(),
        links: links.map(({ label, url }) => ({ label, url })),
        supplies,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
        assignee: selectedAssignee?.id || null,
      };
      const created = await cleaningService.create(payload);
      if (onCreated) onCreated(created);
    } catch (err) {
      console.error('Create cleaning task failed', err);
      setErrorMsg(err.message || 'Could not create task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="cct-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cct-title"
      onClick={onClose}
    >
      <div className="cct-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cct-header">
          <div className="cct-header-text">
            <h2 className="cct-title" id="cct-title">Create Cleaning Task</h2>
            <p className="cct-sub">Add a new cleaning and maintenance task</p>
          </div>
          <button
            type="button"
            className="cct-close"
            aria-label="Close"
            onClick={onClose}
          >
            <IconX className="cct-close-icon"/>
          </button>
        </div>

        {/* Body */}
        <div className="cct-body">
          {errorMsg && <div className="cct-error">{errorMsg}</div>}

          {/* Task Name */}
          <div className="cct-field">
            <label className="cct-label" htmlFor="cct-name">
              Task Name <span className="cct-required">*</span>
            </label>
            <input
              id="cct-name"
              type="text"
              className="cct-input"
              placeholder="e.g., Clean espresso machine"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Area */}
          <div className="cct-field">
            <label className="cct-label" htmlFor="cct-area">
              Area <span className="cct-required">*</span>
            </label>
            <input
              id="cct-area"
              type="text"
              className="cct-input"
              placeholder="e.g., Coffee Station, Dining Room"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              maxLength={120}
            />
          </div>

          {/* Frequency */}
          <div className="cct-field">
            <span className="cct-label">
              Frequency <span className="cct-required">*</span>
            </span>
            <div className="cct-freq-grid">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`cct-freq-card ${frequency === f.id ? 'active' : ''}`}
                  onClick={() => setFrequency(f.id)}
                  aria-pressed={frequency === f.id}
                >
                  <span className="cct-freq-emoji" aria-hidden="true">{f.emoji}</span>
                  <span className="cct-freq-text">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className="cct-field">
            <span className="cct-label">Schedule (Optional)</span>
            <p className="cct-helper">Select specific days of the week</p>
            <div className="cct-day-row">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`cct-day-pill ${scheduleDays.includes(d.id) ? 'active' : ''}`}
                  onClick={() => toggleDay(d.id)}
                  aria-pressed={scheduleDays.includes(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="cct-field">
            <label className="cct-label" htmlFor="cct-description">Description</label>
            <textarea
              id="cct-description"
              className="cct-textarea"
              placeholder="Detailed cleaning instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Links */}
          <div className="cct-field">
            <span className="cct-label">Links (Optional)</span>
            <p className="cct-helper">
              Add links to training videos, SOPs, or equipment manuals
            </p>
            {links.length > 0 && (
              <ul className="cct-list">
                {links.map((lk) => (
                  <li key={lk._key} className="cct-list-item">
                    <div className="cct-list-item-text">
                      <span className="cct-list-item-label">{lk.label || 'Untitled'}</span>
                      {lk.url && (
                        <a
                          href={lk.url}
                          className="cct-list-item-url"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {lk.url}
                        </a>
                      )}
                    </div>
                    <button
                      type="button"
                      className="cct-list-remove"
                      onClick={() => removeLink(lk._key)}
                      aria-label={`Remove ${lk.label || 'link'}`}
                    >
                      <IconTrash className="cct-list-remove-icon"/>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="cct-add-row">
              <input
                type="text"
                className="cct-input cct-add-row-grow"
                placeholder="Label (e.g., Training Video)"
                value={newLinkLabel}
                onChange={(e) => setNewLinkLabel(e.target.value)}
              />
              <input
                type="url"
                className="cct-input cct-add-row-grow"
                placeholder="URL (e.g., https://...)"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(); } }}
              />
              <button
                type="button"
                className="cct-add-btn"
                onClick={addLink}
                aria-label="Add link"
              >
                <IconPlus className="cct-add-btn-icon"/>
              </button>
            </div>
          </div>

          {/* Supplies */}
          <div className="cct-field">
            <span className="cct-label">Required Supplies</span>
            {supplies.length > 0 && (
              <div className="cct-chip-row">
                {supplies.map((s, i) => (
                  <span key={`${s}-${i}`} className="cct-chip">
                    {s}
                    <button
                      type="button"
                      className="cct-chip-x"
                      onClick={() => removeSupply(i)}
                      aria-label={`Remove ${s}`}
                    >
                      <IconX className="cct-chip-x-icon"/>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="cct-add-row">
              <input
                type="text"
                className="cct-input cct-add-row-grow"
                placeholder="Add a supply item"
                value={newSupply}
                onChange={(e) => setNewSupply(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSupply(); } }}
              />
              <button
                type="button"
                className="cct-add-btn"
                onClick={addSupply}
                aria-label="Add supply"
              >
                <IconPlus className="cct-add-btn-icon"/>
              </button>
            </div>
          </div>

          {/* Estimated Duration */}
          <div className="cct-field">
            <label className="cct-label" htmlFor="cct-duration">
              Estimated Duration (minutes)
            </label>
            <input
              id="cct-duration"
              type="number"
              min="0"
              className="cct-input"
              placeholder="e.g., 15"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
            />
          </div>

          {/* Assign To */}
          <div className="cct-field" ref={assigneeBoxRef}>
            <span className="cct-label">Assign To (Optional)</span>
            {selectedAssignee ? (
              <div className="cct-selected-assignee">
                <span className="cct-avatar">{initialsOf(selectedAssignee.name)}</span>
                <div className="cct-selected-text">
                  <p className="cct-selected-name">{selectedAssignee.name}</p>
                  {selectedAssignee.role && (
                    <p className="cct-selected-meta">{selectedAssignee.role}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="cct-list-remove"
                  onClick={() => {
                    setSelectedAssignee(null);
                    setAssigneeQuery('');
                  }}
                  aria-label="Remove assignee"
                >
                  <IconX className="cct-list-remove-icon"/>
                </button>
              </div>
            ) : (
              <div className="cct-search-wrap">
                <IconSearch className="cct-search-icon"/>
                <input
                  type="text"
                  className="cct-input cct-search-input"
                  placeholder="Search by name, email, or position..."
                  value={assigneeQuery}
                  onChange={(e) => setAssigneeQuery(e.target.value)}
                  onFocus={() => setAssigneeOpen(true)}
                />
                {assigneeOpen && (
                  <div className="cct-search-results">
                    {assigneeLoading && (
                      <div className="cct-search-empty">Searching…</div>
                    )}
                    {!assigneeLoading && assigneeResults.length === 0 && (
                      <div className="cct-search-empty">No matches.</div>
                    )}
                    {!assigneeLoading && assigneeResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="cct-search-row"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedAssignee(u);
                          setAssigneeOpen(false);
                          setAssigneeQuery('');
                        }}
                      >
                        <span className="cct-avatar">{initialsOf(u.name)}</span>
                        <div className="cct-search-row-text">
                          <p className="cct-search-row-name">{u.name}</p>
                          <p className="cct-search-row-meta">
                            {u.role || u.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="cct-footer">
          <button
            type="button"
            className="cct-btn cct-btn-cancel"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="cct-btn cct-btn-submit"
            onClick={handleSubmit}
            disabled={isSaving || !name.trim() || !area.trim()}
          >
            {isSaving ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCleaningTaskModal;
