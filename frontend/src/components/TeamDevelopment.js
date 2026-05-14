import React, { useMemo, useState, useEffect, useCallback } from 'react';
import leadershipService from '../services/leadership';
import './TeamDevelopment.css';

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
const IconUsers = (p) => (<Icon {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Icon>);
const IconUser = (p) => (<Icon {...p}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon>);
const IconClipboard = (p) => (<Icon {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Icon>);
const IconGift = (p) => (<Icon {...p}><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></Icon>);
const IconBuilding = (p) => (<Icon {...p}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></Icon>);
const IconCalendarDays = (p) => (<Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></Icon>);
const IconTarget = (p) => (<Icon {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></Icon>);
const IconSearch = (p) => (<Icon {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></Icon>);
const IconChevronDown = (p) => (<Icon {...p}><polyline points="6 9 12 15 18 9"/></Icon>);
const IconEdit = (p) => (<Icon {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Icon>);

const POSITIONS = [
  { id: 'all',         name: 'All Positions', Icon: IconUser,        color: '#111827' },
  { id: 'team-member', name: 'Team Member',   Icon: IconClipboard,   color: '#3B82F6' },
  { id: 'trainer',     name: 'Trainer',       Icon: IconGift,        color: '#22C55E' },
  { id: 'zone-leader', name: 'Zone Leader',   Icon: IconBuilding,    color: '#A855F7' },
  { id: 'shift-lead',  name: 'Shift Lead',    Icon: IconCalendarDays,color: '#F59E0B' },
];

const formatToday = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const TeamDevelopment = ({ user }) => {
  const [active, setActive] = useState('all');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('my-team');
  const [members, setMembers] = useState([]);
  const [tracks, setTracks] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const [progressRes, tracksRes] = await Promise.all([
        leadershipService.listProgress({
          scope,
          position: active !== 'all' ? active : undefined,
        }),
        leadershipService.listTracks(),
      ]);
      const rows = progressRes.results || progressRes || [];
      const trackRows = tracksRes.results || tracksRes || [];
      setTracks(trackRows);
      setMembers(rows.map((r) => ({
        id: r.id,
        name: r.user_name || 'Unknown',
        initials: r.user_initials || '??',
        position: r.track_slug || 'team-member',
        positionLabel: r.track_name || 'Team Member',
        status: r.status,
        statusLabel: (r.status || 'not_started').replace(/_/g, ' '),
        currentStep: r.current_step || 0,
        completedSteps: r.completed_steps || 0,
      })));
    } catch (err) {
      console.error('Failed to load team development:', err);
    }
  }, [scope, active]);

  useEffect(() => { refresh(); }, [refresh]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (active !== 'all' && m.position !== active) return false;
      return !q || m.name.toLowerCase().includes(q);
    });
  }, [members, active, query]);

  const countsByPos = useMemo(() => {
    const totals = { all: members.length };
    POSITIONS.filter(p => p.id !== 'all').forEach(p => { totals[p.id] = 0; });
    members.forEach(m => { totals[m.position] = (totals[m.position] || 0) + 1; });
    return totals;
  }, [members]);

  const displayName = user?.firstName || user?.name || 'Demo User';

  const handleEditTracks = async () => {
    const action = window.prompt('Type create, rename, or delete', 'create');
    if (!action) return;
    const choice = action.trim().toLowerCase();

    try {
      if (choice === 'create') {
        const name = window.prompt('Track name');
        if (!name?.trim()) return;
        const description = window.prompt('Track description', '') || '';
        await leadershipService.createTrack({
          name: name.trim(),
          description,
          order: tracks.length,
        });
        await refresh();
        return;
      }

      const suggested = tracks.find((track) => track.slug === active)?.name || tracks[0]?.name || '';
      const trackName = window.prompt(
        `Which track?\n${tracks.map((track) => track.name).join('\n')}`,
        suggested
      );
      if (!trackName?.trim()) return;
      const target = tracks.find(
        (track) => track.name.toLowerCase() === trackName.trim().toLowerCase()
      );
      if (!target) return;

      if (choice === 'delete') {
        const confirmed = window.confirm(`Delete "${target.name}"?`);
        if (!confirmed) return;
        await leadershipService.deleteTrack(target.id);
        await refresh();
        return;
      }

      if (choice !== 'rename') return;
      const name = window.prompt('Updated track name', target.name);
      if (!name?.trim()) return;
      const description = window.prompt('Updated description', target.description || '') || '';
      await leadershipService.updateTrack(target.id, {
        name: name.trim(),
        description,
      });
      await refresh();
    } catch (err) {
      console.error('Failed to manage development tracks:', err);
    }
  };

  return (
    <div className="tdev-page">
      {/* Hero */}
      <section className="tdev-hero">
        <div className="tdev-hero-glow" />
        <div className="tdev-hero-inner">
          <div className="tdev-hero-top">
            <div className="tdev-hero-lead">
              <div className="tdev-hero-row">
                <span className="tdev-hero-sun" aria-hidden>☀️</span>
                <div>
                  <h1 className="tdev-hero-greeting">
                    Good morning, <span>{displayName}!</span>
                  </h1>
                  <p className="tdev-hero-date">{formatToday()}</p>
                </div>
              </div>
              <div className="tdev-hero-tag">
                <span className="tdev-hero-divider" />
                <p>Empowering your team&rsquo;s growth journey</p>
              </div>
            </div>
            <button className="tdev-hero-btn" type="button" onClick={handleEditTracks}>
              <IconEdit size={16} />
              <span>Edit Tracks</span>
            </button>
          </div>
        </div>
      </section>

      {/* Career Journey Section */}
      <section className="tdev-card">
        <div className="tdev-card-head">
          <div className="tdev-card-title">
            <span className="tdev-card-title-icon"><IconTarget size={18} /></span>
            <h2>Career Journey</h2>
          </div>
          <div className="tdev-scope">
            <button
              className="tdev-scope-btn"
              type="button"
              onClick={() => setScope((s) => (s === 'my-team' ? 'all' : 'my-team'))}
            >
              <span>{scope === 'my-team' ? 'My Team' : 'All Teams'}</span>
              <IconChevronDown size={16} />
            </button>
          </div>
        </div>

        <div className="tdev-positions">
          {POSITIONS.map((p) => {
            const isActive = active === p.id;
            return (
              <button
                key={p.id}
                className={`tdev-pos ${isActive ? 'is-active' : ''}`}
                onClick={() => setActive(p.id)}
                style={isActive ? { '--pos-color': p.color } : {}}
              >
                <span
                  className="tdev-pos-icon"
                  style={{
                    background: isActive && p.id === 'all' ? 'rgba(255,255,255,0.2)'
                              : isActive ? 'rgba(255,255,255,0.2)'
                              : p.id === 'all' ? '#F3F4F6'
                              : `${p.color}1A`,
                    color: isActive ? '#fff' : (p.id === 'all' ? '#6B7280' : p.color),
                  }}
                >
                  <p.Icon size={18} />
                </span>
                <span className="tdev-pos-name">{p.name}</span>
                <span className="tdev-pos-count">{countsByPos[p.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Team Members Section */}
      <section className="tdev-card">
        <div className="tdev-card-head">
          <div className="tdev-card-title">
            <span className="tdev-title-bar" />
            <h2>Team Members</h2>
          </div>
        </div>

        <div className="tdev-toolbar">
          <label className="tdev-search">
            <span className="tdev-search-icon"><IconSearch size={18} /></span>
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button className="tdev-filter-btn" type="button">
            <IconUsers size={16} />
            <span>{POSITIONS.find((p) => p.id === active)?.name ?? 'All Positions'}</span>
            <IconChevronDown size={14} />
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="tdev-empty">
            <div className="tdev-empty-icon"><IconUsers size={40} stroke={1.5} /></div>
            <h3>No team members found</h3>
            <p>Get started by adding team members to track their growth</p>
          </div>
        ) : (
          <div className="tdev-members">
            {filtered.map((m) => (
              <div key={m.id} className="tdev-member">
                <span className="tdev-avatar">{m.initials}</span>
                <div className="tdev-member-body">
                  <h4>{m.name}</h4>
                  <p>{m.positionLabel}</p>
                  <p>{m.statusLabel} · {m.completedSteps} complete</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default TeamDevelopment;
