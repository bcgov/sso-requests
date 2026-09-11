// The permission vocabulary. Every grant and every ceiling stores a subset of
// this list, and the database CHECK constraints in db/src/migrations carry a
// frozen copy of it.
export const PERMISSIONS = [
  'integrations:read',
  'integrations:write',
  'integrations:delete',
  'integrations:reassign-team',
  'roles:read',
  'roles:write',
  'user-role-mappings:read',
  'user-role-mappings:write',
  'idp-users:read',
] as const;

export type Permission = typeof PERMISSIONS[number];

export const RESOURCES = {
  ROLES: 'roles',
  USER_ROLE_MAPPINGS: 'user-role-mappings',
  INTEGRATIONS: 'integrations',
  IDP_USERS: 'idp-users',
} as const;

export const ACTIONS = {
  READ: 'read',
  WRITE: 'write',
  // Deleting an integration is separate from editing it, and reassigning its
  // team separate again, because the team roles separate them: a member may
  // edit but not delete, and an organization may edit but never move an
  // integration out of the team that owns it.
  DELETE: 'delete',
  REASSIGN_TEAM: 'reassign-team',
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];

export const isValidPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);

export const isValidPermissionSet = (value: unknown): value is Permission[] =>
  Array.isArray(value) && value.every(isValidPermission);
