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
