/**
 * Documentation Preferences slide-out — LD Growth match.
 *
 * Sections (mirroring the LD Growth panel):
 *   1. Default Date Filter
 *   2. View & Display Preferences (View Mode, Sort By, Sort Order, Category)
 *   3. Card Highlighting Thresholds
 *        - Orange Cards (Excessive Documentation): N documents
 *        - Red Cards (Discipline Action Triggers): checkbox list
 *   4. Disciplinary Templates (manager-editable add/remove)
 *
 * Reads/writes `store_settings.documentation_prefs`. Manager+ only.
 */

import React, { useState, useEffect } from 'react';
import './DocumentationPreferencesDrawer.css';
import settingsService from '../services/settings';

const DATE_WINDOW_OPTIONS = [
  { value: 30,  label: 'Last 30 days' },
  { value: 60,  label: 'Last 60 days (recommended)' },
  { value: 90,  label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last year' },
];

const VIEW_MODE_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'list', label: 'List' },
];

const SORT_BY_OPTIONS = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
];

const SORT_ORDER_OPTIONS = [
  { value: 'desc', label: 'Newest First (Descending)' },
  { value: 'asc',  label: 'Oldest First (Ascending)' },
];

const CATEGORY_OPTIONS = [
  { value: 'all',     label: 'All Documents' },
  { value: 'warning', label: 'Disciplinary (Warnings)' },
  { value: 'pip',     label: 'Performance Plans' },
  { value: 'admin',   label: 'Administrative' },
];

const RED_ACTION_KINDS = [
  { value: 'verbal_warning',  label: 'Verbal Warning' },
  { value: 'written_warning', label: 'Written Warning' },
  { value: 'final_warning',   label: 'Final Warning' },
  { value: 'suspension',      label: 'Suspension' },
  { value: 'termination',     label: 'Termination' },
  { value: 'pip',             label: 'PIP' },
];

const DEFAULT_PREFS = {
  default_date_window_days: 60,
  default_view_mode: 'card',
  default_sort_by: 'date',
  default_sort_order: 'desc',
  default_category_filter: 'all',
  orange_threshold_count: 3,
  red_card_action_kinds: ['written_warning', 'final_warning', 'suspension', 'termination', 'pip'],
  disciplinary_templates: [],
};

const DocumentationPreferencesDrawer = ({ isOpen, canManage, onClose }) => {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState(null);
  const [newTpl, setNewTpl] = useState({ category: '', label: '', document_type: '' });

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const res = await settingsService.getStoreSettings();
        const p = res?.documentation_prefs || {};
        setPrefs({ ...DEFAULT_PREFS, ...p });
        setError('');
      } catch (err) {
        console.error('Failed to load doc prefs:', err);
        setError(err.message || 'Could not load preferences.');
      }
    })();
  }, [isOpen]);

  const patch = (k, v) => setPrefs(p => ({ ...p, [k]: v }));
  const toggleRedKind = (kind) => {
    setPrefs(p => {
      const set = new Set(p.red_card_action_kinds || []);
      if (set.has(kind)) set.delete(kind); else set.add(kind);
      return { ...p, red_card_action_kinds: [...set] };
    });
  };

  const addTemplate = () => {
    const cat = (newTpl.category || '').trim();
    const lbl = (newTpl.label || '').trim();
    if (!cat || !lbl) return;
    setPrefs(p => ({
      ...p,
      disciplinary_templates: [
        ...(p.disciplinary_templates || []),
        { category: cat, label: lbl, document_type: newTpl.document_type || null },
      ],
    }));
    setNewTpl({ category: '', label: '', document_type: '' });
  };
  const removeTemplate = (i) => {
    setPrefs(p => ({
      ...p,
      disciplinary_templates: (p.disciplinary_templates || []).filter((_, idx) => idx !== i),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await settingsService.updateStoreSettings({ documentation_prefs: prefs });
      setSavedAt(new Date());
    } catch (err) {
      setError(err.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="dpd-overlay" onClick={onClose} />
      <aside className="dpd-panel" role="dialog" aria-labelledby="dpd-title">
        <header className="dpd-head">
          <div className="dpd-head-row">
            <span className="dpd-head-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </span>
            <h2 id="dpd-title" className="dpd-title">Documentation Preferences</h2>
            <span className="dpd-pill">≡ Standard System</span>
            <button className="dpd-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </header>

        <div className="dpd-body">
          {error && <div className="dpd-error">{error}</div>}

          {/* 1. Default Date Filter */}
          <Section title="Default Date Filter" tone="blue">
            <Select value={prefs.default_date_window_days}
              onChange={(v) => patch('default_date_window_days', Number(v))}
              options={DATE_WINDOW_OPTIONS}
              disabled={!canManage} />
          </Section>

          {/* 2. View & Display */}
          <Section title="View & Display Preferences" tone="violet">
            <Field label="Default View Mode">
              <Select value={prefs.default_view_mode}
                onChange={(v) => patch('default_view_mode', v)}
                options={VIEW_MODE_OPTIONS}
                disabled={!canManage} />
            </Field>
            <Field label="Default Sort By">
              <Select value={prefs.default_sort_by}
                onChange={(v) => patch('default_sort_by', v)}
                options={SORT_BY_OPTIONS}
                disabled={!canManage} />
            </Field>
            <Field label="Default Sort Order">
              <Select value={prefs.default_sort_order}
                onChange={(v) => patch('default_sort_order', v)}
                options={SORT_ORDER_OPTIONS}
                disabled={!canManage} />
            </Field>
            <Field label="Default Category Filter">
              <Select value={prefs.default_category_filter}
                onChange={(v) => patch('default_category_filter', v)}
                options={CATEGORY_OPTIONS}
                disabled={!canManage} />
            </Field>
          </Section>

          {/* 3. Card highlighting */}
          <Section title="Card Highlighting Thresholds" tone="amber">
            <Field label="Orange Cards (Excessive Documentation)">
              <div className="dpd-inline">
                <input
                  type="number"
                  min="1"
                  className="dpd-num"
                  value={prefs.orange_threshold_count ?? 3}
                  onChange={(e) => patch('orange_threshold_count', Number(e.target.value))}
                  disabled={!canManage}
                />
                <span className="dpd-hint">documents in the active window</span>
              </div>
            </Field>
            <Field label="Red Cards (Discipline Action Triggers)">
              <p className="dpd-hint">Select which actions should make cards turn red</p>
              <div className="dpd-check-grid">
                {RED_ACTION_KINDS.map(k => (
                  <label key={k.value} className="dpd-check">
                    <input
                      type="checkbox"
                      checked={(prefs.red_card_action_kinds || []).includes(k.value)}
                      onChange={() => toggleRedKind(k.value)}
                      disabled={!canManage}
                    />
                    <span>{k.label}</span>
                  </label>
                ))}
              </div>
            </Field>
          </Section>

          {/* 4. Disciplinary templates */}
          <Section title="Disciplinary Templates" tone="red">
            {(prefs.disciplinary_templates || []).length === 0 && (
              <p className="dpd-hint">No templates yet — add common shortcut templates below.</p>
            )}
            {(prefs.disciplinary_templates || []).map((t, i) => (
              <div className="dpd-tpl-row" key={i}>
                <div>
                  <div className="dpd-tpl-cat">{t.category}</div>
                  <div className="dpd-tpl-label">{t.label}</div>
                </div>
                {canManage && (
                  <button className="dpd-tpl-del" onClick={() => removeTemplate(i)} aria-label="Remove">×</button>
                )}
              </div>
            ))}
            {canManage && (
              <div className="dpd-tpl-add">
                <input
                  type="text"
                  placeholder="Category (e.g. Verbal Warning)"
                  className="dpd-input"
                  value={newTpl.category}
                  onChange={(e) => setNewTpl(t => ({ ...t, category: e.target.value }))}
                />
                <input
                  type="text"
                  placeholder="Label (display name)"
                  className="dpd-input"
                  value={newTpl.label}
                  onChange={(e) => setNewTpl(t => ({ ...t, label: e.target.value }))}
                />
                <button
                  className="dpd-tpl-add-btn"
                  onClick={addTemplate}
                  disabled={!newTpl.category.trim() || !newTpl.label.trim()}
                >+ Add Template</button>
              </div>
            )}
          </Section>

          <p className="dpd-note">
            <b>Note:</b> Defaults apply when you open the Documentation page; you can
            always override them per-session with the in-page filters.
          </p>
        </div>

        <footer className="dpd-foot">
          <span className="dpd-saved">
            {savedAt && `Saved ${savedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
          </span>
          <button className="dpd-btn dpd-btn-ghost" onClick={onClose}>Cancel</button>
          {canManage && (
            <button className="dpd-btn dpd-btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </footer>
      </aside>
    </>
  );
};

// ----- sub-components -----
const Section = ({ title, tone = 'slate', children }) => (
  <section className={`dpd-card dpd-card-${tone}`}>
    <h3 className="dpd-card-title">{title}</h3>
    <div className="dpd-card-body">{children}</div>
  </section>
);

const Field = ({ label, children }) => (
  <div className="dpd-field">
    <label className="dpd-label">{label}</label>
    {children}
  </div>
);

const Select = ({ value, onChange, options, disabled }) => (
  <select
    className="dpd-select"
    value={value ?? ''}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export default DocumentationPreferencesDrawer;
