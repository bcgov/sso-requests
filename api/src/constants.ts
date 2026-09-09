export const ENVIRONMENTS = ['dev', 'test', 'prod'] as const;

export type Environment = typeof ENVIRONMENTS[number];

export const isValidEnvironment = (value: unknown): value is Environment =>
  typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);

export const RESOURCES = {
  ROLES: 'roles',
  USER_ROLE_MAPPINGS: 'user-role-mappings',
  INTEGRATIONS: 'integrations',
  IDP_USERS: 'idp-users',
} as const;

export const ACTIONS = {
  READ: 'read',
  WRITE: 'write',
} as const;

export type Resource = typeof RESOURCES[keyof typeof RESOURCES];
export type Action = typeof ACTIONS[keyof typeof ACTIONS];

export const ORGANIZATION_ROLES = ['none', 'viewer', 'role-manager', 'editor'] as const;

export type OrganizationRole = typeof ORGANIZATION_ROLES[number];

export const isValidOrganizationRole = (value: unknown): value is OrganizationRole =>
  typeof value === 'string' && (ORGANIZATION_ROLES as readonly string[]).includes(value);

export const LEVEL_RANK: Record<OrganizationRole, number> = {
  none: 0,
  viewer: 1,
  'role-manager': 2,
  editor: 3,
};

// Each rung adds to the one below it. idp-users:read sits in role-manager
// because a role cannot be assigned without first looking the user up.
const LEVEL_ADDS: Record<OrganizationRole, string[]> = {
  none: [],
  viewer: ['roles:read', 'user-role-mappings:read', 'integrations:read'],
  'role-manager': ['roles:write', 'user-role-mappings:write', 'idp-users:read'],
  editor: ['integrations:write'],
};

export const LEVEL_PERMISSIONS: Record<OrganizationRole, Set<string>> = ORGANIZATION_ROLES.reduce((acc, level) => {
  const inherited = ORGANIZATION_ROLES.filter((candidate) => LEVEL_RANK[candidate] <= LEVEL_RANK[level]);
  acc[level] = new Set(inherited.flatMap((candidate) => LEVEL_ADDS[candidate]));
  return acc;
}, {} as Record<OrganizationRole, Set<string>>);

export const levelGrants = (level: OrganizationRole, resource: string, action: string) =>
  LEVEL_PERMISSIONS[level].has(`${resource}:${action}`);

export const minLevel = (a: OrganizationRole, b: OrganizationRole): OrganizationRole =>
  LEVEL_RANK[a] <= LEVEL_RANK[b] ? a : b;
