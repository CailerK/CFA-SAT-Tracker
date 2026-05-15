import React, { useMemo, useState, useEffect, useCallback } from 'react';
import leadershipService from '../services/leadership';
import './Leadership360Evaluations.css';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal,
  TextField, TextArea, NumberField,
} from './ui';

// Normalize a backend Evaluation360 to the row shape this UI uses.
const normalizeEval = (raw) => ({
  id: raw.id,
  name: raw.evaluatee_name || 'Unknown',
  role: raw.evaluatee_role || '',
  template: raw.template_name || '',
  status: raw.status === 'in_progress' ? 'in-progress' : raw.status,
  statusLabel: raw.status === 'in_progress' ? 'In Progress'
    : raw.status === 'completed' ? 'Completed' : raw.status,
  dueDate: raw.due_date
    ? new Date(raw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '',
  progress: raw.progress_percent || 0,
  completed: raw.completed_evaluators || 0,
  total: raw.total_evaluators || 0,
  overdue: Boolean(raw.is_overdue),
});

/* ----- Inline Lucide icons ----- */
const Icon = ({ size = 18, stroke = 2, children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
  >{children}</svg>
);
const IconClipboardList = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></Icon>);
const IconFileStack = (p) => (<Icon {...p}><path d="M21 7h-3a2 2 0 0 1-2-2V2"/><path d="M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z"/><path d="M7 8v8.8c0 .3.2.6.4.8l5 5c.1.1.3.2.5.2H18"/><path d="M3 12v8.8c0 .3.2.6.4.8l5 5c.1.1.3.2.5.2H15"/></Icon>);
const IconClock = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon>);
const IconCheckCircle = (p) => (<Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Icon>);
const IconEye = (p) => (<Icon {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></Icon>);
const IconSearch = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>);
const IconPlus = (p) => (<Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>);
const IconCalendar = (p) => (<Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></Icon>);
const IconAlertCircle = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></Icon>);
const IconChevronRight = (p) => (<Icon {...p}><path d="m9 18 6-6-6-6"/></Icon>);

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed',   label: 'Completed' },
];

const TONE = {
  slate:   { valueCls: 'text-slate',   iconBg: 'bg-slate',   iconColor: 'text-slate-strong' },
  blue:    { valueCls: 'text-blue',    iconBg: 'bg-blue',    iconColor: 'text-blue-strong' },
  emerald: { valueCls: 'text-emerald', iconBg: 'bg-emerald', iconColor: 'text-emerald-strong' },
  purple:  { valueCls: 'text-purple',  iconBg: 'bg-purple',  iconColor: 'text-purple-strong' },
};

const formatToday = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const Leadership360Evaluations = ({ user, onNavigate }) => {
  const canManage = isManagerOrAbove(user);
  const [activeTab, setActiveTab] = useState('evaluations');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [evaluations, setEvaluations] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState({ total: 0, in_progress: 0, completed: 0, reviewed: 0 });

  // ---- Modal state ----
  // templateModal: { id?, name, description, sections_count } | null
  const [templateModal, setTemplateModal] = useState(null);
  const [templateError, setTemplateError] = useState('');
  const [deleteTemplate, setDeleteTemplate] = useState(null); // template record
  // evalSentinel: { title, message } | null — for not-implemented Take/View Evaluation flow.
  const [evalSentinel, setEvalSentinel] = useState(null);

  const displayName = user?.firstName || user?.name || 'Demo User';

  const refresh = useCallback(async () => {
    try {
      const [list, statsData, templatesData] = await Promise.all([
        leadershipService.listEvaluations({ status: filter, q: query.trim() || undefined }),
        leadershipService.getEvaluationStats(),
        leadershipService.listTemplates(),
      ]);
      const rows = list.results || list || [];
      const templateRows = templatesData.results || templatesData || [];
      setEvaluations(rows.map(normalizeEval));
      setTemplates(templateRows);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load 360 evaluations:', err);
    }
  }, [filter, query]);

  useEffect(() => { refresh(); }, [refresh]);

  // Backend already filters; UI no-op pass-through.
  const filtered = evaluations;

  // Override the hardcoded STATS const using live data.
  const liveStats = useMemo(() => ([
    { key: 'total',      label: 'Total Reviews', value: stats.total || 0,       tone: 'slate',   Icon: IconClipboardList },
    { key: 'in-progress',label: 'In Progress',   value: stats.in_progress || 0, tone: 'blue',    Icon: IconClock },
    { key: 'completed',  label: 'Completed',     value: stats.completed || 0,   tone: 'emerald', Icon: IconCheckCircle },
    { key: 'reviewed',   label: 'Reviewed',      value: stats.reviewed || 0,    tone: 'purple',  Icon: IconEye },
  ]), [stats]);

  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Create/Edit Template modal ----
  const openCreateTemplate = () => {
    if (!canManage) return;
    setTemplateError('');
    setTemplateModal({
      name: '',
      description: '',
      sections_count: 6,
    });
  };

  const openEditTemplate = (template) => {
    if (!canManage) return;
    setTemplateError('');
    setTemplateModal({
      id: template.id,
      name: template.name || '',
      description: template.description || '',
      sections_count: template.sections_count ?? 0,
    });
  };

  const submitTemplate = async () => {
    if (!templateModal) return;
    const { id, name, description, sections_count } = templateModal;
    if (!name.trim()) {
      setTemplateError('Template name is required.');
      throw new Error('Missing name');
    }
    try {
      const payload = {
        name: name.trim(),
        description: (description || '').trim(),
        sections_count: Number(sections_count) || 0,
      };
      if (id) {
        await leadershipService.updateTemplate(id, payload);
      } else {
        await leadershipService.createTemplate({ ...payload, is_active: true });
      }
      setTemplateModal(null);
      await refresh();
    } catch (err) {
      setTemplateError(buildErrorDetail(err));
      throw err;
    }
  };

  // ---- Delete template ----
  const performDeleteTemplate = async () => {
    if (!deleteTemplate) return;
    try {
      await leadershipService.deleteTemplate(deleteTemplate.id);
      setDeleteTemplate(null);
      await refresh();
    } catch (err) {
      console.error('Failed to delete 360 template:', err);
      setDeleteTemplate(null);
    }
  };

  // ---- Evaluation card click (not yet implemented) ----
  // The full take/view-evaluation UI is significant work and is tracked
  // separately on the wiring plan; surface a sentinel so users see why
  // nothing happens on click.
  const handleEvaluationClick = (evaluation) => {
    setEvalSentinel({
      title: 'Take / View Evaluation — coming soon',
      message:
        `“${evaluation.name}”’s 360° review opens here. The full take-evaluation flow `
        + `(rating form, evaluator selection, results dashboard) is on the roadmap. `
        + `Backend endpoints ("respondToEvaluation", "getEvaluation") are already live.`,
    });
  };

  return (
    <div className="l360-page">
      {/* Hero */}
      <section className="l360-hero">
        <div className="l360-hero-glow" />
        <div className="l360-hero-inner">
          <div className="l360-hero-row">
            <span className="l360-hero-sun" aria-hidden>☀️</span>
            <div>
              <h1 className="l360-hero-greeting">
                Good morning, <span>{displayName}!</span>
              </h1>
              <p className="l360-hero-date">{formatToday()}</p>
            </div>
          </div>
          <div className="l360-hero-tag">
            <span className="l360-hero-divider" />
            <p>Comprehensive feedback for growth</p>
          </div>
        </div>
      </section>

      {/* Segmented Evaluations / Templates */}
      <div className="l360-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'evaluations'}
          className={`l360-tab ${activeTab === 'evaluations' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          Evaluations
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'templates'}
          className={`l360-tab ${activeTab === 'templates' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <IconFileStack size={14} />
          Templates
        </button>
      </div>

      {activeTab === 'evaluations' && (
        <>
          {/* KPIs */}
          <section className="l360-kpis">
            {liveStats.map((s) => {
              const t = TONE[s.tone];
              return (
                <div key={s.key} className="l360-kpi">
                  <div>
                    <p className="l360-kpi-label">{s.label}</p>
                    <p className={`l360-kpi-value ${t.valueCls}`}>{s.value}</p>
                  </div>
                  <div className={`l360-kpi-icon ${t.iconBg} ${t.iconColor}`}>
                    <s.Icon size={20} />
                  </div>
                </div>
              );
            })}
          </section>

          {/* Search + filters + CTA */}
          <section className="l360-toolbar">
            <label className="l360-search">
              <span className="l360-search-icon"><IconSearch size={18} /></span>
              <input
                type="text"
                placeholder="Search by name or template..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <div className="l360-pill-group">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  className={`l360-pill ${filter === f.id ? 'is-active' : ''}`}
                  onClick={() => setFilter(f.id)}
                >{f.label}</button>
              ))}
            </div>

            <button className="l360-cta" type="button" onClick={() => onNavigate && onNavigate('new-360-evaluation')}>
              <IconPlus size={16} />
              <span>New 360° Review</span>
            </button>
          </section>

          {/* Evaluation cards */}
          <section className="l360-list">
            {filtered.length === 0 ? (
              <div className="l360-empty">
                <div className="l360-empty-icon"><IconClipboardList size={28} /></div>
                <h3>No evaluations found</h3>
                <p>Try adjusting your search or create a new 360° review.</p>
              </div>
            ) : (
              filtered.map((e) => (
                <article
                  key={e.id}
                  className="l360-card"
                  onClick={() => handleEvaluationClick(e)}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                      ev.preventDefault();
                      handleEvaluationClick(e);
                    }
                  }}
                >
                  <span className={`l360-card-stripe stripe-${e.status}`} />
                  <div className="l360-card-body">
                    <div className="l360-card-left">
                      <div className="l360-card-meta">
                        <span className={`l360-badge badge-${e.status}`}>
                          <IconClock size={12} />
                          {e.statusLabel}
                        </span>
                        <span className="l360-due">
                          <IconCalendar size={12} />
                          Due {e.dueDate}
                        </span>
                      </div>
                      <h3 className="l360-card-name">{e.name}</h3>
                      <p className="l360-card-role">{e.role} · {e.template}</p>
                    </div>

                    <div className="l360-card-right">
                      <div className="l360-progress-head">
                        <span>Progress</span>
                        <span className="l360-progress-pct">{e.progress}%</span>
                      </div>
                      <div className="l360-progress-bar">
                        <div
                          className="l360-progress-fill"
                          style={{ width: `${e.progress}%` }}
                        />
                      </div>
                      <div className="l360-progress-foot">
                        <span>{e.completed} / {e.total} Completed</span>
                        {e.overdue && (
                          <span className="l360-overdue">
                            <IconAlertCircle size={12} /> Overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="l360-chevron" aria-hidden>
                      <IconChevronRight size={18} />
                    </span>
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {activeTab === 'templates' && (
        <>
          <section className="l360-toolbar">
            <div />
            {canManage && (
              <button className="l360-cta" type="button" onClick={openCreateTemplate}>
                <IconPlus size={16} />
                <span>New Template</span>
              </button>
            )}
          </section>

          <section className="l360-list">
            {templates.length === 0 ? (
              <div className="l360-empty">
                <div className="l360-empty-icon"><IconFileStack size={28} /></div>
                <h3>No templates yet</h3>
                <p>Create your first 360° evaluation template to get started.</p>
              </div>
            ) : (
              templates.map((template) => (
                <article
                  key={template.id}
                  className="l360-card"
                  onClick={() => canManage && openEditTemplate(template)}
                  style={canManage ? { cursor: 'pointer' } : undefined}
                >
                  <span className="l360-card-stripe stripe-completed" />
                  <div className="l360-card-body">
                    <div className="l360-card-left">
                      <div className="l360-card-meta">
                        <span className="l360-badge badge-completed">
                          <IconFileStack size={12} />
                          Template
                        </span>
                      </div>
                      <h3 className="l360-card-name">{template.name}</h3>
                      <p className="l360-card-role">
                        {template.description || 'No description yet'}
                      </p>
                    </div>

                    <div className="l360-card-right">
                      <div className="l360-progress-head">
                        <span>Sections</span>
                        <span className="l360-progress-pct">{template.sections_count || 0}</span>
                      </div>
                      <div className="l360-progress-foot">
                        <span>{template.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>

                    {canManage ? (
                      <div onClick={(ev) => ev.stopPropagation()}>
                        <ActionMenu
                          align="right"
                          actions={[
                            { label: 'Edit', onClick: () => openEditTemplate(template) },
                            { divider: true },
                            { label: 'Delete', destructive: true,
                              onClick: () => setDeleteTemplate(template) },
                          ]}
                          trigger={(
                            <button
                              type="button"
                              className="l360-chevron"
                              aria-label={`More actions for ${template.name}`}
                              style={{ background: 'transparent', border: 0, padding: 6, cursor: 'pointer', color: 'inherit' }}
                            >
                              ⋮
                            </button>
                          )}
                        />
                      </div>
                    ) : (
                      <span className="l360-chevron" aria-hidden>
                        <IconChevronRight size={18} />
                      </span>
                    )}
                  </div>
                </article>
              ))
            )}
          </section>
        </>
      )}

      {/* ---- Create/Edit Template modal ---- */}
      <FormModal
        isOpen={!!templateModal}
        title={templateModal?.id ? 'Edit 360° Template' : 'Create 360° Template'}
        submitLabel={templateModal?.id ? 'Save Template' : 'Create Template'}
        size="sm"
        onClose={() => setTemplateModal(null)}
        onSubmit={submitTemplate}
        submitDisabled={!templateModal?.name?.trim()}
        errorMessage={templateError}
      >
        <TextField
          label="Template Name"
          value={templateModal?.name || ''}
          onChange={(v) => setTemplateModal((m) => m && ({ ...m, name: v }))}
          placeholder="e.g. Director Leadership Review"
          required
          autoFocus
        />
        <TextArea
          label="Description"
          value={templateModal?.description || ''}
          onChange={(v) => setTemplateModal((m) => m && ({ ...m, description: v }))}
          placeholder="Briefly describe when this template should be used."
          rows={3}
        />
        <NumberField
          label="Sections Count"
          value={templateModal?.sections_count ?? ''}
          onChange={(v) => setTemplateModal((m) => m && ({ ...m, sections_count: v }))}
          placeholder="e.g. 6"
          step="1"
          required
        />
      </FormModal>

      {/* ---- Delete template confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteTemplate}
        title="Delete this template?"
        message={deleteTemplate
          ? `“${deleteTemplate.name}” will be archived. Existing evaluations using it stay intact.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteTemplate}
        onClose={() => setDeleteTemplate(null)}
      />

      {/* ---- Evaluation card sentinel ---- */}
      <ConfirmDialog
        isOpen={!!evalSentinel}
        title={evalSentinel?.title || ''}
        message={evalSentinel?.message || ''}
        confirmLabel="Got it"
        cancelLabel="Close"
        onConfirm={() => setEvalSentinel(null)}
        onClose={() => setEvalSentinel(null)}
      />
    </div>
  );
};

export default Leadership360Evaluations;
