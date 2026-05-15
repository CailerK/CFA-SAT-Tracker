/**
 * Reusable form field components used inside <FormModal> and elsewhere.
 *
 * All fields share a common pattern:
 *   - `label` shows above the input
 *   - `value` + `onChange(newValue)` (onChange receives the value directly,
 *     NOT the event — simpler for parent components)
 *   - `required` shows a red asterisk and sets HTML required
 *   - `error` shows red error text below the input
 *   - `help` shows muted help text below the input
 *   - `id` auto-generated from label if not provided
 *
 * Components: <TextField>, <TextArea>, <SelectField>, <NumberField>,
 *             <Toggle>, <DatePicker>, <TimePicker>
 */
import React from 'react';
import './ui.css';

const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// --- TextField ---
export const TextField = ({
  label, value, onChange, type = 'text', placeholder, required, error, help,
  id, autoFocus,
}) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <input
        id={fieldId}
        type={type}
        className="ui-field-input"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
      />
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- TextArea ---
export const TextArea = ({
  label, value, onChange, placeholder, rows = 3, required, error, help, id,
}) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <textarea
        id={fieldId}
        className="ui-field-textarea"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
      />
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- SelectField ---
// options: [{value, label}] OR ['plain', 'string', 'options']
export const SelectField = ({
  label, value, onChange, options = [], required, error, help, id, placeholder,
}) => {
  const fieldId = id || `f-${slug(label)}`;
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <select
        id={fieldId}
        className="ui-field-select"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {normalized.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- NumberField ---
export const NumberField = ({
  label, value, onChange, min, max, step = 1, required, error, help, id, placeholder,
}) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <input
        id={fieldId}
        type="number"
        className="ui-field-input"
        value={value ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          onChange && onChange(v === '' ? null : Number(v));
        }}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        required={required}
      />
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- Toggle (boolean switch) ---
export const Toggle = ({ label, value, onChange, disabled, help, id }) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className="ui-field">
      <label htmlFor={fieldId} className="ui-toggle">
        <input
          id={fieldId}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange && onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="ui-toggle-track">
          <span className="ui-toggle-thumb" />
        </span>
        <span>{label}</span>
      </label>
      {help && <span className="ui-field-help">{help}</span>}
    </div>
  );
};

// --- DatePicker (native input) ---
export const DatePicker = ({ label, value, onChange, required, error, help, id }) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <input
        id={fieldId}
        type="date"
        className="ui-field-input"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
      />
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- TimePicker (native input) ---
export const TimePicker = ({ label, value, onChange, required, error, help, id }) => {
  const fieldId = id || `f-${slug(label)}`;
  return (
    <div className={`ui-field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={fieldId} className="ui-field-label">
          {label}{required && <span className="ui-field-required">*</span>}
        </label>
      )}
      <input
        id={fieldId}
        type="time"
        className="ui-field-input"
        value={value ?? ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        required={required}
      />
      {help && !error && <span className="ui-field-help">{help}</span>}
      {error && <span className="ui-field-error-text">{error}</span>}
    </div>
  );
};

// --- FieldRow: 2-column grid wrapper for two fields side-by-side ---
export const FieldRow = ({ children }) => (
  <div className="ui-field-row">{children}</div>
);
