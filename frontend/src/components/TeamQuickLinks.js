import React, { useState, useEffect } from 'react';
import teamService from '../services/team';
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

const TeamQuickLinks = ({ user }) => {
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await teamService.listQuickLinks();
        const rows = res.results || res || [];
        if (!cancelled) setLinks(rows);
      } catch (err) {
        console.error('Failed to load quick links:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const displayName = user?.firstName || user?.name || 'Demo User';

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

            <div className="tql-hero-actions">
              <button className="tql-btn tql-btn--ghost" type="button">
                <IconSettings size={16} />
                <span className="tql-btn-lg">Manage Categories</span>
                <span className="tql-btn-sm">Categories</span>
              </button>
              <button className="tql-btn tql-btn--primary" type="button">
                <IconPlus size={16} />
                <span>Add Quick Link</span>
              </button>
            </div>
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
              Add your most-used links here for quick access
            </p>
            <button className="tql-empty-cta" type="button">
              <IconPlus size={16} />
              <span>Add Your First Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Populated list view */}
      {links.length > 0 && (
        <div className="tql-list" style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 16px',
                border: `2px solid ${l.category_color || '#e5e7eb'}`,
                borderRadius: 12,
                background: '#fff',
                textDecoration: 'none',
                color: '#111827',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: 22 }}>{l.icon || '🔗'}</span>
              <div style={{ flex: 1 }}>
                <div>{l.label}</div>
                {l.category_name && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{l.category_name}</div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamQuickLinks;
