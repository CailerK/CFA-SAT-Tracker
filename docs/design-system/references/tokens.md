# Design tokens — full reference

All values extracted from `frontend/src/components/ui/*.css` and the page-level CSS files. Treat as the source of truth.

## Color

```css
/* Brand */
--brand-red:        #E51636;
--brand-red-hover:  #c4112d;
--brand-red-soft:   rgba(229, 22, 54, 0.12);  /* focus rings */

/* Destructive */
--danger:           #dc2626;
--danger-hover:     #b91c1c;
--danger-soft:      #fca5a5;  /* destructive border */

/* Surfaces */
--surface-page:     #ffffff;
--surface-card:     #ffffff;
--surface-subtle:   #fafafa;
--surface-hover:    #f9fafb;
--surface-band:     #f3f4f6;

/* Borders */
--border-faint:     #f3f4f6;
--border-default:   #e5e7eb;
--border-input:     #d1d5db;

/* Text */
--text-primary:     #111827;
--text-strong:      #1f2937;
--text-label:       #374151;
--text-body:        #4b5563;
--text-muted:       #6b7280;
--text-placeholder: #9ca3af;
--text-disabled:    #cbd5e1;

/* Pastel icon tiles */
--tile-red-bg:      #fff1f2;   --tile-red-ink:      #E51636;
--tile-rose-bg:     #fff5f6;   --tile-rose-ink:     #be185d;
--tile-blue-bg:     #eff6ff;   --tile-blue-ink:     #1e40af;
--tile-emerald-bg:  #ecfdf5;   --tile-emerald-ink:  #047857;
--tile-amber-bg:    #fffbeb;   --tile-amber-ink:    #b45309;
--tile-violet-bg:   #f5f3ff;   --tile-violet-ink:   #9333ea;
--tile-pink-bg:     #fdf2f8;   --tile-pink-ink:     #be185d;
--tile-gray-bg:     #f9fafb;   --tile-gray-ink:     #6b7280;
```

## Radius

```css
--radius-xs:   6px;    /* tiny chips, dropdown items */
--radius-sm:   8px;    /* buttons, inputs */
--radius-md:  10px;    /* secondary cards / icon tiles smaller variant */
--radius-lg:  12px;    /* primary cards, icon tiles */
--radius-xl:  14px;    /* modals */
--radius-pill: 999px;  /* chips, badges, filter pills */
--radius-circle: 50%;  /* avatars only */
```

## Shadow

```css
--shadow-card:    0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-pop:     0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-modal:   0 24px 48px rgba(0, 0, 0, 0.25);
--shadow-focus:   0 0 0 3px rgba(229, 22, 54, 0.12);
```

## Spacing scale

Used inconsistently across files but the de facto scale is the Tailwind one:

```
4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40, 48
```

For card padding the sweet spot is `14–18px`. For page padding `clamp(12px, 3vw, 24px)` to stay responsive.

## Typography

```css
font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

--font-h1:    700 22px/1.2  /* letter-spacing: -0.01em */
--font-h2:    700 18px/1.3
--font-card-title: 600 16px/1.3
--font-body:  400 14px/1.5
--font-label: 600 13px/1.4
--font-help:  400 13px/1.5
--font-kpi-label: 600 11px/1.2 /* uppercase, letter-spacing: 0.05em */
--font-kpi-value: 700 22px/1.2
--font-button: 600 14px/1
--font-footer: 400 12px/1.4
```

## Transitions

```css
--ease-out: cubic-bezier(0.2, 0.8, 0.4, 1);
--dur-fast: 0.12s;
--dur-base: 0.15s;
```

Hover/focus transitions should be on `background`, `border-color`, `box-shadow`, `color` — **never** on `transform` for surfaces (it makes things feel laggy). The one exception: buttons can `translateY(1px)` on `:active`.
