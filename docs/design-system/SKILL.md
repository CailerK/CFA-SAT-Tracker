---
name: cfa-design-system
description: The CFA-SAT-Tracker visual design system. Use this skill ANY time you're creating, modifying, or styling a React page, component, modal, card, button, form, icon, or anything visual in the CFA-SAT-Tracker app — even if the user doesn't explicitly mention design. Also use it when the user asks Claude to "match the app's look", "make it look like the rest of the site", "build a new page", or shows a screenshot of an existing CFA-SAT-Tracker page and wants something similar. The skill encodes the white + CFA-red (#E51636) palette, the pastel icon-tile card pattern, the inline Lucide-style outlined SVG icon convention, border-radius scale (8/12/14/999px), button styles, and modal/form-field tokens. Pair with the `cfa-sat-tracker` skill (which covers architecture) — this one covers look & feel.
---

# CFA-SAT-Tracker — Visual Design System

White surfaces, CFA red accents, soft pastel icon tiles, outlined SVG icons, generous border-radius. Clean — not corporate, not playful. The "feels like a polished restaurant ops app" look.

The values below are **extracted from the live codebase**, not invented. Match these and new pages will visually slot in with no extra work.

---

## 1. The 5 things that make every page look "right"

1. **White page background** (`#ffffff`). No off-white page surfaces.
2. **CFA red (#E51636)** is the *only* brand accent. Use it for primary buttons, focus rings, active states, links/CTAs. Don't introduce other brand hues.
3. **Pastel icon tile** for any feature/list card — a small (44×44) rounded square with a soft tinted background and a 20–22px outlined icon inside. Tints: red `#fff1f2`, blue `#eff6ff`, emerald `#ecfdf5`, amber `#fffbeb`, violet `#f5f3ff`.
4. **Outlined SVG icons** drawn inline (Lucide-style: 24-viewBox, `stroke="currentColor"`, strokeWidth=2, round caps/joins). **Never emojis** in chrome — emojis only show up as user-typed content (notes, chat). The icons in the screenshot are SVG, not emoji.
5. **Rounded-but-not-rounded-pill**: 8px on buttons/fields, 12px on cards, 14px on modals, 999px only on chips/badges. The "a little rounding is okay" target sits at 10–12px for cards.

If you remember nothing else: **white page → red CTA → pastel icon tile → outlined SVG → 12px corners.**

---

## 2. Color tokens (use these exactly)

### Brand
- `#E51636` — CFA red. Primary buttons, active states, focus rings (with 12% alpha as `rgba(229, 22, 54, 0.12)`).
- `#c4112d` — Red on hover.
- `#dc2626` / `#b91c1c` — Destructive (delete, danger). Different from brand red so destructive actions don't look like CTAs.

### Surfaces
- `#ffffff` — page background, cards, modal body, inputs.
- `#fafafa` — modal footer, very subtle separation.
- `#f9fafb` — hover state on white surfaces.
- `#f3f4f6` — ghost-button hover, divider band.

### Borders
- `#f3f4f6` — subtle card border.
- `#e5e7eb` — standard border (secondary buttons).
- `#d1d5db` — input border (more visible).

### Text
- `#111827` — primary text (titles, body emphasis).
- `#374151` — labels, secondary buttons.
- `#4b5563` — body copy in cards.
- `#6b7280` — muted/help text, icon strokes that aren't brand.
- `#9ca3af` — placeholder text, KPI labels (uppercased).

### Pastel icon-tile backgrounds + matching icon colors
| Tint | Background | Icon stroke (suggested) |
|---|---|---|
| Red | `#fff1f2` | `#E51636` |
| Blue | `#eff6ff` | `#1e40af` |
| Emerald | `#ecfdf5` | `#047857` |
| Amber | `#fffbeb` | `#b45309` |
| Violet | `#f5f3ff` | `#9333ea` |
| Pink | `#fdf2f8` | `#be185d` |

For the "Browse Plans" card grid in the screenshot: each card gets one of these tints based on category. Don't mix tile color and card border color — keep the card border neutral (`#f3f4f6`) and only color the inner tile.

---

## 3. Border radius scale

| Size | Use |
|---|---|
| `6px` | Tiny chips, dropdown items |
| `8px` | Buttons, inputs, ghost-icon buttons |
| `10–12px` | **Cards, icon tiles, hero banners** ← the "a little rounding" sweet spot |
| `14px` | Modals (slightly more than cards so they read as elevated) |
| `999px` | Pills, status badges, filter chips |
| `50%` | Avatar circles only |

---

## 4. Typography scale

The codebase uses the system font stack (no custom font file). Sizes/weights below are what every page already uses:

| Role | Size | Weight | Color | Notes |
|---|---|---|---|---|
| Page title (H1) | 22px | 700 | `#111827` | `letter-spacing: -0.01em` |
| Section title (H2) | 18px | 700 | `#111827` | |
| Card title | 16px | 600 | `#111827` | |
| Body | 14px | 400 | `#4b5563` or `#374151` | line-height 1.5 |
| Label | 13px | 600 | `#374151` | |
| Help / sub | 13px | 400 | `#6b7280` | |
| KPI label | 11px | 600 | `#9ca3af` | `text-transform: uppercase`, `letter-spacing: 0.05em` |
| KPI value | 22px | 700 | `#111827` | |
| Button | 14px | 600 | (varies) | |
| Help footer | 12px | 400 | `#6b7280` | |

---

## 5. Icons — the convention

**Always inline SVG.** Do NOT import `lucide-react`. The pattern across every component is the same:

```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round">
  {/* Lucide path data */}
</svg>
```

Common sizes: `12` (badges/inline), `16` (button leading icons), `18` (form-field affordances), `20–22` (card tile icons), `24+` (empty-state hero icons).

For a starter palette of icons that match the screenshot vibe (Heart, Users, MessageSquare, Zap, Shield, etc.), see `references/icons.md`. Each entry is a copy-pasteable JSX snippet.

---

## 6. The card pattern (what the screenshot shows)

The "Browse Plans" cards are the canonical CFA-SAT-Tracker card. Layout:

```
┌─────────────────────────────────────┐
│ ┌────┐  Title                       │
│ │ ◆  │  Subtitle / level            │
│ └────┘                              │
│                                     │
│ Two- or three-line description that │
│ explains what the card is for.      │
│                                     │
│ [ Primary or ghost button ]         │
└─────────────────────────────────────┘
```

Specs:
- Outer card: `background:#fff`, `border:1px solid #f3f4f6`, `border-radius:12px`, `padding:16–18px`, `box-shadow: 0 1px 2px rgba(0,0,0,0.03)`.
- Icon tile (top-left): 44×44, `border-radius:12px`, pastel background from the table above, icon centered, 20–22px stroke="currentColor".
- Title: 16/600/`#111827`. Subtitle (e.g. "All Levels"): 13/400/`#6b7280`, just under the title.
- Body: 13/400/`#4b5563`, 2–3 lines, `line-height:1.5`. Truncate with `-webkit-line-clamp` if it overflows.
- CTA button: full-width pill-style (`border-radius:8px`, `padding:9px 0`) with a soft tinted background (matches tile tint) and the brand red text. Hover deepens the tint slightly. Active plan: button reads "Continue →"; inactive: "Start Plan".
- Lock state: a small `#9ca3af` lock icon in the top-right corner; the whole card is `opacity:0.6` and unclickable.

Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, `gap: 12px`. Two-up on tablet, three-up on wide desktop.

Full annotated CSS in `references/card-patterns.md`.

---

## 7. Buttons

Five variants live in `frontend/src/components/ui/index.css` and that's the whole vocabulary:

| Class | Use | Style |
|---|---|---|
| `ui-btn-primary` | The single most important action on the page | bg `#E51636`, white text |
| `ui-btn-secondary` | Most actions (Cancel, Edit) | white bg, `#e5e7eb` border, `#374151` text |
| `ui-btn-danger` | Delete / destructive | bg `#dc2626`, white text |
| `ui-btn-ghost` | Tertiary (dismiss, navigate-away) | transparent, `#6b7280` text |
| `ui-btn-tinted` | The card-CTA from §6 | tile-tint bg, brand-red text |

All buttons: `padding:9px 16px`, `font-size:14px`, `font-weight:600`, `border-radius:8px`, `display:inline-flex`, `gap:6px` (for leading icon).

**Avoid**: drop shadows on buttons, gradients, multiple sizes per page, primary buttons in more than one place on a screen.

---

## 8. Form fields & modals

Use the existing UI primitives. Don't restyle them.

```jsx
import { FormModal, ConfirmDialog, TextField, SelectField } from '../ui';
```

If you absolutely must write a new field, copy these tokens:
- Input: `border:1px solid #d1d5db`, `border-radius:8px`, `padding:9px 12px`, `font-size:14px`.
- Focus: `border-color:#E51636`, `box-shadow: 0 0 0 3px rgba(229,22,54,0.12)`.
- Label: 13/600/`#374151`, sits above the input with 4px gap.

Modals: 14px radius, `box-shadow: 0 24px 48px rgba(0,0,0,0.25)`, max-width 560px (default) / 420 (sm) / 760 (lg). Header has a 1px `#f3f4f6` bottom border, footer has a `#fafafa` background.

---

## 9. Empty states

Every empty state across the app uses the same shape:

```
        ┌────┐
        │ ◇  │      ← 56–64px pastel-tinted icon tile (radius 16px), brand icon inside
        └────┘
       Title          ← 16/600/#111827
   Helper sentence    ← 13/400/#6b7280, max-width ~32rem, centered
    [ + Primary CTA ] ← optional
```

Centered, vertically padded ~48px, no border, no background — sits inside the page padding.

---

## 10. Don't list

- Don't use gradients on primary surfaces (one exception: the dashboard hero glow at very low opacity).
- Don't use emoji in chrome (titles, buttons, nav). Only in user content.
- Don't introduce a second brand color. If you need to differentiate categories, use the pastel icon-tile tints — not new primary colors.
- Don't use box-shadows above `0 8px 16px rgba(0,0,0,0.06)` outside modals.
- Don't write inline `style={{...}}` for things that have a UI primitive (FormModal, ActionMenu, fields). Reach for the primitive first.
- Don't write a new modal CSS file. Use `FormModal`.
- Don't pick arbitrary border-radius values (e.g. 7px, 11px). Snap to the scale: 6 / 8 / 12 / 14 / 999.

---

## 11. Further reading

- `references/tokens.md` — every CSS variable / hex code in one table.
- `references/icons.md` — copy-paste JSX for the ~30 icons the app uses most.
- `references/card-patterns.md` — annotated CSS for the card grid, KPI cards, hero banners, and empty states.

When in doubt, **find the closest existing page** (e.g. for a new "Library" page, open `LeadershipDevPlans.css`) and crib its tokens. Consistency beats cleverness.
