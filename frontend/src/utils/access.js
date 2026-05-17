const MANAGER_ROLES = new Set([
  'manager',
  'shift_lead',
  'shift_leader',
  'director',
  'admin',
]);

export const isManagerOrAbove = (user) => {
  const role = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : '';
  return MANAGER_ROLES.has(role);
};

// Admin / superuser gate — mirrors the backend's `is_admin_or_above`.
// Used for store-wide configuration screens: Edit Tracks, Operator
// Overview (weekly digest), User Management.
//
// Source-of-truth checks are the camelCase fields populated by App.js
// (`isAdmin`, `isSuperuser`); falls back to role==='admin'|'director' for
// legacy fixtures where the badge wasn't set.
export const isAdminOrAbove = (user) => {
  if (!user) return false;
  if (user.isSuperuser || user.isAdmin) return true;
  const role = typeof user?.role === 'string' ? user.role.trim().toLowerCase() : '';
  return role === 'admin' || role === 'director';
};

