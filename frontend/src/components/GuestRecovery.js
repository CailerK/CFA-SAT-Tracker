import React, { useState, useEffect, useCallback } from 'react';
import './GuestRecovery.css';
import guestRecoveryService from '../services/guestRecovery';
import teamService from '../services/team';

// Backend status slugs → UI labels.
const STATUS_FROM_API = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
};
const STATUS_TO_API = {
  Open: 'open', 'In Progress': 'in_progress', Resolved: 'resolved',
};

// Backend category slugs → UI labels (UI matches LD Growth strings).
const CATEGORY_FROM_API = {
  order_error: 'Order Error',
  service: 'Service Issue',
  food_quality: 'Food Quality',
  wait_time: 'Wait Time',
  cleanliness: 'Cleanliness',
  staff_behavior: 'Staff Behavior',
  app_rewards: 'App/Rewards',
  other: 'Other',
};
const CATEGORY_TO_API = Object.fromEntries(
  Object.entries(CATEGORY_FROM_API).map(([k, v]) => [v, k])
);

// Normalize a backend GuestComplaint → the row shape the UI uses.
const normalizeComplaint = (raw) => {
  let date = '';
  let time = '';
  if (raw.occurred_at) {
    try {
      const d = new Date(raw.occurred_at);
      date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch {}
  }
  return {
    id: raw.id,
    name: raw.guest_name || '',
    phone: raw.guest_phone || '',
    date, time,
    category: CATEGORY_FROM_API[raw.category] || raw.category || 'Other',
    description: raw.description || '',
    status: STATUS_FROM_API[raw.status] || 'Open',
    resolution: raw.resolution || '',
    assignedToId: raw.assigned_to || '',
    assignedTo: raw.assigned_to_name || null,
  };
};

const CATEGORIES = ['Order Error', 'Service Issue', 'Food Quality', 'Wait Time', 'Cleanliness', 'Staff Behavior', 'App/Rewards', 'Other'];
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved'];

const STATUS_COLORS = {
  'Open':        { bg: '#fee2e2', text: '#b91c1c' },
  'In Progress': { bg: '#fef3c7', text: '#b45309' },
  'Resolved':    { bg: '#d1fae5', text: '#065f46' },
};

const EMPTY_FORM = { name: '', phone: '', category: '', description: '', assignedTo: '' };

const GuestRecovery = ({ onBack }) => {
  const [activeStatus, setActiveStatus] = useState('All');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, in_progress: 0, resolved: 0 });
  const [teamMembers, setTeamMembers] = useState([]);
  const [detailStatus, setDetailStatus] = useState('Open');
  const [detailAssignedToId, setDetailAssignedToId] = useState('');
  const [detailResolution, setDetailResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [res, statsRes] = await Promise.all([
        guestRecoveryService.list({
          status: activeStatus !== 'All' ? STATUS_TO_API[activeStatus] : undefined,
          q: searchQuery.trim() || undefined,
        }),
        guestRecoveryService.stats().catch(() => null),
      ]);
      const rows = res.results || res || [];
      setComplaints(rows.map(normalizeComplaint));
      if (statsRes) {
        setStats({
          total: statsRes.total || 0,
          open: statsRes.open || 0,
          in_progress: statsRes.in_progress || 0,
          resolved: statsRes.resolved || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load guest complaints:', err);
    }
  }, [activeStatus, searchQuery]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await teamService.listMembers({ status: 'active' });
        const rows = res.results || res || [];
        if (!cancelled) {
          setTeamMembers(rows.map((member) => ({
            id: member.id,
            name: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email,
          })));
        }
      } catch (err) {
        console.error('Failed to load team members for guest recovery:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedComplaint) return;
    setDetailStatus(selectedComplaint.status || 'Open');
    setDetailAssignedToId(selectedComplaint.assignedToId || '');
    setDetailResolution(selectedComplaint.resolution || '');
  }, [selectedComplaint]);

  // Backend already filters; pass-through.
  const filtered = complaints;

  const counts = {
    All: stats.total || complaints.length,
    Open: stats.open || complaints.filter(c => c.status === 'Open').length,
    'In Progress': stats.in_progress || complaints.filter(c => c.status === 'In Progress').length,
    Resolved: stats.resolved || complaints.filter(c => c.status === 'Resolved').length,
  };

  // Hook up the Log Complaint modal submit.
  const handleSubmitLog = async () => {
    if (!form.name.trim() || !form.description.trim()) return;
    try {
      setIsSubmitting(true);
      await guestRecoveryService.create({
        guest_name: form.name.trim(),
        guest_phone: form.phone.trim(),
        category: CATEGORY_TO_API[form.category] || 'other',
        description: form.description.trim(),
        occurred_at: new Date().toISOString(),
      });
      setForm(EMPTY_FORM);
      setShowLogModal(false);
      await refresh();
    } catch (err) {
      console.error('Create complaint failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveComplaint = async () => {
    if (!selectedComplaint) return;
    const statusSlug = STATUS_TO_API[detailStatus] || 'open';
    try {
      setIsSubmitting(true);

      if (detailAssignedToId !== selectedComplaint.assignedToId) {
        if (detailAssignedToId) {
          await guestRecoveryService.assign(selectedComplaint.id, detailAssignedToId);
        } else {
          await guestRecoveryService.update(selectedComplaint.id, { assigned_to: null });
        }
      }

      if (detailStatus === 'Resolved') {
        await guestRecoveryService.resolve(selectedComplaint.id, detailResolution.trim());
      } else {
        await guestRecoveryService.update(selectedComplaint.id, {
          status: statusSlug,
          resolution: detailResolution.trim(),
        });
      }

      setSelectedComplaint(null);
      await refresh();
    } catch (err) {
      console.error('Save complaint failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gr-page">
      {/* Header */}
      <header className="gr-header">
        <div className="gr-header-inner">
          <div className="gr-header-left">
            <h1 className="gr-title">Guest Recovery</h1>
          </div>
          <div className="gr-header-actions">
            <div className="gr-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input
                className="gr-search"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="gr-add-btn" onClick={() => setShowLogModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log Complaint
            </button>
          </div>
        </div>
      </header>

      <main className="gr-main">
        {/* Stats Row */}
        <div className="gr-stats-row">
          <div className="gr-stat-card">
            <div className="gr-stat-num">{counts.All}</div>
            <div className="gr-stat-label">Total</div>
          </div>
          <div className="gr-stat-card open">
            <div className="gr-stat-num">{counts.Open}</div>
            <div className="gr-stat-label">Open</div>
          </div>
          <div className="gr-stat-card inprogress">
            <div className="gr-stat-num">{counts['In Progress']}</div>
            <div className="gr-stat-label">In Progress</div>
          </div>
          <div className="gr-stat-card resolved">
            <div className="gr-stat-num">{counts.Resolved}</div>
            <div className="gr-stat-label">Resolved</div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="gr-tabs">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`gr-tab ${activeStatus === s ? 'active' : ''}`}
              onClick={() => setActiveStatus(s)}
            >
              {s}
              <span className="gr-tab-count">{counts[s] ?? filtered.length}</span>
            </button>
          ))}
        </div>

        {/* Complaints List */}
        <div className="gr-list">
          {filtered.length === 0 ? (
            <div className="gr-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <p>No complaints found</p>
            </div>
          ) : filtered.map(complaint => (
            <div key={complaint.id} className="gr-card" onClick={() => setSelectedComplaint(complaint)}>
              <div className="gr-card-top">
                <div className="gr-card-left">
                  <div className="gr-card-name">{complaint.name}</div>
                  <div className="gr-card-meta">
                    <span>{complaint.date}</span>
                    <span className="gr-dot">·</span>
                    <span>{complaint.time}</span>
                    <span className="gr-dot">·</span>
                    <span>{complaint.phone}</span>
                  </div>
                </div>
                <div className="gr-card-right">
                  <span className="gr-category-badge">{complaint.category}</span>
                  <span
                    className="gr-status-badge"
                    style={{ background: STATUS_COLORS[complaint.status].bg, color: STATUS_COLORS[complaint.status].text }}
                  >
                    {complaint.status}
                  </span>
                </div>
              </div>
              <p className="gr-card-desc">{complaint.description}</p>
              {complaint.resolution && (
                <div className="gr-card-resolution">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{complaint.resolution}</span>
                </div>
              )}
              {complaint.assignedTo && (
                <div className="gr-card-assigned">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>{complaint.assignedTo}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Log Complaint Modal */}
      {showLogModal && (
        <div className="gr-overlay" onClick={() => setShowLogModal(false)}>
          <div className="gr-modal" onClick={e => e.stopPropagation()}>
            <div className="gr-modal-header">
              <div>
                <h2>Log Guest Complaint</h2>
                <p>Record a new guest complaint for follow-up</p>
              </div>
              <button className="gr-modal-close" onClick={() => setShowLogModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="gr-modal-body">
              <div className="gr-form-row">
                <div className="gr-form-group">
                  <label>Guest Name <span className="req">*</span></label>
                  <input className="gr-input" placeholder="Full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="gr-form-group">
                  <label>Phone Number</label>
                  <input className="gr-input" placeholder="(210) 555-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div className="gr-form-group">
                <label>Category <span className="req">*</span></label>
                <div className="gr-category-grid">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      className={`gr-cat-btn ${form.category === cat ? 'selected' : ''}`}
                      onClick={() => setForm({...form, category: cat})}
                    >{cat}</button>
                  ))}
                </div>
              </div>
              <div className="gr-form-group">
                <label>Description <span className="req">*</span></label>
                <textarea className="gr-textarea" rows={3} placeholder="Describe the guest's complaint in detail..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="gr-form-group">
                <label>Assign To</label>
                <input className="gr-input" placeholder="Team member name..." value={form.assignedTo} onChange={e => setForm({...form, assignedTo: e.target.value})} />
              </div>
            </div>
            <div className="gr-modal-footer">
              <button className="gr-btn-cancel" onClick={() => setShowLogModal(false)}>Cancel</button>
              <button className="gr-btn-submit" onClick={handleSubmitLog} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Log Complaint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="gr-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="gr-modal" onClick={e => e.stopPropagation()}>
            <div className="gr-modal-header">
              <div>
                <h2>{selectedComplaint.name}</h2>
                <p>{selectedComplaint.date} · {selectedComplaint.time}</p>
              </div>
              <button className="gr-modal-close" onClick={() => setSelectedComplaint(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="gr-modal-body">
              <div className="gr-detail-row">
                <span className="gr-detail-label">Category</span>
                <span className="gr-category-badge">{selectedComplaint.category}</span>
              </div>
              <div className="gr-detail-row">
                <span className="gr-detail-label">Status</span>
                <select
                  className="gr-input"
                  value={detailStatus}
                  onChange={(e) => setDetailStatus(e.target.value)}
                >
                  {STATUSES.filter((s) => s !== 'All').map((statusValue) => (
                    <option key={statusValue} value={statusValue}>{statusValue}</option>
                  ))}
                </select>
              </div>
              <div className="gr-detail-row">
                <span className="gr-detail-label">Phone</span>
                <span>{selectedComplaint.phone}</span>
              </div>
              <div className="gr-form-group" style={{ marginTop: 16 }}>
                <label>Assign To</label>
                <select
                  className="gr-input"
                  value={detailAssignedToId}
                  onChange={(e) => setDetailAssignedToId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div className="gr-form-group" style={{ marginTop: 16 }}>
                <label>Description</label>
                <p className="gr-detail-desc">{selectedComplaint.description}</p>
              </div>
              <div className="gr-form-group">
                <label>Resolution Notes</label>
                <textarea
                  className="gr-textarea"
                  rows={3}
                  value={detailResolution}
                  onChange={(e) => setDetailResolution(e.target.value)}
                  placeholder="Describe how this was resolved..."
                />
              </div>
            </div>
            <div className="gr-modal-footer">
              <button className="gr-btn-cancel" onClick={() => setSelectedComplaint(null)}>Close</button>
              <button className="gr-btn-submit" onClick={handleSaveComplaint} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestRecovery;
