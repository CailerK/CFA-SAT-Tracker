/**
 * <ChipMultiSelect> — clickable chip group for multi-select fields.
 *
 * Usage:
 *   <ChipMultiSelect
 *     label="Departments"
 *     options={[
 *       { value: 'foh', label: 'Front of House' },
 *       { value: 'kitchen', label: 'Kitchen' },
 *     ]}
 *     selected={['foh']}
 *     onChange={(newArray) => setDepts(newArray)}
 *   />
 *
 * Props:
 *   - label (string)
 *   - options: [{value, label}] OR plain string array
 *   - selected: array of values
 *   - onChange(newSelectedArray)
 *   - max (optional cap on number selected)
 *   - help (optional help text)
 */
import React from 'react';
import './ui.css';

const ChipMultiSelect = ({ label, options = [], selected = [], onChange, max, help }) => {
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const toggle = (value) => {
    if (selected.includes(value)) {
      onChange && onChange(selected.filter((v) => v !== value));
    } else {
      if (max && selected.length >= max) return;
      onChange && onChange([...selected, value]);
    }
  };

  return (
    <div className="ui-field">
      {label && (
        <label className="ui-field-label">
          {label}
          {max && (
            <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 6 }}>
              ({selected.length}/{max})
            </span>
          )}
        </label>
      )}
      <div className="ui-chip-group">
        {normalized.map((o) => {
          const isSelected = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              className={`ui-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => toggle(o.value)}
              disabled={!isSelected && max && selected.length >= max}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {help && <span className="ui-field-help">{help}</span>}
    </div>
  );
};

export default ChipMultiSelect;
