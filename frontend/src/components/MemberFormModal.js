/**
 * <MemberFormModal> — Add / Edit a team member.
 *
 * Renders a <FormModal> with all the editable fields for a User. Used by
 * the Team Members page from two entry points:
 *
 *   • Add Member  → `member` prop is null. Save POSTs to /team/members/.
 *   • Edit Member → `member` is the existing user shape. Save PATCHes.
 *
 * Department slugs come from the model's DEPARTMENT_CHOICES list (stable
 * enums); shift preference is a 4-option slug (morning/midday/evening/flex).
 * Manager list is the `managers` prop so the parent can pre-load it once.
 */
import React, { useEffect, useMemo, useState } from 'react';
import teamService from '../services/team';
import {
  FormModal, TextField, SelectField, ChipMultiSelect, Toggle, FieldRow,
} from './ui';

// Stable enums that map to the backend (see models.py:Department.DEPARTMENT_CHOICES
// + the role constants in api/access.py).
const DEPARTMENT_OPTIONS = [
  { value: 'foh',        label: 'Front of House' },
  { value: 'kitchen',    label: 'Kitchen' },
  { value: 'management', label: 'Management' },
  { value: 'facilities', label: 'Facilities' },
  { value: 'catering',   label: 'Catering' },
];

const ROLE_OPTIONS = [
  { value: 'team_member',  label: 'Team Member' },
  { value: 'shift_leader', label: 'Shift Leader' },
  { value: 'manager',      label: 'Manager' },
  { value: 'director',     label: 'Director' },
];

const SHIFT_OPTIONS = [
  { value: 'flex',    label: 'Flex' },
  { value: 'morning', label: 'Morning' },
  { value: 'midday',  label: 'Midday' },
  { value: 'evening', label: 'Evening' },
];

// Pull the shift preference string out of the JSONField if present.
// We support both legacy string values and objects with a `preferred` key.
const readShift = (raw) => {
  if (!raw) return 'flex';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw.preferred) return raw.preferred;
  return 'flex';
};

const MemberFormModal = ({ isOpen, member, managers = [], onClose, onSaved }) => {
  const isEdit = !!member;

  // Form state — initialized from the member prop or blank defaults.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('team_member');
  const [shift, setShift] = useState('flex');
  const [departments, setDepartments] = useState([]);
  const [managerId, setManagerId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Reseed when the modal opens or the member changes.
  useEffect(() => {
    if (!isOpen) return;
    if (member) {
      // member is the UI-normalized shape used by TeamMembers.
      const [first, ...rest] = (member.name || '').split(' ');
      setFirstName(first || '');
      setLastName(rest.join(' ') || '');
      setEmail(member.email || '');
      setPhone(member.phone || '');
      setRole(member.roleSlug || 'team_member');
      setShift(readShift(member.shift_preference));
      setDepartments(
        Array.isArray(member.depts) ? member.depts.slice() : []
      );
      setManagerId(member.managerId || '');
      setIsAdmin(!!member.isAdmin);
      setIsActive(member.isActive !== false);
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRole('team_member');
      setShift('flex');
      setDepartments([]);
      setManagerId('');
      setIsAdmin(false);
      setIsActive(true);
    }
    setErrorMsg('');
  }, [isOpen, member]);

  // Managers list, minus self, as <SelectField> options.
  const managerOptions = useMemo(() => {
    const opts = managers
      .filter((m) => !member || m.id !== member.id)
      .map((m) => ({ value: String(m.id), label: m.name }));
    return [{ value: '', label: 'No manager' }, ...opts];
  }, [managers, member]);

  const isValid = firstName.trim() && lastName.trim() && email.trim();

  const handleSubmit = async () => {
    if (!isValid) {
      setErrorMsg('First name, last name, and email are required.');
      return;
    }
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      shift_preference: { preferred: shift },
      department_slugs: departments,
      manager: managerId ? Number(managerId) : null,
      is_admin: !!isAdmin,
      is_active: !!isActive,
    };
    try {
      const saved = isEdit
        ? await teamService.updateMember(member.id, payload)
        : await teamService.createMember(payload);
      if (onSaved) await onSaved(saved);
    } catch (err) {
      // Surface server validation errors when possible (e.g. duplicate email).
      const detail = err?.data
        ? Object.entries(err.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' \u2022 ')
        : (err?.message || 'Save failed.');
      setErrorMsg(detail);
      throw err; // keeps the FormModal Save button in error state
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={isEdit ? 'Edit Team Member' : 'Add Team Member'}
      submitLabel={isEdit ? 'Save Changes' : 'Add Member'}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitDisabled={!isValid}
      errorMessage={errorMsg}
      size="default"
    >
      <FieldRow>
        <TextField
          label="First Name"
          value={firstName}
          onChange={setFirstName}
          required
          autoFocus
        />
        <TextField
          label="Last Name"
          value={lastName}
          onChange={setLastName}
          required
        />
      </FieldRow>

      <FieldRow>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
        />
        <TextField
          label="Phone"
          value={phone}
          onChange={setPhone}
          placeholder="(555) 555-1234"
        />
      </FieldRow>

      <FieldRow>
        <SelectField
          label="Role"
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
        />
        <SelectField
          label="Shift Preference"
          value={shift}
          onChange={setShift}
          options={SHIFT_OPTIONS}
        />
      </FieldRow>

      <SelectField
        label="Reports To"
        value={managerId}
        onChange={setManagerId}
        options={managerOptions}
        help="Leave as 'No manager' if this member doesn't report to anyone yet."
      />

      <ChipMultiSelect
        label="Departments"
        options={DEPARTMENT_OPTIONS}
        selected={departments}
        onChange={setDepartments}
        help="Pick every department this member works in."
      />

      <Toggle
        label="Admin badge"
        value={isAdmin}
        onChange={setIsAdmin}
        help="Shows the Admin badge in the roster. Does NOT grant superuser access."
      />
      {isEdit && (
        <Toggle
          label="Active"
          value={isActive}
          onChange={setIsActive}
          help="Inactive members are hidden from the roster but can be reactivated."
        />
      )}
    </FormModal>
  );
};

export default MemberFormModal;
