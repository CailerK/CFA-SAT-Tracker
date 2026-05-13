import React, { useState } from 'react';
import './Vendors.css';

const CATEGORIES = ['All', 'Food & Beverage', 'Supplies', 'Equipment', 'Cleaning', 'Uniforms', 'Marketing', 'Other'];

const SAMPLE_VENDORS = [
  {
    id: 1, name: 'McLane Company', category: 'Food & Beverage',
    contact: 'David Torres', phone: '(210) 555-0142', email: 'dtorres@mclane.com',
    website: 'mclane.com', accountNumber: 'MC-48821', notes: 'Primary food distributor. Deliveries Tuesday & Friday.',
    tags: ['Primary', 'Weekly Delivery']
  },
  {
    id: 2, name: 'Ecolab', category: 'Cleaning',
    contact: 'Sandra Kim', phone: '(210) 555-0387', email: 'skim@ecolab.com',
    website: 'ecolab.com', accountNumber: 'ECO-7723', notes: 'Sanitizer and cleaning chemical supplier.',
    tags: ['Auto-Ship']
  },
  {
    id: 3, name: 'Cintas', category: 'Uniforms',
    contact: 'Mike Patel', phone: '(210) 555-0561', email: 'mpatel@cintas.com',
    website: 'cintas.com', accountNumber: 'CIN-3310', notes: 'Uniform supplier and laundry service. Monthly billing.',
    tags: ['Monthly Billing']
  },
  {
    id: 4, name: 'Hobart Service', category: 'Equipment',
    contact: 'Rachel Moore', phone: '(210) 555-0299', email: 'rmoore@hobartservice.com',
    website: 'hobartservice.com', accountNumber: 'HB-9912', notes: 'Equipment maintenance and repair.',
    tags: ['On-Call']
  },
  {
    id: 5, name: 'Sysco Corporation', category: 'Food & Beverage',
    contact: 'James Fletcher', phone: '(210) 555-0478', email: 'jfletcher@sysco.com',
    website: 'sysco.com', accountNumber: 'SYS-22104', notes: 'Secondary food supplier for specialty items.',
    tags: ['Backup Supplier']
  },
  {
    id: 6, name: 'Veritiv', category: 'Supplies',
    contact: 'Anna Brooks', phone: '(210) 555-0631', email: 'abrooks@veritiv.com',
    website: 'veritiv.com', accountNumber: 'VRT-5544', notes: 'Packaging, bags, and paper goods.',
    tags: ['Monthly Order']
  },
];

const CATEGORY_COLORS = {
  'Food & Beverage': { bg: '#d1fae5', text: '#065f46' },
  'Supplies':        { bg: '#dbeafe', text: '#1e40af' },
  'Equipment':       { bg: '#fef3c7', text: '#92400e' },
  'Cleaning':        { bg: '#ede9fe', text: '#5b21b6' },
  'Uniforms':        { bg: '#fce7f3', text: '#9d174d' },
  'Marketing':       { bg: '#fee2e2', text: '#991b1b' },
  'Other':           { bg: '#f3f4f6', text: '#374151' },
};

const initForm = { name: '', category: '', contact: '', phone: '', email: '', website: '', accountNumber: '', notes: '' };

const Vendors = ({ onBack }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery]       = useState('');
  const [showAddModal, setShowAddModal]     = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [form, setForm]                     = useState(initForm);

  const filtered = SAMPLE_VENDORS.filter(v => {
    const matchesCat    = activeCategory === 'All' || v.category === activeCategory;
    const matchesSearch = !searchQuery ||
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const countFor = (cat) => cat === 'All'
    ? SAMPLE_VENDORS.length
    : SAMPLE_VENDORS.filter(v => v.category === cat).length;

  const avatar = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="vnd-page">

      {/* ── Header ── */}
      <header className="vnd-header">
        <div className="vnd-header-inner">
          <h1 className="vnd-title">Vendors</h1>
          <div className="vnd-header-actions">
            <div className="vnd-search-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="vnd-search"
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="vnd-add-btn" onClick={() => setShowAddModal(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Vendor
            </button>
          </div>
        </div>
      </header>

      <main className="vnd-main">

        {/* ── Stats ── */}
        <div className="vnd-stats-row">
          <div className="vnd-stat">
            <div className="vnd-stat-num">{SAMPLE_VENDORS.length}</div>
            <div className="vnd-stat-lbl">Total Vendors</div>
          </div>
          {['Food & Beverage', 'Equipment', 'Supplies', 'Cleaning'].map(cat => (
            <div key={cat} className="vnd-stat">
              <div className="vnd-stat-num">{countFor(cat)}</div>
              <div className="vnd-stat-lbl">{cat}</div>
            </div>
          ))}
        </div>

        {/* ── Category Filter ── */}
        <div className="vnd-cats">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`vnd-cat-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
              {countFor(cat) > 0 && <span className="vnd-cat-count">{countFor(cat)}</span>}
            </button>
          ))}
        </div>

        {/* ── Vendor Grid ── */}
        <div className="vnd-grid">
          {filtered.length === 0 ? (
            <div className="vnd-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <p>No vendors found</p>
            </div>
          ) : filtered.map(v => (
            <div key={v.id} className="vnd-card" onClick={() => setSelectedVendor(v)}>
              <div className="vnd-card-top">
                <div className="vnd-avatar">{avatar(v.name)}</div>
                <div className="vnd-card-info">
                  <div className="vnd-card-name">{v.name}</div>
                  <span
                    className="vnd-cat-badge"
                    style={{ background: CATEGORY_COLORS[v.category]?.bg, color: CATEGORY_COLORS[v.category]?.text }}
                  >{v.category}</span>
                </div>
              </div>

              <div className="vnd-card-details">
                <div className="vnd-detail-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  <span>{v.contact}</span>
                </div>
                <div className="vnd-detail-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.38 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <span>{v.phone}</span>
                </div>
                <div className="vnd-detail-row">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span>{v.email}</span>
                </div>
                {v.accountNumber && (
                  <div className="vnd-detail-row">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h0M2 9.5h20"/>
                    </svg>
                    <span>Acct: {v.accountNumber}</span>
                  </div>
                )}
              </div>

              {v.notes && <p className="vnd-card-notes">{v.notes}</p>}

              {v.tags?.length > 0 && (
                <div className="vnd-tags">
                  {v.tags.map(tag => (
                    <span key={tag} className="vnd-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* ── Add Vendor Modal ── */}
      {showAddModal && (
        <div className="vnd-overlay" onClick={() => setShowAddModal(false)}>
          <div className="vnd-modal" onClick={e => e.stopPropagation()}>
            <div className="vnd-modal-header">
              <div>
                <h2>Add Vendor</h2>
                <p>Add a new vendor to your directory</p>
              </div>
              <button className="vnd-modal-close" onClick={() => setShowAddModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="vnd-modal-body">
              <div className="vnd-form-row">
                <div className="vnd-form-group">
                  <label>Vendor Name <span className="req">*</span></label>
                  <input className="vnd-input" placeholder="e.g. McLane Company" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="vnd-form-group">
                  <label>Category <span className="req">*</span></label>
                  <select className="vnd-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">Select category...</option>
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="vnd-form-row">
                <div className="vnd-form-group">
                  <label>Contact Name</label>
                  <input className="vnd-input" placeholder="Primary contact" value={form.contact} onChange={e => setForm({...form, contact: e.target.value})} />
                </div>
                <div className="vnd-form-group">
                  <label>Phone</label>
                  <input className="vnd-input" placeholder="(210) 555-0000" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div className="vnd-form-row">
                <div className="vnd-form-group">
                  <label>Email</label>
                  <input className="vnd-input" placeholder="contact@vendor.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div className="vnd-form-group">
                  <label>Website</label>
                  <input className="vnd-input" placeholder="vendor.com" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
                </div>
              </div>
              <div className="vnd-form-group">
                <label>Account Number</label>
                <input className="vnd-input" placeholder="e.g. MC-48821" value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} />
              </div>
              <div className="vnd-form-group">
                <label>Notes</label>
                <textarea className="vnd-textarea" rows={3} placeholder="Delivery schedule, billing cycle, special instructions..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
            </div>
            <div className="vnd-modal-footer">
              <button className="vnd-btn-cancel" onClick={() => { setShowAddModal(false); setForm(initForm); }}>Cancel</button>
              <button className="vnd-btn-submit" onClick={() => { setShowAddModal(false); setForm(initForm); }}>Add Vendor</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Vendor Detail Modal ── */}
      {selectedVendor && (
        <div className="vnd-overlay" onClick={() => setSelectedVendor(null)}>
          <div className="vnd-modal vnd-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="vnd-modal-header">
              <div className="vnd-detail-header-left">
                <div className="vnd-avatar vnd-avatar-lg">{avatar(selectedVendor.name)}</div>
                <div>
                  <h2>{selectedVendor.name}</h2>
                  <span
                    className="vnd-cat-badge"
                    style={{ background: CATEGORY_COLORS[selectedVendor.category]?.bg, color: CATEGORY_COLORS[selectedVendor.category]?.text }}
                  >{selectedVendor.category}</span>
                </div>
              </div>
              <button className="vnd-modal-close" onClick={() => setSelectedVendor(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="vnd-modal-body">
              <div className="vnd-detail-grid">
                {[
                  { label: 'Contact', value: selectedVendor.contact },
                  { label: 'Phone',   value: selectedVendor.phone },
                  { label: 'Email',   value: selectedVendor.email },
                  { label: 'Website', value: selectedVendor.website },
                  { label: 'Account #', value: selectedVendor.accountNumber },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="vnd-detail-row-modal">
                    <span className="vnd-detail-label">{row.label}</span>
                    <span className="vnd-detail-value">{row.value}</span>
                  </div>
                ))}
              </div>
              {selectedVendor.notes && (
                <div className="vnd-form-group" style={{ marginTop: 16 }}>
                  <label>Notes</label>
                  <p className="vnd-detail-notes">{selectedVendor.notes}</p>
                </div>
              )}
              {selectedVendor.tags?.length > 0 && (
                <div className="vnd-tags" style={{ marginTop: 12 }}>
                  {selectedVendor.tags.map(tag => <span key={tag} className="vnd-tag">{tag}</span>)}
                </div>
              )}
            </div>
            <div className="vnd-modal-footer">
              <button className="vnd-btn-cancel" onClick={() => setSelectedVendor(null)}>Close</button>
              <button className="vnd-btn-submit">Edit Vendor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
