/**
 * <MemberFormModal> — Add / Edit a team member.
 *
 * Renders a <FormModal> with all the editable fields for a User. Used by
 * Team Members directly and by Settings/User Management for the create flow:
 *
 *   • Add Member  → `member` prop is null. Default save POSTs to /team/members/.
 *   • Edit Member → `member` is the existing user shape. Default save PATCHes.
 *   • Admin Create → parent passes `onSavePayload` to save through /users/.
 *
 * Department slugs come from the model's DEPARTMENT_CHOICES list (stable
 * enums); weekly availability is a Mon-Sat schedule of time slots (see
 * <WeeklyAvailabilityEditor> for the data shape). The schedule is only
 * editable when `canEditAvailability` is true — the backend mirrors the
 * same rule and rejects writes from non-superusers.
 * Manager list is the `managers` prop so the parent can pre-load it once.
 */
import React, { useEffect, useMemo, useState } from 'react';
import teamService from '../services/team';
import {
  FormModal, TextField, SelectField, ChipMultiSelect, Toggle, FieldRow,
  WeeklyAvailabilityEditor, createEmptyWeeklyAvailability,
  normalizeWeeklyAvailability,
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


const MemberFormModal = ({
  isOpen,
  member,
  managers = [],
  onClose,
  onSaved,
  onSavePayload,
  canToggleAdmin = true,
  canEditAvailability = false,
  title,
  submitLabel,
}) => {
  const isEdit = !!member;

  // Form state — initialized from the member prop or blank defaults.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('team_member');
  // Weekly availability — recurring Mon-Sat schedule with one or more time
  // slots per day. Initialized to all-unavailable; backfilled from `member`
  // when editing an existing user.
  const [availability, setAvailability] = useState(() => createEmptyWeeklyAvailability());
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
      setAvailability(
        normalizeWeeklyAvailability(
          member.shiftPreference ?? member.shift_preference
        )
      );
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
      setAvailability(createEmptyWeeklyAvailability());
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
      department_slugs: departments,
      manager: managerId ? Number(managerId) : null,
      is_admin: !!isAdmin,
      is_active: !!isActive,
    };
    // Only send shift_preference when the viewer is allowed to change it.
    // Backend would reject it anyway (see serializers.py), but skipping the
    // field avoids a confusing error on the otherwise-valid save.
    if (canEditAvailability) {
      payload.shift_preference = availability;
    }
    try {
      const saved = onSavePayload
        ? await onSavePayload(payload, { member, isEdit })
        : isEdit
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
      title={title || (isEdit ? 'Edit Team Member' : 'Add Team Member')}
      submitLabel={submitLabel || (isEdit ? 'Save Changes' : 'Add Member')}
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

      <SelectField
        label="Role"
        value={role}
        onChange={setRole}
        options={ROLE_OPTIONS}
      />

      <WeeklyAvailabilityEditor
        label="Weekly Availability"
        value={availability}
        onChange={setAvailability}
        readOnly={!canEditAvailability}
        help={canEditAvailability
          ? 'Tap a day to set the hours this person is available. Add multiple time blocks for split shifts.'
          : undefined}
      />

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

      {canToggleAdmin && (
        <Toggle
          label="Admin access"
          value={isAdmin}
          onChange={setIsAdmin}
          help="Allows this user to manage app settings and users."
        />
      )}
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
