import React, { useState } from 'react';
import './GuestRecovery.css';

const CATEGORIES = ['Order Error', 'Service Issue', 'Food Quality', 'Wait Time', 'Cleanliness', 'Staff Behavior', 'App/Rewards', 'Other'];
const STATUSES = ['All', 'Open', 'In Progress', 'Resolved'];

const SAMPLE_COMPLAINTS = [
  { id: 1, name: 'James Henderson', phone: '(210) 555-0182', date: 'May 13, 2024', time: '11:42 AM', category: 'Order Error', description: 'Wrong sandwich received – asked for no pickles, got extra.', status: 'Resolved', resolution: 'Offered free combo on next visit.', assignedTo: 'Ruby Boswell' },
  { id: 2, name: 'Patricia Nguyen', phone: '(210) 555-0341', date: 'May 13, 2024', time: '1:05 PM', category: 'Wait Time', description: 'Drive-thru wait exceeded 15 minutes during lunch rush.', status: 'In Progress', resolution: '', assignedTo: 'Maria Samano' },
  { id: 3, name: 'Carlos Rivera', phone: '(210) 555-0290', date: 'May 12, 2024', time: '3:22 PM', category: 'Food Quality', description: 'Nuggets were cold and appeared to have been sitting.', status: 'Open', resolution: '', assignedTo: null },
  { id: 4, name: 'Angela Simmons', phone: '(210) 555-0114', date: 'May 12, 2024', time: '6:48 PM', category: 'Staff Behavior', description: 'Team member was dismissive at register.', status: 'Open', resolution: '', assignedTo: null },
  { id: 5, name: 'Brian Kowalski', phone: '(210) 555-0477', date: 'May 11, 2024', time: '9:14 AM', category: 'Cleanliness', description: 'Restroom was unclean during morning visit.', status: 'Resolved', resolution: 'Apologized and issued $5 gift card.', assignedTo: 'Hannah Pess' },
];

const STATUS_COLORS = {
  'Open':        { bg: '#fee2e2', text: '#b91c1c' },
  'In Progress': { bg: '#fef3c7', text: '#b45309' },
  'Resolved':    { bg: '#d1fae5', text: '#065f46' },
};

const GuestRecovery = ({ onBack }) => {
  const [activeStatus, setActiveStatus] = useState('All');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', category: '', description: '', assignedTo: '' });

  const filtered = SAMPLE_COMPLAINTS.filter(c => {
    const matchesStatus = activeStatus === 'All' || c.status === activeStatus;
    const matchesSearch = !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const counts = {
    All: SAMPLE_COMPLAINTS.length,
    Open: SAMPLE_COMPLAINTS.filter(c => c.status === 'Open').length,
    'In Progress': SAMPLE_COMPLAINTS.filter(c => c.status === 'In Progress').length,
    Resolved: SAMPLE_COMPLAINTS.filter(c => c.status === 'Resolved').length,
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
              <button className="gr-btn-submit" onClick={() => setShowLogModal(false)}>Log Complaint</button>
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
                <span className="gr-status-badge" style={{ background: STATUS_COLORS[selectedComplaint.status].bg, color: STATUS_COLORS[selectedComplaint.status].text }}>{selectedComplaint.status}</span>
              </div>
              <div className="gr-detail-row">
                <span className="gr-detail-label">Phone</span>
                <span>{selectedComplaint.phone}</span>
              </div>
              {selectedComplaint.assignedTo && (
                <div className="gr-detail-row">
                  <span className="gr-detail-label">Assigned To</span>
                  <span>{selectedComplaint.assignedTo}</span>
                </div>
              )}
              <div className="gr-form-group" style={{ marginTop: 16 }}>
                <label>Description</label>
                <p className="gr-detail-desc">{selectedComplaint.description}</p>
              </div>
              <div className="gr-form-group">
                <label>Resolution Notes</label>
                <textarea className="gr-textarea" rows={3} defaultValue={selectedComplaint.resolution} placeholder="Describe how this was resolved..." />
              </div>
            </div>
            <div className="gr-modal-footer">
              <button className="gr-btn-cancel" onClick={() => setSelectedComplaint(null)}>Close</button>
              <button className="gr-btn-submit" onClick={() => setSelectedComplaint(null)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestRecovery;
