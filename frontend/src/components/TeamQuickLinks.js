import React, { useState, useEffect, useCallback } from 'react';
import teamService from '../services/team';
import { isManagerOrAbove } from '../utils/access';
import {
  ActionMenu, ConfirmDialog, FormModal,
  TextField, SelectField,
} from './ui';
import './TeamQuickLinks.css';

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
  >
    {children}
  </svg>
);

const IconSettings = (p) => (
  <Icon {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </Icon>
);
const IconPlus = (p) => (
  <Icon {...p}><path d="M5 12h14"/><path d="M12 5v14"/></Icon>
);
const IconLink = (p) => (
  <Icon {...p}>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </Icon>
);

const formatToday = () => {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// Default category color (matches CFA brand red).
const DEFAULT_COLOR = '#E51636';

// Empty-state palette for the color picker in the Manage Categories modal.
const COLOR_OPTIONS = [
  { value: '#E51636', label: 'CFA Red' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#059669', label: 'Green' },
  { value: '#d97706', label: 'Amber' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#0891b2', label: 'Teal' },
  { value: '#6b7280', label: 'Gray' },
];

const TeamQuickLinks = ({ user }) => {
  const canManage = isManagerOrAbove(user);

  const [links, setLinks] = useState([]);
  const [categories, setCategories] = useState([]);

  // ---- Modal state ----
  // linkModal: { id?, label, url, icon, category } | null
  const [linkModal, setLinkModal] = useState(null);
  const [linkError, setLinkError] = useState('');
  // deleteLink: full link row | null
  const [deleteLink, setDeleteLink] = useState(null);

  // categoriesModal: when truthy, opens the Manage Categories list FormModal.
  const [categoriesModal, setCategoriesModal] = useState(false);
  // categoryEdit: { id?, name, color } | null — opens an inline edit sub-modal
  // from inside the Manage Categories list.
  const [categoryEdit, setCategoryEdit] = useState(null);
  const [categoryError, setCategoryError] = useState('');
  // deleteCategory: full category row | null
  const [deleteCategory, setDeleteCategory] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [linksRes, categoriesRes] = await Promise.all([
        teamService.listQuickLinks(),
        teamService.listLinkCategories(),
      ]);
      setLinks(linksRes.results || linksRes || []);
      setCategories(categoriesRes.results || categoriesRes || []);
    } catch (err) {
      console.error('Failed to load quick links:', err);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const displayName = user?.firstName || user?.name || 'Demo User';

  // ---- Error helper ----
  const buildErrorDetail = (err) =>
    err?.data
      ? Object.entries(err.data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
          .join(' \u2022 ')
      : (err?.message || 'Save failed.');

  // ---- Add / edit Quick Link ----
  const openAddLink = () => {
    if (!canManage) return;
    setLinkError('');
    setLinkModal({
      label: '',
      url: 'https://',
      icon: '🔗',
      category: categories[0]?.id || '',
    });
  };
  const openEditLink = (link) => {
    if (!canManage) return;
    setLinkError('');
    setLinkModal({
      id: link.id,
      label: link.label || '',
      url: link.url || '',
      icon: link.icon || '🔗',
      category: link.category || '',
    });
  };

  const submitLink = async () => {
    if (!linkModal) return;
    const { id, label, url, icon, category } = linkModal;
    if (!label.trim()) {
      setLinkError('Label is required.');
      throw new Error('Missing label');
    }
    if (!url.trim() || !/^https?:\/\//i.test(url.trim())) {
      setLinkError('URL must start with http:// or https://.');
      throw new Error('Bad URL');
    }
    const payload = {
      label: label.trim(),
      url: url.trim(),
      icon: (icon || '').trim() || '🔗',
      category: category || null,
    };
    try {
      if (id) await teamService.updateQuickLink(id, payload);
      else await teamService.createQuickLink(payload);
      setLinkModal(null);
      await loadData();
    } catch (err) {
      setLinkError(buildErrorDetail(err));
      throw err;
    }
  };

  const performDeleteLink = async () => {
    if (!deleteLink) return;
    try {
      await teamService.deleteQuickLink(deleteLink.id);
      setDeleteLink(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete quick link:', err);
      setDeleteLink(null);
    }
  };

  // ---- Manage Categories ----
  const openManageCategories = () => {
    if (!canManage) return;
    setCategoriesModal(true);
  };

  const openAddCategory = () => {
    setCategoryError('');
    setCategoryEdit({ name: '', color: DEFAULT_COLOR });
  };
  const openEditCategory = (cat) => {
    setCategoryError('');
    setCategoryEdit({ id: cat.id, name: cat.name || '', color: cat.color || DEFAULT_COLOR });
  };

  const submitCategory = async () => {
    if (!categoryEdit) return;
    const { id, name, color } = categoryEdit;
    if (!name.trim()) {
      setCategoryError('Category name is required.');
      throw new Error('Missing name');
    }
    const payload = { name: name.trim(), color: color || DEFAULT_COLOR };
    try {
      if (id) await teamService.updateLinkCategory(id, payload);
      else await teamService.createLinkCategory(payload);
      setCategoryEdit(null);
      await loadData();
    } catch (err) {
      setCategoryError(buildErrorDetail(err));
      throw err;
    }
  };

  const performDeleteCategory = async () => {
    if (!deleteCategory) return;
    try {
      await teamService.deleteLinkCategory(deleteCategory.id);
      setDeleteCategory(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete category:', err);
      setDeleteCategory(null);
    }
  };

  // ---- Category dropdown options (for the Add/Edit Link modal) ----
  const categoryOptions = [
    { value: '', label: '\u2014 No category \u2014' },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="tql-page">
      {/* Hero banner */}
      <section className="tql-hero">
        <div className="tql-hero-glow" />
        <div className="tql-hero-inner">
          <div className="tql-hero-top">
            <div className="tql-hero-lead">
              <div className="tql-hero-row">
                <span className="tql-hero-sun" aria-hidden>☀️</span>
                <div>
                  <h1 className="tql-hero-greeting">
                    Good morning, <span>{displayName}!</span>
                  </h1>
                  <p className="tql-hero-date">{formatToday()}</p>
                </div>
              </div>
              <div className="tql-hero-tag">
                <span className="tql-hero-divider" />
                <p>Keep your store&rsquo;s essential tools just one click away.</p>
              </div>
            </div>

            {canManage && (
              <div className="tql-hero-actions">
                <button className="tql-btn tql-btn--ghost" type="button" onClick={openManageCategories}>
                  <IconSettings size={16} />
                  <span className="tql-btn-lg">Manage Categories</span>
                  <span className="tql-btn-sm">Categories</span>
                </button>
                <button className="tql-btn tql-btn--primary" type="button" onClick={openAddLink}>
                  <IconPlus size={16} />
                  <span>Add Quick Link</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Empty state */}
      {links.length === 0 && (
        <div className="tql-empty-wrap">
          <div className="tql-empty-card">
            <div className="tql-empty-icon">
              <IconLink size={28} />
            </div>
            <h3 className="tql-empty-title">No Quick Links Yet</h3>
            <p className="tql-empty-sub">
              {canManage
                ? 'Add your most-used links here for quick access'
                : 'Your manager has not added any quick links yet.'}
            </p>
            {canManage && (
              <button className="tql-empty-cta" type="button" onClick={openAddLink}>
                <IconPlus size={16} />
                <span>Add Your First Link</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Populated list view */}
      {links.length > 0 && (
        <div className="tql-list" style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {links.map((l) => (
            <div
              key={l.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                border: `2px solid ${l.category_color || '#e5e7eb'}`,
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  flex: 1,
                  textDecoration: 'none',
                  color: '#111827',
                  fontWeight: 500,
                }}
              >
                <span style={{ fontSize: 22 }}>{l.icon || '🔗'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.label}
                  </div>
                  {l.category_name && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{l.category_name}</div>
                  )}
                </div>
              </a>
              {canManage && (
                <ActionMenu
                  align="right"
                  actions={[
                    { label: 'Edit', onClick: () => openEditLink(l) },
                    { divider: true },
                    { label: 'Delete', destructive: true, onClick: () => setDeleteLink(l) },
                  ]}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- Add / Edit Link FormModal ---- */}
      <FormModal
        isOpen={!!linkModal}
        title={linkModal?.id ? 'Edit Quick Link' : 'Add Quick Link'}
        submitLabel={linkModal?.id ? 'Save Link' : 'Add Link'}
        size="sm"
        onClose={() => setLinkModal(null)}
        onSubmit={submitLink}
        submitDisabled={!linkModal?.label?.trim() || !linkModal?.url?.trim()}
        errorMessage={linkError}
      >
        <TextField
          label="Label"
          value={linkModal?.label || ''}
          onChange={(v) => setLinkModal((m) => m && ({ ...m, label: v }))}
          placeholder="e.g. CFA Home Office"
          required
          autoFocus
        />
        <TextField
          label="URL"
          value={linkModal?.url || ''}
          onChange={(v) => setLinkModal((m) => m && ({ ...m, url: v }))}
          placeholder="https://example.com"
          required
        />
        <TextField
          label="Icon / Emoji"
          value={linkModal?.icon || ''}
          onChange={(v) => setLinkModal((m) => m && ({ ...m, icon: v }))}
          placeholder="🔗"
          help="A short emoji or character displayed next to the label."
        />
        <SelectField
          label="Category"
          value={linkModal?.category || ''}
          onChange={(v) => setLinkModal((m) => m && ({ ...m, category: v }))}
          options={categoryOptions}
          help={categories.length === 0
            ? 'No categories yet. Use Manage Categories to add one.'
            : undefined}
        />
      </FormModal>

      {/* ---- Per-link delete confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteLink}
        title="Delete this quick link?"
        message={deleteLink ? `“${deleteLink.label}” will be removed from the list.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteLink}
        onClose={() => setDeleteLink(null)}
      />

      {/* ---- Manage Categories list FormModal ---- */}
      <FormModal
        isOpen={!!categoriesModal}
        title="Manage Categories"
        submitLabel="Done"
        size="sm"
        onClose={() => setCategoriesModal(false)}
        onSubmit={async () => setCategoriesModal(false)}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={openAddCategory}
            style={{ fontSize: 12, padding: '4px 10px' }}
          >
            + Add Category
          </button>
        </div>
        {categories.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
            No categories yet. Use “+ Add Category” to create one.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {categories.map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: c.color || DEFAULT_COLOR,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 14, color: '#111827' }}>{c.name}</span>
                <ActionMenu
                  align="right"
                  actions={[
                    { label: 'Edit', onClick: () => openEditCategory(c) },
                    { divider: true },
                    { label: 'Delete', destructive: true, onClick: () => setDeleteCategory(c) },
                  ]}
                />
              </div>
            ))}
          </div>
        )}
      </FormModal>

      {/* ---- Add / Edit Category FormModal (opened from Manage list) ---- */}
      <FormModal
        isOpen={!!categoryEdit}
        title={categoryEdit?.id ? 'Edit Category' : 'Add Category'}
        submitLabel={categoryEdit?.id ? 'Save Category' : 'Add Category'}
        size="sm"
        onClose={() => setCategoryEdit(null)}
        onSubmit={submitCategory}
        submitDisabled={!categoryEdit?.name?.trim()}
        errorMessage={categoryError}
      >
        <TextField
          label="Name"
          value={categoryEdit?.name || ''}
          onChange={(v) => setCategoryEdit((c) => c && ({ ...c, name: v }))}
          placeholder="e.g. Operations"
          required
          autoFocus
        />
        <SelectField
          label="Color"
          value={categoryEdit?.color || DEFAULT_COLOR}
          onChange={(v) => setCategoryEdit((c) => c && ({ ...c, color: v }))}
          options={COLOR_OPTIONS}
          help="Categorized links use this color as their border."
        />
      </FormModal>

      {/* ---- Per-category delete confirm ---- */}
      <ConfirmDialog
        isOpen={!!deleteCategory}
        title="Delete this category?"
        message={deleteCategory
          ? `“${deleteCategory.name}” will be removed. Existing links in this category will keep their URL but lose the colored border.`
          : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={performDeleteCategory}
        onClose={() => setDeleteCategory(null)}
      />
    </div>
  );
};

export default TeamQuickLinks;
