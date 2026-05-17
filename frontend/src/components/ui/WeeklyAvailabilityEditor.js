/**
 * <WeeklyAvailabilityEditor>
 *
 * A recurring weekly schedule editor — Mon–Sat grid. Each day is a tappable
 * card; clicking it expands an inline panel where you can toggle the day
 * available/unavailable and add one or more time slots (e.g. `9:00–12:00`
 * and `2:00–6:00` for someone with a midday break).
 *
 * Data shape (also what the backend's `User.shift_preference` JSONField
 * carries):
 *
 *   {
 *     monday:    { available: true,  slots: [{ start: "09:00", end: "17:00" }] },
 *     tuesday:   { available: false, slots: [] },
 *     ...
 *     saturday:  { available: true,  slots: [
 *                     { start: "08:00", end: "12:00" },
 *                     { start: "14:00", end: "18:00" },
 *                 ] },
 *   }
 *
 * Props:
 *   - value:    The schedule object above (loose shape OK — `normalizeWeeklyAvailability`
 *               will coerce old `{ available, hours: "9am-5pm" }` rows too).
 *   - onChange: (next) => void
 *   - readOnly: When true, the widget renders as static summary text and
 *               the cards aren't clickable. Use this for non-superusers.
 *   - label / help / required:  Standard ui-field chrome.
 */
import React, { useMemo, useState } from 'react';
import { TimePicker } from './fields';
import './ui.css';

export const WEEKDAYS = [
  { key: 'monday',    short: 'Mon',  long: 'Monday' },
  { key: 'tuesday',   short: 'Tue',  long: 'Tuesday' },
  { key: 'wednesday', short: 'Wed',  long: 'Wednesday' },
  { key: 'thursday',  short: 'Thu',  long: 'Thursday' },
  { key: 'friday',    short: 'Fri',  long: 'Friday' },
  { key: 'saturday',  short: 'Sat',  long: 'Saturday' },
];

// Reasonable defaults the user can immediately tweak.
const DEFAULT_SLOT = { start: '09:00', end: '17:00' };

export const createEmptyWeeklyAvailability = () =>
  WEEKDAYS.reduce(
    (acc, d) => ({ ...acc, [d.key]: { available: false, slots: [] } }),
    {}
  );

// --- Legacy data migration ---------------------------------------------------
// Older records stored `hours: "9am-5pm"` as a free-text string. Parse it best-
// effort into one slot; if we can't parse, drop the slot but keep `available`.
const parseLegacyHoursToSlot = (hoursStr) => {
  if (!hoursStr || typeof hoursStr !== 'string') return null;
  // Match patterns like "9am-5pm", "09:00-17:00", "9:30 AM - 5:00 PM"
  const m = hoursStr.replace(/\s+/g, '').toLowerCase().match(
    /^(\d{1,2})(?::(\d{2}))?(am|pm)?-(\d{1,2})(?::(\d{2}))?(am|pm)?$/
  );
  if (!m) return null;
  const toHHMM = (hStr, minStr, mer) => {
    let h = parseInt(hStr, 10);
    const min = parseInt(minStr || '0', 10);
    if (mer === 'pm' && h < 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };
  return { start: toHHMM(m[1], m[2], m[3]), end: toHHMM(m[4], m[5], m[6]) };
};

export const normalizeWeeklyAvailability = (raw) => {
  const base = createEmptyWeeklyAvailability();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;

  for (const day of WEEKDAYS) {
    const row = raw[day.key];
    if (!row || typeof row !== 'object') continue;

    const available = !!row.available;
    let slots = [];

    if (Array.isArray(row.slots)) {
      slots = row.slots
        .filter((s) => s && typeof s === 'object' && s.start && s.end)
        .map((s) => ({ start: String(s.start), end: String(s.end) }));
    } else if (typeof row.hours === 'string') {
      // Legacy single-string hours value.
      const parsed = parseLegacyHoursToSlot(row.hours);
      if (parsed) slots = [parsed];
    }

    base[day.key] = { available, slots };
  }
  return base;
};

// --- Display helpers ---------------------------------------------------------

const formatTime12h = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return '';
  const [hStr, mStr] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (Number.isNaN(h)) return hhmm;
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return m === 0
    ? `${h}:00 ${meridiem}`
    : `${h}:${String(m).padStart(2, '0')} ${meridiem}`;
};

const slotsToSummary = (slots) => {
  if (!slots || slots.length === 0) return 'No hours set';
  return slots
    .map((s) => `${formatTime12h(s.start)} – ${formatTime12h(s.end)}`)
    .join(', ');
};

// --- Component ---------------------------------------------------------------

const WeeklyAvailabilityEditor = ({
  value,
  onChange,
  readOnly = false,
  label = 'Weekly Availability',
  help,
  required,
}) => {
  // Coerce whatever shape we got into our canonical structure.
  const schedule = useMemo(() => normalizeWeeklyAvailability(value), [value]);
  const [openDay, setOpenDay] = useState(null);

  // Helper: emit a patched schedule for one day.
  const patchDay = (dayKey, patch) => {
    if (readOnly || !onChange) return;
    const current = schedule[dayKey] || { available: false, slots: [] };
    const next = { ...schedule, [dayKey]: { ...current, ...patch } };
    onChange(next);
  };

  const handleToggleAvailable = (dayKey, available) => {
    // Switching ON with no slots → seed a default slot so they have
    // something to edit. Switching OFF → clear slots.
    if (available) {
      const current = schedule[dayKey];
      patchDay(dayKey, {
        available: true,
        slots: current?.slots?.length ? current.slots : [{ ...DEFAULT_SLOT }],
      });
    } else {
      patchDay(dayKey, { available: false, slots: [] });
    }
  };

  const handleAddSlot = (dayKey) => {
    const current = schedule[dayKey] || { available: true, slots: [] };
    patchDay(dayKey, {
      available: true,
      slots: [...current.slots, { ...DEFAULT_SLOT }],
    });
  };

  const handleRemoveSlot = (dayKey, idx) => {
    const current = schedule[dayKey];
    if (!current) return;
    const nextSlots = current.slots.filter((_, i) => i !== idx);
    patchDay(dayKey, { slots: nextSlots });
  };

  const handleSlotChange = (dayKey, idx, field, val) => {
    const current = schedule[dayKey];
    if (!current) return;
    const nextSlots = current.slots.map((s, i) =>
      i === idx ? { ...s, [field]: val } : s
    );
    patchDay(dayKey, { slots: nextSlots });
  };

  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field-label">
          {label}
          {required && <span className="ui-field-required">*</span>}
        </label>
      )}

      <div className={`wa-grid ${readOnly ? 'is-readonly' : ''}`}>
        {WEEKDAYS.map((day) => {
          const row = schedule[day.key] || { available: false, slots: [] };
          const isOpen = openDay === day.key;
          const isAvailable = !!row.available;

          return (
            <div
              key={day.key}
              className={[
                'wa-day',
                isAvailable ? 'is-available' : 'is-unavailable',
                isOpen ? 'is-open' : '',
              ].join(' ').trim()}
            >
              <button
                type="button"
                className="wa-day-head"
                onClick={() => !readOnly && setOpenDay(isOpen ? null : day.key)}
                disabled={readOnly}
                aria-expanded={isOpen}
              >
                <span className="wa-day-name">{day.long}</span>
                <span className="wa-day-summary">
                  {isAvailable ? slotsToSummary(row.slots) : 'Unavailable'}
                </span>
                {!readOnly && (
                  <svg
                    className={`wa-chevron ${isOpen ? 'is-open' : ''}`}
                    width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
              </button>

              {isOpen && !readOnly && (
                <div className="wa-day-body">
                  <label className="wa-toggle">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) =>
                        handleToggleAvailable(day.key, e.target.checked)
                      }
                    />
                    <span>Available this day</span>
                  </label>

                  {isAvailable && (
                    <>
                      <div className="wa-slots">
                        {row.slots.map((slot, idx) => (
                          <div className="wa-slot" key={idx}>
                            <TimePicker
                              label="Start"
                              value={slot.start}
                              onChange={(v) =>
                                handleSlotChange(day.key, idx, 'start', v)
                              }
                            />
                            <span className="wa-slot-dash" aria-hidden="true">–</span>
                            <TimePicker
                              label="End"
                              value={slot.end}
                              onChange={(v) =>
                                handleSlotChange(day.key, idx, 'end', v)
                              }
                            />
                            <button
                              type="button"
                              className="wa-slot-remove"
                              onClick={() => handleRemoveSlot(day.key, idx)}
                              title="Remove this time slot"
                              aria-label="Remove time slot"
                            >
                              <svg
                                width="16" height="16" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor"
                                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        className="wa-add-slot"
                        onClick={() => handleAddSlot(day.key)}
                      >
                        <svg
                          width="14" height="14" viewBox="0 0 24 24"
                          fill="none" stroke="currentColor"
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add another time
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {help && <span className="ui-field-help">{help}</span>}
      {readOnly && (
        <span className="ui-field-help">
          Only super-admins can change weekly availability.
        </span>
      )}
    </div>
  );
};

export default WeeklyAvailabilityEditor;
