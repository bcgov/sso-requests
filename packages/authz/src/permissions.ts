// The permission vocabulary. Every grant and every ceiling stores a subset of
// this list, and the database CHECK constraints in db/src/migrations carry a
// frozen copy of it.
//
// Two kinds of permission live here. The first nine are what a team role or an
// organization link can confer, and the only ones an organization-facing
// preset may contain. The rest are admin-scoped: they resolve from Keycloak
// client roles (`commonPermissionsForAppRoles` in the app) and no team role,
// preset or stored consent ever grants them — `team-admin` is an enumerated
// list precisely so that adding one here changes nothing for a team admin.
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

  // Admin-scoped. Field authority over an integration's approval flags, one
  // per IdP family, held by that family's approver role and by sso-admin.
  'integrations:approve-bceid',
  'integrations:approve-github',
  'integrations:approve-bcsc',
  'integrations:approve-social',
  'integrations:approve-otp',
  // Session and token lifetimes, across every environment at once.
  'integrations:write-lifespans',
  // A custom SAML client id.
  'integrations:write-client-id',
  // Adding an IdP that is restricted (githubpublic, otp) or discontinued.
  'integrations:add-restricted-idps',
  // Deleting an integration while it is submitted or planned — the one way
  // through the state machine that is not open to its owner.
  'integrations:delete-in-flight',
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
  // Admin-scoped actions. See PERMISSIONS.
  APPROVE_BCEID: 'approve-bceid',
  APPROVE_GITHUB: 'approve-github',
  APPROVE_BCSC: 'approve-bcsc',
  APPROVE_SOCIAL: 'approve-social',
  APPROVE_OTP: 'approve-otp',
  WRITE_LIFESPANS: 'write-lifespans',
  WRITE_CLIENT_ID: 'write-client-id',
  ADD_RESTRICTED_IDPS: 'add-restricted-idps',
  DELETE_IN_FLIGHT: 'delete-in-flight',
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];

// The permissions a team role or organization link may confer. Everything
// else in PERMISSIONS is admin-scoped and reaches an actor only through an
// app role.
export const TEAM_SCOPED_PERMISSIONS: readonly Permission[] = [
  'integrations:read',
  'integrations:write',
  'integrations:delete',
  'integrations:reassign-team',
  'roles:read',
  'roles:write',
  'user-role-mappings:read',
  'user-role-mappings:write',
  'idp-users:read',
];

export const isValidPermission = (value: unknown): value is Permission =>
  typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);

export const isValidPermissionSet = (value: unknown): value is Permission[] =>
  Array.isArray(value) && value.every(isValidPermission);
