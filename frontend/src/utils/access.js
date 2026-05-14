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

