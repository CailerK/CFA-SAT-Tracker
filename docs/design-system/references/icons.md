# Icon library — copy-paste JSX

Convention: every icon is **inline SVG** using Lucide path data. Don't `import` from `lucide-react`.

Wrapper template (vary `width`/`height` to size):

```jsx
<svg width="20" height="20" viewBox="0 0 24 24" fill="none"
     stroke="currentColor" strokeWidth="2"
     strokeLinecap="round" strokeLinejoin="round">
  {/* ...path here... */}
</svg>
```

`stroke="currentColor"` means the icon picks up its color from CSS — so styling is just `color: var(--tile-red-ink)` on the parent.

## Size guide

| Context | Size |
|---|---|
| Status badge / inline-text icon | 12 |
| Button leading icon | 14–16 |
| Field affordance (search, chevron) | 16–18 |
| Card pastel tile icon | 20–22 |
| Section header icon | 22–24 |
| Empty-state hero icon | 28–36 |

## The starter set — covers ~80% of the app

### Heart  (Leadership: "Heart of Leadership" plan)
```jsx
<svg ...><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
```

### Users  (Team / hospitality)
```jsx
<svg ...>
  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
  <circle cx="9" cy="7" r="4"/>
  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
</svg>
```

### MessageSquare  (Communication / chat / surveys)
```jsx
<svg ...><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
```

### Zap  (Innovation / quick actions)
```jsx
<svg ...><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
```

### Shield  (Conflict resolution / safety / food safety)
```jsx
<svg ...><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
```

### Award  (Recognition / Hospitality Leader)
```jsx
<svg ...><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
```

### Target  (Strategic / goals)
```jsx
<svg ...><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
```

### Settings  (Gear)
```jsx
<svg ...>
  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
  <circle cx="12" cy="12" r="3"/>
</svg>
```

### Plus  (Add)
```jsx
<svg ...><path d="M5 12h14"/><path d="M12 5v14"/></svg>
```

### Check  (Complete)
```jsx
<svg ...><polyline points="20 6 9 17 4 12"/></svg>
```

### X  (Close / dismiss)
```jsx
<svg ...><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
```

### ChevronRight  (Drill into card)
```jsx
<svg ...><polyline points="9 18 15 12 9 6"/></svg>
```

### ChevronDown  (Expand / dropdown)
```jsx
<svg ...><polyline points="6 9 12 15 18 9"/></svg>
```

### ArrowLeft  (Back)
```jsx
<svg ...><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
```

### Calendar
```jsx
<svg ...>
  <rect x="3" y="4" width="18" height="18" rx="2"/>
  <line x1="16" y1="2" x2="16" y2="6"/>
  <line x1="8"  y1="2" x2="8"  y2="6"/>
  <line x1="3" y1="10" x2="21" y2="10"/>
</svg>
```

### Clock  (History)
```jsx
<svg ...><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
```

### Trash  (Delete)
```jsx
<svg ...><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
```

### Edit / Pencil
```jsx
<svg ...><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
```

### Lock  (Disabled / gated content — the dim corner icon on locked plan cards)
```jsx
<svg ...><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
```

### Search
```jsx
<svg ...><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
```

### Bell  (Notifications)
```jsx
<svg ...><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
```

### Filter
```jsx
<svg ...><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
```

### MoreVertical  (3-dot)
```jsx
<svg ...><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
```

### Star
```jsx
<svg ...><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
```

### TrendingUp
```jsx
<svg ...><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
```

### LayoutDashboard
```jsx
<svg ...><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
```

### Lightbulb  (Innovation, Tips)
```jsx
<svg ...><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>
```

### Brain  (Strategy, Ownership)
```jsx
<svg ...><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
```

### Smile  (Emotional intelligence)
```jsx
<svg ...><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
```

If you need an icon not in this list, grab it from https://lucide.dev/icons/ and copy just the `<path>` / `<circle>` / etc. children — keep the wrapper attributes unchanged.
