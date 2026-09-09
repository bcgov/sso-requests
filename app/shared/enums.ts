export const EVENTS = {
  REQUEST_PR_SUCCESS: 'request-pr-success',
  REQUEST_PR_FAILURE: 'request-pr-failure',
  REQUEST_PLAN_SUCCESS: 'request-plan-success',
  REQUEST_PLAN_FAILURE: 'request-plan-failure',
  REQUEST_APPLY_SUCCESS: 'request-apply-success',
  REQUEST_RESTORE_SUCCESS: 'request-restore-success',
  REQUEST_RESTORE_FAILURE: 'request-restore-failure',
  REQUEST_APPLY_FAILURE: 'request-apply-failure',
  REQUEST_CREATE_SUCCESS: 'request-create-success',
  REQUEST_CREATE_FAILURE: 'request-create-failure',
  REQUEST_UPDATE_SUCCESS: 'request-update-success',
  REQUEST_UPDATE_FAILURE: 'request-update-failure',
  REQUEST_DELETE_SUCCESS: 'request-delete-success',
  REQUEST_DELETE_FAILURE: 'request-delete-failure',
  EMAIL_SUBMISSION_FAILURE: 'email-submission-failure',
  REQUEST_LIMIT_REACHED: 'request-limit-reached',
  TEAM_API_ACCOUNT_DELETE_SUCCESS: 'api-account-delete-success',
  ORGANIZATION_CREATE_SUCCESS: 'organization-create-success',
  ORGANIZATION_UPDATE_SUCCESS: 'organization-update-success',
  ORGANIZATION_DELETE_SUCCESS: 'organization-delete-success',
  ORGANIZATION_MEMBER_ADDED: 'organization-member-added',
  ORGANIZATION_MEMBER_REMOVED: 'organization-member-removed',
  ORGANIZATION_MEMBER_ROLE_UPDATED: 'organization-member-role-updated',
  ORGANIZATION_TEAM_INVITED: 'organization-team-invited',
  ORGANIZATION_TEAM_JOINED: 'organization-team-joined',
  ORGANIZATION_TEAM_DECLINED: 'organization-team-declined',
  ORGANIZATION_TEAM_LEFT: 'organization-team-left',
  ORGANIZATION_CEILING_UPDATED: 'organization-ceiling-updated',
  ORGANIZATION_API_ACCOUNT_GRANTS_UPDATED: 'organization-api-account-grants-updated',
  TEAM_API_ACCOUNT_DELETE_FAILURE: 'api-account-delete-failure',
  LOGS_DOWNLOADED_SUCCESS: 'logs-download-success',
  LOGS_DOWNLOADED_FAILURE: 'logs-download-failure',
  TRANSFER_OF_OWNERSHIP_FAILURE: 'transfer-of-ownership-failure',
  TEAM_ADMIN_REMOVAL: 'team-admin-removal',
  SDX_ACCESS_REQUEST_UPDATE: 'sdx-access-request-update',
};

export const EMAILS = {
  PROD_APPROVED: 'prod-approved',
  CREATE_INTEGRATION_APPLIED: 'create-integration-applied',
  UPDATE_INTEGRATION_APPLIED: 'update-integration-applied',
  DELETE_INTEGRATION_SUBMITTED: 'delete-integration-submitted',
  TEAM_MEMBER_ADDED: 'team-member-added',
  TEAM_MEMBER_DELETED_ADMINS: 'team-member-deleted-admins',
  TEAM_MEMBER_DELETED_USER_REMOVED: 'team-member-deleted-user-removed',
  TEAM_DELETED: 'team-deleted',
  REQUEST_LIMIT_EXCEEDED: 'request-limit-exceeded',
  CREATE_TEAM_API_ACCOUNT_APPROVED: 'create-team-api-account-approved',
  DELETE_TEAM_API_ACCOUNT_SUBMITTED: 'delete-team-api-account-submitted',
  DELETE_INACTIVE_IDIR_USER: 'delete-inactive-idir-users',
  REMOVE_INACTIVE_IDIR_USER_FROM_TEAM: 'remove-inactive-idir-user-from-team',
  RESTORE_INTEGRATION: 'restore-integration',
  RESTORE_TEAM_API_ACCOUNT: 'restore-team-api-account',
  ORPHAN_INTEGRATION: 'orphan-integration',
  DISABLE_BCSC_IDP: 'disable-bcsc-idp',
};

export const REQUEST_TYPES = {
  INTEGRATION: 'integration',
  ROLE: 'role',
  CLIENT_SECRET: 'client-secret',
  COMPOSITE_ROLE: 'composite-role',
};

export const ACTION_TYPES = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

// Permission vocabulary shared by API account grants and organization consent
// ceilings. Kept in step with api/src/constants.ts.
export const API_RESOURCES = {
  ROLES: 'roles',
  USER_ROLE_MAPPINGS: 'user-role-mappings',
  INTEGRATIONS: 'integrations',
  IDP_USERS: 'idp-users',
} as const;

export const API_ACTIONS = {
  READ: 'read',
  WRITE: 'write',
} as const;

// Permission is chosen as one of a small ladder of levels rather than as
// individual resource/action pairs. The ladder is strictly nested, so comparing
// two levels is an ordering rather than a set operation.
export const LEVELS = ['none', 'viewer', 'role-manager', 'editor'] as const;

export type Level = typeof LEVELS[number];

export const LEVEL_RANK: Record<Level, number> = {
  none: 0,
  viewer: 1,
  'role-manager': 2,
  editor: 3,
};

export const LEVEL_LABELS: Record<Level, string> = {
  none: 'No access',
  viewer: 'Viewer',
  'role-manager': 'Role Manager',
  editor: 'Editor',
};

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  none: 'Cannot see or change anything.',
  viewer: 'Can view roles, role assignments and integration details.',
  'role-manager': 'Everything a Viewer can do, plus creating roles and assigning them to users.',
  editor: 'Everything a Role Manager can do, plus updating the integration itself.',
};

export const isValidLevel = (value: unknown): value is Level =>
  typeof value === 'string' && (LEVELS as readonly string[]).includes(value);
