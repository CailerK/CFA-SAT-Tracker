# Card patterns — annotated

Every reusable card layout the app uses, with exact CSS.

## 1. Browse Plans card (the "library grid" pattern from the screenshot)

```jsx
<a className="cfa-card cfa-card--violet" href="...">
  <div className="cfa-card-head">
    <div className="cfa-card-tile">{/* 20px icon */}</div>
    <div>
      <h3 className="cfa-card-title">The Heart of Leadership</h3>
      <p className="cfa-card-sub">All Levels</p>
    </div>
    {locked && <span className="cfa-card-lock">{/* lock icon */}</span>}
  </div>
  <p className="cfa-card-body">
    Build a foundation of character-based leadership focused on serving others first…
  </p>
  <button className="cfa-card-cta">
    {started ? 'Continue →' : 'Start Plan'}
  </button>
</a>
```

```css
/* ---- Grid ---- */
.cfa-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* ---- Card ---- */
.cfa-card {
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.cfa-card:hover {
  border-color: #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
.cfa-card[aria-disabled="true"] { opacity: 0.6; pointer-events: none; }

/* ---- Head row (tile + title) ---- */
.cfa-card-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  position: relative;
}
.cfa-card-tile {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.cfa-card-lock {
  position: absolute;
  top: 0;
  right: 0;
  color: #9ca3af;
}
.cfa-card-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 2px;
}
.cfa-card-sub {
  font-size: 13px;
  color: #6b7280;
  margin: 0;
}

/* ---- Body ---- */
.cfa-card-body {
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- CTA ---- */
.cfa-card-cta {
  appearance: none;
  border: 0;
  font-size: 14px;
  font-weight: 600;
  padding: 10px 0;
  border-radius: 8px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease;
}

/* ---- Pastel variants ---- */
.cfa-card--red     .cfa-card-tile { background: #fff1f2; color: #E51636; }
.cfa-card--red     .cfa-card-cta  { background: #fff1f2; color: #E51636; }
.cfa-card--red     .cfa-card-cta:hover { background: #ffe4e6; }

.cfa-card--violet  .cfa-card-tile { background: #f5f3ff; color: #9333ea; }
.cfa-card--violet  .cfa-card-cta  { background: #f5f3ff; color: #7c3aed; }
.cfa-card--violet  .cfa-card-cta:hover { background: #ede9fe; }

.cfa-card--blue    .cfa-card-tile { background: #eff6ff; color: #1e40af; }
.cfa-card--blue    .cfa-card-cta  { background: #eff6ff; color: #1e40af; }
.cfa-card--blue    .cfa-card-cta:hover { background: #dbeafe; }

.cfa-card--emerald .cfa-card-tile { background: #ecfdf5; color: #047857; }
.cfa-card--emerald .cfa-card-cta  { background: #ecfdf5; color: #047857; }
.cfa-card--emerald .cfa-card-cta:hover { background: #d1fae5; }

.cfa-card--amber   .cfa-card-tile { background: #fffbeb; color: #b45309; }
.cfa-card--amber   .cfa-card-cta  { background: #fffbeb; color: #b45309; }
.cfa-card--amber   .cfa-card-cta:hover { background: #fef3c7; }
```

Rule of thumb: pick the variant per category, not per row. Same category always shows the same tint.

## 2. KPI tile (numbers across the top of analytics pages)

```jsx
<div className="cfa-kpi">
  <div className="cfa-kpi-label">Active Surveys</div>
  <div className="cfa-kpi-value">12</div>
  <div className="cfa-kpi-sub">Currently collecting feedback</div>
</div>
```

```css
.cfa-kpi-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
@media (min-width: 640px) {
  .cfa-kpi-row { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
.cfa-kpi {
  background: #ffffff;
  border: 1px solid #f3f4f6;
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}
.cfa-kpi-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 4px;
}
.cfa-kpi-value {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
}
.cfa-kpi-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}
```

Variant: for a category-colored KPI (e.g. red "Visible Surveys"), add a tinted background to the icon-tile in a side column — don't tint the whole card.

## 3. Hero banner (the colorful page header on Quick Links / Surveys / Team Training)

```jsx
<section className="cfa-hero">
  <div className="cfa-hero-glow" />
  <div className="cfa-hero-inner">
    <div>
      <h1>Good morning, Cailer!</h1>
      <p>Friday, May 15</p>
    </div>
    <div className="cfa-hero-actions">
      <button className="ui-btn ui-btn-secondary">…</button>
      <button className="ui-btn ui-btn-primary">…</button>
    </div>
  </div>
</section>
```

```css
.cfa-hero {
  position: relative;
  background: linear-gradient(135deg, #E51636 0%, #b91c1c 100%);
  border-radius: 14px;
  padding: 22px 24px;
  color: #ffffff;
  overflow: hidden;
}
.cfa-hero-glow {
  position: absolute;
  inset: -40% -10% auto auto;
  width: 60%;
  height: 200%;
  background: radial-gradient(circle, rgba(255,255,255,0.18), transparent 60%);
  pointer-events: none;
}
.cfa-hero-inner {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}
.cfa-hero h1 {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 4px;
  color: #ffffff;
}
.cfa-hero p {
  font-size: 13px;
  opacity: 0.85;
  margin: 0;
}
```

Reserved for top-level "section" pages (Calendar, Team Quick Links, Surveys, Team Training). Don't use a hero on every page — most pages just use a plain text header.

## 4. Empty state

```jsx
<div className="cfa-empty">
  <div className="cfa-empty-icon">{/* 28px icon */}</div>
  <h3 className="cfa-empty-title">No Quick Links Yet</h3>
  <p className="cfa-empty-sub">Add your most-used links here for quick access</p>
  <button className="ui-btn ui-btn-primary">+ Add Your First Link</button>
</div>
```

```css
.cfa-empty {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.cfa-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: #fff1f2;
  color: #E51636;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
.cfa-empty-title { font-size: 16px; font-weight: 600; color: #111827; margin: 0; }
.cfa-empty-sub   { font-size: 13px; color: #6b7280; max-width: 32rem; line-height: 1.5; margin: 0 0 12px; }
```

## 5. Filter pill row (the status chips on Surveys / Team Members)

```jsx
<div className="cfa-pill-row">
  {FILTERS.map(f => (
    <button key={f.id}
      className={`cfa-pill ${active === f.id ? 'is-active' : ''}`}
      onClick={() => setActive(f.id)}>
      {f.label}
    </button>
  ))}
</div>
```

```css
.cfa-pill-row { display: flex; gap: 6px; flex-wrap: wrap; }
.cfa-pill {
  appearance: none;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #374151;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.cfa-pill:hover { background: #f9fafb; }
.cfa-pill.is-active {
  background: #E51636;
  border-color: #E51636;
  color: #ffffff;
}
```

## 6. Page shell

The standard wrapper every top-level page uses:

```jsx
<div className="cfa-page">
  <div className="cfa-page-shell">
    {/* hero or header */}
    {/* kpis */}
    {/* content */}
  </div>
</div>
```

```css
.cfa-page {
  min-height: 100vh;
  background: #ffffff;
  padding: 8px clamp(12px, 3vw, 24px) 32px;
}
.cfa-page-shell {
  max-width: 56rem;       /* 896px — readable but not too wide */
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}
```

For data-heavy pages (Analytics, History) bump `max-width` to `72rem`. For text-heavy "library" pages (Plans, Help) keep it at `56rem`.

---

If a new layout doesn't fit any of these six patterns, **stop and check** before inventing. Most CFA-SAT-Tracker UI is a remix of these primitives.
