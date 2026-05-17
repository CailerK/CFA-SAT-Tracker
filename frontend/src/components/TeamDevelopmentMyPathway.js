import React, { useState, useEffect, useCallback } from 'react';
import leadershipService from '../services/leadership';
import './TeamDevelopmentEditTracks.css';   // reuse path/card styles
import './TeamDevelopmentMyPathway.css';

/* ===== Inline icons (Lucide-style; never import from lucide-react) ===== */
const Icon = ({ size = 18, stroke = 2, children, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    {...rest}
  >{children}</svg>
);
const IconArrowLeft = (p) => (<Icon {...p}><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></Icon>);
const IconChevronRight = (p) => (<Icon {...p}><polyline points="9 18 15 12 9 6"/></Icon>);
const IconLockSlash = (p) => (<Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><line x1="3" y1="3" x2="21" y2="21"/></Icon>);
const IconCheck = (p) => (<Icon {...p}><polyline points="20 6 9 17 4 12"/></Icon>);

// Card icons (must mirror EditTracks).
const IconMapPin = (p) => (<Icon {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></Icon>);
const IconGradCap = (p) => (<Icon {...p}><path d="M22 10v6"/><path d="M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Icon>);
const IconTarget = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>);
const IconAward = (p) => (<Icon {...p}><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></Icon>);
const IconBriefcase = (p) => (<Icon {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></Icon>);
const IconUsers = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
const IconCrown = (p) => (<Icon {...p}><path d="M2 6l4 4 4-6 4 6 4-4 2 14H4z"/></Icon>);
const IconStar = (p) => (<Icon {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></Icon>);

const ICON_MAP = {
  'map-pin':         IconMapPin,
  'graduation-cap':  IconGradCap,
  'target':          IconTarget,
  'award':           IconAward,
  'briefcase':       IconBriefcase,
  'users':           IconUsers,
  'crown':           IconCrown,
  'star':            IconStar,
};

const COLOR_MAP = {
  red:     '#E51636',
  slate:   '#475569',
  blue:    '#1d4ed8',
  emerald: '#059669',
  amber:   '#d97706',
  violet:  '#7c3aed',
};

const TeamDevelopmentMyPathway = ({ user, onBack, onNavigate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const body = await leadershipService.myPathway();
      setData(body);
    } catch (err) {
      console.error('Failed to load my pathway:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const tracks = data?.tracks || [];
  const progress = data?.progress || [];
  const currentId = data?.current_track_id;
  const hidden = data?.hidden_by_admin;

  // Map track id → progress row.
  const progressByTrack = progress.reduce((acc, p) => {
    acc[p.track] = p;
    return acc;
  }, {});

  // What status does each track have for THIS user?
  // "completed" | "current" | "in_progress" | "locked"
  const statusFor = (track) => {
    const p = progressByTrack[track.id];
    if (p?.status === 'completed') return 'completed';
    if (track.id === currentId) return 'current';
    if (p?.status === 'in_progress') return 'in_progress';
    return 'locked';
  };

  const displayName = user?.firstName || user?.name || 'Demo User';

  return (
    <div className="ttx-page mp-page">
      <div className="ttx-container">

        <header className="ttx-topbar">
          <button
            type="button"
            className="ttx-back"
            onClick={() => {
              if (onBack) onBack();
              else if (onNavigate) onNavigate('team-development');
            }}
          >
            <IconArrowLeft size={16} />
            <span>Back to Team Development</span>
          </button>
        </header>

        {/* Hero */}
        <section className="mp-hero">
          <div className="mp-hero-inner">
            <p className="mp-hero-eyebrow">My Pathway</p>
            <h1 className="mp-hero-title">{displayName}&rsquo;s career journey</h1>
            <p className="mp-hero-sub">
              Track every step from where you started to where you&rsquo;re heading next.
            </p>
          </div>
        </section>

        {/* Hidden banner */}
        {hidden && (
          <div className="mp-hidden">
            <span className="mp-hidden-icon" aria-hidden="true">
              <IconLockSlash size={16} />
            </span>
            <div>
              <p className="mp-hidden-title">Career Path is currently hidden</p>
              <p className="mp-hidden-sub">
                Your store admins have turned off path visibility. Reach out to a
                manager or admin to learn about your development opportunities.
              </p>
            </div>
          </div>
        )}

        {/* Career Path */}
        {!hidden && (
          <section className="ttx-section ttx-path-section">
            <div className="ttx-path-head">
              <h2 className="ttx-path-title">The Chick-fil-A Career Path</h2>
              <p className="ttx-path-sub">Every team member has the opportunity to grow and lead</p>
            </div>

            {loading ? (
              <div className="ttx-loading">Loading your pathway…</div>
            ) : tracks.length === 0 ? (
              <div className="ttx-loading">
                Your store hasn&rsquo;t set up a career path yet.
              </div>
            ) : (
              <div className="ttx-path-grid">
                {tracks.map((t, i) => (
                  <React.Fragment key={t.id}>
                    <PathwayCard
                      track={t}
                      index={i}
                      status={statusFor(t)}
                    />
                    {i < tracks.length - 1 && (
                      <div className="ttx-path-arrow" aria-hidden="true">
                        <IconChevronRight size={20} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Progress summary */}
        {!hidden && tracks.length > 0 && (
          <section className="mp-summary">
            <SummaryStat
              label="Roles in path"
              value={tracks.length}
            />
            <SummaryStat
              label="Roles completed"
              value={progress.filter((p) => p.status === 'completed').length}
            />
            <SummaryStat
              label="Currently in progress"
              value={progress.filter((p) => p.status === 'in_progress').length}
            />
          </section>
        )}
      </div>
    </div>
  );
};

const PathwayCard = ({ track, index, status }) => {
  const IconCmp = ICON_MAP[track.icon_key] || IconMapPin;
  const colorBg = COLOR_MAP[track.color_key] || '#E51636';

  // "locked" tracks are de-saturated; "current" gets a focus ring;
  // "completed" gets a check overlay.
  const cardStyle = status === 'locked'
    ? { background: '#cbd5e1' }
    : { background: colorBg };

  return (
    <div className={`ttx-card-wrap mp-card-wrap mp-status-${status}`}>
      <div className="ttx-card mp-card" style={cardStyle}>
        <span className="ttx-card-num" aria-hidden="true">{index + 1}</span>
        <span className="mp-card-icon" aria-hidden="true">
          <IconCmp size={26} />
        </span>
        {status === 'completed' && (
          <span className="mp-card-check" aria-label="Completed">
            <IconCheck size={14} stroke={3} />
          </span>
        )}
        {status === 'current' && (
          <span className="mp-card-pulse" aria-hidden="true" />
        )}
      </div>
      <p className="mp-card-name">{track.display_name || track.name}</p>
      {track.step_label && <p className="ttx-card-step">{track.step_label}</p>}
    </div>
  );
};

const SummaryStat = ({ label, value }) => (
  <div className="mp-stat">
    <p className="mp-stat-value">{value}</p>
    <p className="mp-stat-label">{label}</p>
  </div>
);

export default TeamDevelopmentMyPathway;
