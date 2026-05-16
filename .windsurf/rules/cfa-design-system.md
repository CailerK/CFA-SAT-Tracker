---
trigger: always_on
description: CFA-SAT-Tracker visual design system. Applies any time UI/React/CSS work is happening in this repo.
---

# CFA-SAT-Tracker design system — always-on rule

Any time you create, modify, or style a React page, component, modal, card, button, form, or icon in this repo, follow these rules. Full reference docs live at `docs/design-system/SKILL.md` and `docs/design-system/references/{tokens,icons,card-patterns}.md` — **read those before generating any non-trivial UI code.**

## The 5 non-negotiables

1. **White page background** (`#ffffff`). Never off-white.
2. **CFA red `#E51636`** is the only brand accent — primary buttons, active states, focus rings (with 12% alpha: `rgba(229, 22, 54, 0.12)`).
3. **Pastel icon tile** on every feature/list card: 44×44, `border-radius:12px`, tinted background. Tints: red `#fff1f2`, blue `#eff6ff`, emerald `#ecfdf5`, amber `#fffbeb`, violet `#f5f3ff`. Tinted icon inside uses the matching ink color from `tokens.md`.
4. **Outlined SVG icons inline** — Lucide-style, 24-viewBox, `stroke="currentColor"`, `strokeWidth=2`, `strokeLinecap="round"`, `strokeLinejoin="round"`. **NEVER emojis in chrome.** Never `import` from `lucide-react`; copy the path inline. See `docs/design-system/references/icons.md` for the starter set.
5. **Border radius scale**: 6px (chips), 8px (buttons/inputs), 10–12px (cards / icon tiles), 14px (modals), 999px (filter pills/badges). Snap to the scale — no 7px, no 11px.

## Color quick-reference

- Brand red: `#E51636`, hover `#c4112d`
- Destructive: `#dc2626` / hover `#b91c1c` (visually distinct from brand red on purpose)
- Surfaces: `#ffffff` (page/card), `#fafafa` (modal footer), `#f9fafb` (hover), `#f3f4f6` (subtle band)
- Borders: `#f3f4f6` (faint), `#e5e7eb` (default), `#d1d5db` (input)
- Text: `#111827` (primary), `#374151` (label), `#4b5563` (body), `#6b7280` (muted), `#9ca3af` (placeholder)

## Typography quick-reference

- Page title: 22/700/`#111827`, `letter-spacing: -0.01em`
- Card title: 16/600/`#111827`
- Body: 14/400/`#4b5563`, line-height 1.5
- Label: 13/600/`#374151`
- KPI label: 11/600/`#9ca3af`, uppercased, `letter-spacing: 0.05em`
- KPI value: 22/700/`#111827`

## Components — reach for these first

```js
import { FormModal, ConfirmDialog, ActionMenu, TextField, TextArea,
         SelectField, NumberField, Toggle, DatePicker, TimePicker,
         ChipMultiSelect, UserPicker, HistoryDrawer, FieldRow } from '../ui';
```

- Every "Add X" / "Edit X" → `<FormModal>`.
- Every `window.confirm` → `<ConfirmDialog destructive>`.
- Every 3-dot menu → `<ActionMenu actions={[{label, onClick, destructive?, divider?}]} />`.
- **Don't use `window.prompt` or `window.confirm` in new code.**
- **Don't write new modal CSS files** — use `FormModal`.

## Card pattern (the "Browse Plans" grid in the app)

```
[ 44×44 tinted tile w/ icon ]   Title (16/600)
                                Sub (13/400 #6b7280)
Body description, 2–3 lines, 13/400 #4b5563

[ full-width tinted CTA button ]
```

- Outer: `background:#fff`, `border:1px solid #f3f4f6`, `border-radius:12px`, `padding:16px`, `box-shadow: 0 1px 2px rgba(0,0,0,0.03)`.
- Grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, `gap: 12px`.
- CTA: tile-tint background, brand-red text, `border-radius:8px`, full-width, `padding:10px 0`.
- Locked state: `opacity:0.6`, lock icon top-right, pointer-events:none.
- Full annotated CSS: `docs/design-system/references/card-patterns.md`.

## Don't list

- Don't use gradients on primary surfaces (one exception: hero banner red gradient).
- Don't use emoji in chrome (titles, buttons, nav, tabs). Only in user content.
- Don't introduce a second brand color. Use the pastel tile tints to differentiate categories.
- Don't write inline `style={{...}}` for anything a UI primitive already covers.
- Don't pick arbitrary radii. Snap to 6/8/12/14/999.
- Don't add box-shadow stronger than `0 8px 16px rgba(0,0,0,0.06)` outside modals.

## When in doubt

Open the closest existing page (e.g. `LeadershipDevPlans.css`, `TeamSurveys.css`, `Calendar.css`) and crib the tokens. Consistency beats cleverness.

For anything not covered above, read `docs/design-system/SKILL.md` + `docs/design-system/references/*.md` first.
