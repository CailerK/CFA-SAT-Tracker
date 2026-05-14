import React, { useState, useEffect } from 'react';
import './LeadershipDevelopment.css';
import leadershipService from '../services/leadership';

const LeadershipDevelopment = ({ user, onNavigate }) => {
  // Track which area_keys the current user has selected (persisted on backend).
  const [selectedAreaIds, setSelectedAreaIds] = useState(new Set());
  // Map area_key → backend record id so we can DELETE on toggle off.
  const [areaRecordIds, setAreaRecordIds] = useState({});
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [areaRes, noteRes] = await Promise.all([
          leadershipService.listAreas(),
          leadershipService.listNotes(),
        ]);
        if (cancelled) return;
        const areaRows = areaRes.results || areaRes || [];
        setSelectedAreaIds(new Set(areaRows.map((a) => a.area_key)));
        const map = {};
        for (const a of areaRows) map[a.area_key] = a.id;
        setAreaRecordIds(map);
        setNotes(noteRes.results || noteRes || []);
      } catch (err) {
        console.error('Failed to load leadership areas:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleArea = async (areaKey) => {
    const isSelected = selectedAreaIds.has(areaKey);
    // Optimistic update.
    setSelectedAreaIds((prev) => {
      const next = new Set(prev);
      if (isSelected) next.delete(areaKey);
      else next.add(areaKey);
      return next;
    });
    try {
      if (isSelected) {
        const id = areaRecordIds[areaKey];
        if (id) await leadershipService.deleteArea(id);
        setAreaRecordIds((m) => { const c = { ...m }; delete c[areaKey]; return c; });
      } else {
        const created = await leadershipService.createArea({ area_key: areaKey });
        if (created?.id) {
          setAreaRecordIds((m) => ({ ...m, [areaKey]: created.id }));
        }
      }
    } catch (err) {
      console.error('Toggle area failed:', err);
      // Roll back.
      setSelectedAreaIds((prev) => {
        const next = new Set(prev);
        if (isSelected) next.add(areaKey);
        else next.delete(areaKey);
        return next;
      });
    }
  };

  const saveNote = async () => {
    if (!noteText.trim()) return;
    try {
      const created = await leadershipService.createNote({ text: noteText.trim() });
      setNotes((n) => [created, ...n]);
      setNoteText('');
    } catch (err) {
      console.error('Save note failed:', err);
    }
  };

  const areas = [
    { id: 'kitchen', name: 'Kitchen', icon: '🍳' },
    { id: 'drive-thru', name: 'Drive Thru', icon: '🚗' },
    { id: 'front-counter', name: 'Front Counter', icon: '👤' },
    { id: 'food-safety', name: 'Food Safety', icon: '🛡️' },
    { id: 'hospitality', name: 'Hospitality', icon: '❤️' },
    { id: 'talent', name: 'Talent', icon: '🎓' },
    { id: 'ops-director', name: 'Ops Director', icon: '📊' },
    { id: 'catering', name: 'Catering', icon: '🎉' },
    { id: 'facilities', name: 'Facilities', icon: '🏢' },
    { id: 'inventory', name: 'Inventory', icon: '📦' },
    { id: 'marketing', name: 'Marketing', icon: '📣' },
    { id: 'custom-area', name: 'Custom Area', icon: '✏️' }
  ];

  return (
    <div className="leadership-development-page">
      {/* Header */}
      <div className="leadership-header">
        <div className="header-greeting">
          <h1>Hey, {user?.firstName?.toLowerCase() || 'demo'}</h1>
          <p>Monday, Apr 20</p>
        </div>
        <button className="btn-settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>

      {/* Add an Area Section */}
      <div className="area-section">
        <h2>Add an Area</h2>
        <p>What part of the business do you own?</p>
        <div className="areas-grid">
          {areas.map(area => {
            const isSelected = selectedAreaIds.has(area.id);
            return (
              <button
                key={area.id}
                className={`area-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleArea(area.id)}
                style={isSelected ? { borderColor: '#E51636', background: '#fff5f6' } : {}}
              >
                <span className="area-icon">{area.icon}</span>
                <span className="area-name">{area.name}</span>
                {isSelected && <span style={{ color: '#E51636', marginLeft: 6 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Development Card */}
      <div className="development-card" onClick={() => onNavigate && onNavigate('leadership-360')}>
        <div className="development-icon">🎯</div>
        <div className="development-info">
          <h3>Development</h3>
          <p>The Heart of Leadership</p>
          <div className="progress-row">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '0%' }} />
            </div>
            <span className="progress-text">0%</span>
          </div>
        </div>
        <svg className="chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </div>

      {/* Notes Section */}
      <div className="notes-section">
        <div className="notes-header">
          <h3>Notes</h3>
          <button className="btn-see-all">
            See all <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </button>
        </div>
        <div className="note-input">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          <input
            type="text"
            placeholder="Jot a quick note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveNote();
              }
            }}
          />
          <button type="button" className="btn-see-all" onClick={saveNote}>
            Save
          </button>
        </div>
        {notes.length > 0 && (
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            {notes.slice(0, 5).map((note) => (
              <div
                key={note.id}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: '#fff',
                  border: '1px solid #f1f5f9',
                  color: '#334155',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {note.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadershipDevelopment;
