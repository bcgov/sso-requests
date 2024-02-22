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
  TEAM_API_ACCOUNT_DELETE_FAILURE: 'api-account-delete-failure',
  LOGS_DOWNLOADED_SUCCESS: 'logs-download-success',
  LOGS_DOWNLOADED_FAILURE: 'logs-download-failure',
};

export const EMAILS = {
  PROD_APPROVED: 'prod-approved',
  CREATE_INTEGRATION_SUBMITTED: 'create-integration-submitted',
  CREATE_INTEGRATION_APPLIED: 'create-integration-applied',
  UPDATE_INTEGRATION_SUBMITTED: 'update-integration-submitted',
  UPDATE_INTEGRATION_APPLIED: 'update-integration-applied',
  DELETE_INTEGRATION_SUBMITTED: 'delete-integration-submitted',
  TEAM_INVITATION: 'team-invitation',
  TEAM_MEMBER_DELETED_ADMINS: 'team-member-deleted-admins',
  TEAM_MEMBER_DELETED_USER_REMOVED: 'team-member-deleted-user-removed',
  TEAM_DELETED: 'team-deleted',
  REQUEST_LIMIT_EXCEEDED: 'request-limit-exceeded',
  CREATE_TEAM_API_ACCOUNT_SUBMITTED: 'create-team-api-account-submitted',
  CREATE_TEAM_API_ACCOUNT_APPROVED: 'create-team-api-account-approved',
  DELETE_TEAM_API_ACCOUNT_SUBMITTED: 'delete-team-api-account-submitted',
  DELETE_INACTIVE_IDIR_USER: 'delete-inactive-idir-users',
  SURVEY_COMPLETED: 'survey-completed-notification',
  RESTORE_INTEGRATION: 'restore-integration',
  RESTORE_TEAM_API_ACCOUNT: 'restore-team-api-account',
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
