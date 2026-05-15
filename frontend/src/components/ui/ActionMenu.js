/**
 * <ActionMenu> — popover menu triggered by a 3-dot button (or custom trigger).
 *
 * Usage:
 *   <ActionMenu
 *     actions={[
 *       { label: 'Edit', onClick: () => openEdit(item) },
 *       { label: 'Duplicate', onClick: () => duplicate(item) },
 *       { divider: true },
 *       { label: 'Delete', onClick: () => del(item), destructive: true },
 *     ]}
 *   />
 *
 * Each action: { label, onClick, icon?, destructive?, divider? }
 * `divider: true` renders a horizontal separator instead of a button.
 *
 * Props:
 *   - actions: array of action objects (required).
 *   - trigger: optional React node to use as the trigger. Defaults to a 3-dot ⋮ button.
 *   - align: 'left' | 'right' — which side of the trigger to align the menu to.
 *     Default 'right'.
 */
import React, { useState, useRef, useEffect } from 'react';
import './ui.css';

const DefaultTrigger = ({ onClick, isOpen }) => (
  <button
    type="button"
    className="ui-btn ui-btn-ghost"
    onClick={onClick}
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-label="Actions"
    style={{ padding: '4px 8px', minWidth: 0 }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  </button>
);

const ActionMenu = ({ actions = [], trigger, align = 'right' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const handleItemClick = (action) => {
    setIsOpen(false);
    // Defer to next tick so the menu closes visually before the onClick
    // possibly opens a modal (avoids the new modal getting hit by the
    // outside-click handler that's about to fire).
    setTimeout(() => action.onClick && action.onClick(), 0);
  };

  return (
    <div className="ui-action-menu-wrap" ref={wrapRef}>
      {trigger ? (
        React.cloneElement(trigger, {
          onClick: (e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
            if (trigger.props.onClick) trigger.props.onClick(e);
          },
        })
      ) : (
        <DefaultTrigger
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((o) => !o);
          }}
          isOpen={isOpen}
        />
      )}
      {isOpen && (
        <div
          className="ui-action-menu"
          role="menu"
          style={align === 'left' ? { left: 0, right: 'auto' } : undefined}
        >
          {actions.map((a, i) =>
            a.divider ? (
              <div key={`d-${i}`} className="ui-action-menu-divider" />
            ) : (
              <button
                key={a.label || i}
                type="button"
                role="menuitem"
                className={`ui-action-menu-item ${a.destructive ? 'destructive' : ''}`}
                onClick={() => handleItemClick(a)}
                disabled={a.disabled}
              >
                {a.icon && <span>{a.icon}</span>}
                <span>{a.label}</span>
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
