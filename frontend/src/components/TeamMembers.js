import React, { useMemo, useState, useEffect, useCallback } from 'react';
import teamService from '../services/team';
import { isManagerOrAbove } from '../utils/access';
import { ActionMenu, ConfirmDialog, FormModal, SelectField } from './ui';
import MemberFormModal from './MemberFormModal';
import './TeamMembers.css';

// Filter / sort option lists used by the dropdowns in the filter bar.
const DEPARTMENT_FILTERS = [
  { value: '',           label: 'All Departments' },
  { value: 'foh',        label: 'Front of House' },
  { value: 'kitchen',    label: 'Kitchen' },
  { value: 'management', label: 'Management' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'catering',   label: 'Catering' },
];

const SORT_OPTIONS = [
  { value: 'name',   label: 'Sort: Name (A–Z)' },
  { value: '-name',  label: 'Sort: Name (Z–A)' },
  { value: 'email',  label: 'Sort: Email' },
  { value: 'role',   label: 'Sort: Role' },
  { value: 'recent', label: 'Sort: Recently Added' },
];

// Map a backend role slug → the display string the UI was built for.
const formatRole = (slug) => {
  if (!slug) return 'Team Member';
  return slug
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatShiftPreference = (value) => {
  if (!value) return 'Flex';
  if (typeof value === 'string') {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  if (Array.isArray(value)) {
    return value.length ? 'Custom' : 'Flex';
  }
  if (typeof value === 'object') {
    return Object.keys(value).length ? 'Custom' : 'Flex';
  }
  return 'Flex';
};

// Normalize backend user → existing UI shape ({id, name, initials, email,
// isAdmin, isActive, role, depts, shift, manager}).
const normalizeMember = (raw) => ({
  id: raw.id,
  name: raw.name,
  initials: raw.initials || '??',
  email: raw.email || '',
  phone: raw.phone || '',
  isAdmin: Boolean(raw.is_admin),
  isActive: Boolean(raw.is_active),
  role: formatRole(raw.role),
  roleSlug: raw.role || 'team_member',
  depts: (raw.departments || []).map((d) => d.name),
  shift: formatShiftPreference(raw.shift_preference),
  managerId: raw.manager || '',
  manager: raw.manager_name || null,
});

// ===== Icons =====
const IconArrowLeft = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>);
const IconSearch = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>);
const IconChevronDown = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>);
const IconChevronRight = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m9 18 6-6-6-6"/></svg>);
const IconChevronLeft = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m15 18-6-6 6-6"/></svg>);
const IconMoreHorizontal = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>);
const IconMoreVertical = (p) => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>);

const ITEMS_PER_PAGE = 10;

const TeamMembers = ({ user, onBack, onNavigate }) => {
  const canManage = isManagerOrAbove(user);
  const [activeTab, setActiveTab] = useState('active');
  const [managersOpen, setManagersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [STATS, setSTATS] = useState({ active: 0, inactive: 0, managers: 0 });
  const [members, setMembers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter / sort state
  const [deptFilter, setDeptFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');

  // Modal state
  const [memberForm, setMemberForm] = useState(null); // null | { member } (null inside = create)
  const [confirmDialog, setConfirmDialog] = useState(null); // {title, message, destructive, onConfirm}
  const [reassign, setReassign] = useState(null); // { member, managerId }

  // Load roster + stats on mount and whenever tab/search/filter/sort change.
  const refresh = useCallback(async () => {
    try {
      const [list, stats, managerList] = await Promise.all([
        teamService.listMembers({
          status: activeTab,
          q: searchQuery.trim() || undefined,
          dept: deptFilter || undefined,
          ordering: sortBy || undefined,
        }),
        teamService.getStats(),
        teamService.listMembers({ status: 'managers' }),
      ]);
      const rows = list.results || list || [];
      const managerRows = managerList.results || managerList || [];
      setMembers(rows.map(normalizeMember));
      setManagers(managerRows.map(normalizeMember));
      setSTATS(stats);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, deptFilter, sortBy]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = members;
  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const visibleMembers = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Simple page-number strip: 1 ... totalPages with current + neighbors
  const pageNumbers = useMemo(() => {
    if (totalPages <= 4) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out = [1];
    if (page > 2) out.push(null); // gap marker
    if (page !== 1 && page !== totalPages) out.push(page);
    if (page < totalPages - 1) out.push(null);
    out.push(totalPages);
    // De-dupe consecutive markers
    return out.filter((v, i, a) => v !== a[i - 1]);
  }, [page, totalPages]);

  const handleBack = () => {
    if (onBack) return onBack();
    if (onNavigate) return onNavigate('dashboard');
  };

  // ----- Action handlers -----
  // All three (Edit / Toggle Active / Reassign Manager) get reached via
  // the per-row ActionMenu below. They each open a styled modal or
  // ConfirmDialog rather than the legacy window.prompt chain.
  const openEdit = (member) => setMemberForm({ member });
  const openCreate = () => setMemberForm({ member: null });

  const handleToggleActive = (member) => {
    const willBeActive = !member.isActive;
    setConfirmDialog({
      title: willBeActive ? `Activate ${member.name}?` : `Deactivate ${member.name}?`,
      message: willBeActive
        ? `${member.name} will return to the active roster and be assignable again.`
        : `${member.name} will move to the Inactive tab and disappear from pickers. You can reactivate them later.`,
      destructive: !willBeActive,
      confirmLabel: willBeActive ? 'Activate' : 'Deactivate',
      onConfirm: async () => {
        await teamService.updateMember(member.id, { is_active: willBeActive });
        await refresh();
        setConfirmDialog(null);
      },
    });
  };

  const openReassign = (member) => {
    setReassign({ member, managerId: member.managerId ? String(member.managerId) : '' });
  };
  const submitReassign = async () => {
    if (!reassign) return;
    const next = reassign.managerId ? Number(reassign.managerId) : null;
    await teamService.updateMember(reassign.member.id, { manager: next });
    await refresh();
    setReassign(null);
  };

  // Build the action list for a given row. Used in both desktop + mobile.
  const actionsFor = (m) => {
    if (!canManage) return [];
    return [
      { label: 'Edit Member',     onClick: () => openEdit(m) },
      { label: 'Reassign Manager', onClick: () => openReassign(m) },
      { divider: true },
      {
        label: m.isActive ? 'Deactivate' : 'Reactivate',
        destructive: m.isActive,
        onClick: () => handleToggleActive(m),
      },
    ];
  };

  // Pretty label for the current filter/sort dropdowns.
  const deptLabel =
    DEPARTMENT_FILTERS.find((d) => d.value === deptFilter)?.label || 'All Departments';
  const sortLabel =
    SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort: Name';

  return (
    <div className="tm-page">
      <div className="tm-container">
        {/* Header */}
        <header className="tm-header">
          <div className="tm-header-left">
            <button type="button" className="tm-back-btn" aria-label="Go back" onClick={handleBack}>
              <IconArrowLeft className="tm-back-icon" />
            </button>
            <div>
              <h1 className="tm-title">Team Members</h1>
              <p className="tm-subtitle">Manage your team roster and permissions</p>
            </div>
          </div>
          {canManage && (
            <div className="tm-header-actions">
              <button
                type="button"
                className="tm-add-btn"
                onClick={openCreate}
              >
                <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                <span>Add Member</span>
              </button>
            </div>
          )}
        </header>

        {/* Filter bar */}
        <div className="tm-filter-card">
          <div className="tm-search-wrap">
            <IconSearch className="tm-search-icon" />
            <input
              type="text"
              className="tm-search-input"
              placeholder="Search by name, email, position..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          </div>
          <div className="tm-filter-actions">
            <ActionMenu
              trigger={(
                <button type="button" className="tm-filter-btn">
                  <span>{deptLabel}</span>
                  <IconChevronDown className="tm-filter-chevron" />
                </button>
              )}
              actions={DEPARTMENT_FILTERS.map((opt) => ({
                label: opt.label,
                onClick: () => { setDeptFilter(opt.value); setPage(1); },
              }))}
            />
            <ActionMenu
              trigger={(
                <button type="button" className="tm-filter-btn">
                  <span>{sortLabel}</span>
                  <IconChevronDown className="tm-filter-chevron" />
                </button>
              )}
              actions={SORT_OPTIONS.map((opt) => ({
                label: opt.label,
                onClick: () => setSortBy(opt.value),
              }))}
            />
          </div>
        </div>

        {/* Active / Inactive tabs */}
        <div className="tm-status-tabs-wrap">
          <div className="tm-status-tabs">
            <button
              type="button"
              className={`tm-status-tab ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => { setActiveTab('active'); setPage(1); }}
            >
              Active
              <span className={`tm-status-count ${activeTab === 'active' ? 'active-green' : 'inactive-gray'}`}>
                {STATS.active}
              </span>
            </button>
            <button
              type="button"
              className={`tm-status-tab ${activeTab === 'inactive' ? 'active' : ''}`}
              onClick={() => { setActiveTab('inactive'); setPage(1); }}
            >
              Inactive
              <span className={`tm-status-count ${activeTab === 'inactive' ? 'active-green' : 'inactive-gray'}`}>
                {STATS.inactive}
              </span>
            </button>
          </div>
        </div>

        {/* Team Managers collapsible card */}
        <div className="tm-managers-card">
          <button
            type="button"
            className="tm-managers-head"
            onClick={() => setManagersOpen((o) => !o)}
            aria-expanded={managersOpen}
          >
            <div className="tm-managers-head-left">
              <IconChevronRight
                className={`tm-managers-chevron ${managersOpen ? 'open' : ''}`}
              />
              <h3 className="tm-managers-title">Team Managers</h3>
            </div>
            <span className="tm-managers-count">{STATS.managers} managers</span>
          </button>
          {managersOpen && (
            <div className="tm-managers-body">
              {managers.length === 0 ? (
                <p className="tm-managers-empty">No managers found for this store.</p>
              ) : (
                managers.map((manager) => (
                  <button
                    key={manager.id}
                    type="button"
                    className="tm-manager-link"
                    onClick={() => canManage && openEdit(manager)}
                    style={{ display: 'block', marginBottom: 8 }}
                  >
                    {manager.name} · {manager.role}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Members table card */}
        <div className="tm-table-card">
          {isLoading && (
            <div className="tm-row">
              <div className="tm-cell-member">
                <div className="tm-member-text">
                  <span className="tm-name">Loading team members…</span>
                </div>
              </div>
            </div>
          )}
          {/* Desktop table head */}
          <div className="tm-table-head">
            <span>Member</span>
            <span>Role / Dept</span>
            <span>Manager</span>
            <span className="tm-sr-only">Actions</span>
          </div>

          {/* Desktop rows */}
          <div className="tm-table-desktop">
            {visibleMembers.map((m, i) => (
              <div
                key={m.id}
                className="tm-row"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="tm-cell-member">
                  <div className="tm-avatar-wrap">
                    <div className="tm-avatar">{m.initials}</div>
                    {m.isActive && <span className="tm-status-dot"></span>}
                  </div>
                  <div className="tm-member-text">
                    <div className="tm-name-row">
                      <span className="tm-name">{m.name}</span>
                      {m.isAdmin && <span className="tm-admin-badge">Admin</span>}
                    </div>
                    <p className="tm-email">{m.email}</p>
                  </div>
                </div>

                <div className="tm-cell-role">
                  <p className="tm-role">{m.role}</p>
                  <div className="tm-role-meta">
                    <span className="tm-dept">{m.depts[0]}</span>
                    {m.depts.length > 1 && (
                      <span className="tm-dept-extra">+{m.depts.length - 1}</span>
                    )}
                    <span className="tm-dot">·</span>
                    <span className="tm-shift">{m.shift}</span>
                  </div>
                </div>

                <div className="tm-cell-manager">
                  {m.manager ? (
                    <button type="button" className="tm-manager-link">{m.manager}</button>
                  ) : (
                    <span className="tm-manager-empty">—</span>
                  )}
                </div>

                <div className="tm-cell-actions">
                  {canManage ? (
                    <ActionMenu
                      align="right"
                      actions={actionsFor(m)}
                      trigger={(
                        <button
                          type="button"
                          className="tm-row-action-btn"
                          aria-label={`Actions for ${m.name}`}
                        >
                          <IconMoreVertical className="tm-row-action-icon" />
                        </button>
                      )}
                    />
                  ) : (
                    <span aria-hidden="true" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="tm-table-mobile">
            {visibleMembers.map((m, i) => (
              <div
                key={m.id}
                className="tm-card"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="tm-card-head">
                  <div className="tm-card-head-left">
                    <div className="tm-avatar-wrap">
                      <div className="tm-avatar tm-avatar-lg">{m.initials}</div>
                      {m.isActive && <span className="tm-status-dot tm-status-dot-lg"></span>}
                    </div>
                    <div className="tm-card-head-text">
                      <h3 className="tm-card-name">{m.name}</h3>
                      <p className="tm-email">{m.email}</p>
                    </div>
                  </div>
                  {canManage ? (
                    <ActionMenu
                      align="right"
                      actions={actionsFor(m)}
                      trigger={(
                        <button
                          type="button"
                          className="tm-row-action-btn"
                          aria-label={`Actions for ${m.name}`}
                        >
                          <IconMoreVertical className="tm-row-action-icon" />
                        </button>
                      )}
                    />
                  ) : (
                    <span className="tm-row-action-placeholder" aria-hidden="true" />
                  )}
                </div>

                <div className="tm-card-grid">
                  <div>
                    <p className="tm-card-label">Position</p>
                    <p className="tm-card-value">{m.role}</p>
                    <p className="tm-card-sub">{m.shift} Shift</p>
                  </div>
                  <div>
                    <p className="tm-card-label">Reports to</p>
                    {m.manager ? (
                      <button type="button" className="tm-card-value tm-manager-link">{m.manager}</button>
                    ) : (
                      <p className="tm-manager-empty">—</p>
                    )}
                  </div>
                  <div>
                    <p className="tm-card-label">Department</p>
                    <div className="tm-dept-chips">
                      {m.depts.map((d) => (
                        <span key={d} className="tm-dept-chip">{d}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="tm-card-label">Contact</p>
                    <p className="tm-card-empty">No phone</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination footer */}
          <div className="tm-pagination">
            <p className="tm-pagination-text">
              Showing <span className="tm-pagination-strong">{totalCount ? (page - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to{' '}
              <span className="tm-pagination-strong">
                {Math.min(page * ITEMS_PER_PAGE, totalCount)}
              </span>{' '}
              of <span className="tm-pagination-strong">{totalCount}</span> results
            </p>
            <nav className="tm-pagination-nav">
              <button
                type="button"
                className="tm-pg-arrow"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <IconChevronLeft className="tm-pg-arrow-icon" />
              </button>
              {pageNumbers.map((n, idx) => n === null ? (
                <span key={`gap-${idx}`} className="tm-pg-gap">...</span>
              ) : (
                <button
                  key={n}
                  type="button"
                  className={`tm-pg-num ${page === n ? 'active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="tm-pg-arrow"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <IconChevronRight className="tm-pg-arrow-icon" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Add / Edit Member modal (manager+ only — gated by openEdit/openCreate) */}
      <MemberFormModal
        isOpen={!!memberForm}
        member={memberForm?.member || null}
        managers={managers}
        onClose={() => setMemberForm(null)}
        onSaved={async () => { setMemberForm(null); await refresh(); }}
      />

      {/* Reassign manager mini-modal — a SelectField inside a FormModal. */}
      <FormModal
        isOpen={!!reassign}
        title={reassign ? `Reassign Manager — ${reassign.member.name}` : ''}
        submitLabel="Save"
        size="sm"
        onClose={() => setReassign(null)}
        onSubmit={submitReassign}
      >
        <SelectField
          label="Reports To"
          value={reassign?.managerId || ''}
          onChange={(v) => setReassign((r) => r && ({ ...r, managerId: v }))}
          options={[
            { value: '', label: 'No manager' },
            ...managers
              .filter((mm) => !reassign || mm.id !== reassign.member.id)
              .map((mm) => ({ value: String(mm.id), label: mm.name })),
          ]}
        />
      </FormModal>

      {/* Activate / Deactivate confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmLabel={confirmDialog?.confirmLabel || 'Confirm'}
        destructive={!!confirmDialog?.destructive}
        onConfirm={confirmDialog?.onConfirm}
        onClose={() => setConfirmDialog(null)}
      />
    </div>
  );
};

export default TeamMembers;
