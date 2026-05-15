/**
 * <EmployeeRecordModal> — Create a new documentation record for an employee.
 *
 * Used by the Team Documentation page. The employee is required (we always
 * open this modal in the context of a specific person) and the modal POSTs
 * to /team/documentation/employees/<userId>/records/.
 *
 * Fields map 1:1 to the EmployeeRecord model:
 *   - kind:   'admin' | 'warning' | 'pip' | 'recognition'
 *   - title:  short headline (required)
 *   - body:   long-form notes
 *   - status: 'documented' | 'pending' | 'resolved'
 */
import React, { useEffect, useState } from 'react';
import teamService from '../services/team';
import {
  FormModal, TextField, TextArea, SelectField, FieldRow,
} from './ui';

const KIND_OPTIONS = [
  { value: 'admin',       label: 'Admin Note' },
  { value: 'warning',     label: 'Warning' },
  { value: 'pip',         label: 'PIP' },
  { value: 'recognition', label: 'Recognition' },
];

const STATUS_OPTIONS = [
  { value: 'documented', label: 'Documented' },
  { value: 'pending',    label: 'Pending Review' },
  { value: 'resolved',   label: 'Resolved' },
];

const EmployeeRecordModal = ({ isOpen, employee, onClose, onSaved }) => {
  const [kind, setKind] = useState('admin');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recordStatus, setRecordStatus] = useState('documented');
  const [errorMsg, setErrorMsg] = useState('');

  // Reset every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setKind('admin');
    setTitle('');
    setBody('');
    setRecordStatus('documented');
    setErrorMsg('');
  }, [isOpen]);

  const isValid = !!employee?.id && title.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) {
      setErrorMsg('A title is required.');
      return;
    }
    try {
      await teamService.addEmployeeRecord(employee.id, {
        kind,
        title: title.trim(),
        body: body.trim(),
        status: recordStatus,
      });
      if (onSaved) await onSaved();
    } catch (err) {
      const detail = err?.data
        ? Object.entries(err.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' \u2022 ')
        : (err?.message || 'Save failed.');
      setErrorMsg(detail);
      throw err;
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={employee ? `Document — ${employee.name}` : 'Add Documentation'}
      submitLabel="Save Record"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitDisabled={!isValid}
      errorMessage={errorMsg}
      size="default"
    >
      <FieldRow>
        <SelectField
          label="Type"
          value={kind}
          onChange={setKind}
          options={KIND_OPTIONS}
        />
        <SelectField
          label="Status"
          value={recordStatus}
          onChange={setRecordStatus}
          options={STATUS_OPTIONS}
        />
      </FieldRow>

      <TextField
        label="Title"
        value={title}
        onChange={setTitle}
        placeholder="Short summary (e.g. 'Late arrival — second occurrence')"
        required
        autoFocus
      />

      <TextArea
        label="Details"
        value={body}
        onChange={setBody}
        placeholder="Add context, what was discussed, expectations going forward, etc."
        rows={6}
      />
    </FormModal>
  );
};

export default EmployeeRecordModal;
