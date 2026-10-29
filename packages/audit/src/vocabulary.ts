// The audit vocabulary: what an event row can say. `event_code` holds an
// action and `outcome` holds where that action ended up, so a query filters on
// the two independently instead of matching `-success`/`-failure` suffixes.

export const AUDIT_ACTIONS = [
  // Integrations. Workflow-backed: the controller writes `requested`, the
  // workflow engine writes the terminal outcome under the same operation id.
  'request-create',
  'request-update',
  'request-delete',
  'request-restore',
  // A step inside a workflow operation, never its terminal outcome.
  'request-plan',
  // The one rejection that is audited: a user hitting the daily request limit, a sign of abusive usage.
  'request-limit-reached',
  'email-submission',
  'transfer-of-ownership',
  'logs-download',

  // Team and organization API accounts. Workflow-backed, like integrations.
  'api-account-create',
  'api-account-delete',
  'api-account-restore',

  // Secrets. `secret-rotate` is an inline operation; `credentials-view` is a
  // single strict row written before the secret is returned.
  'secret-rotate',
  'credentials-view',

  // Client roles and their assignments. Inline operations.
  'role-create',
  'role-update',
  'role-delete',
  'role-composite-update',
  'role-assign',
  'role-unassign',
  // Batch parents. Children carry `parent_operation_id` pointing at these.
  'role-bulk-create',
  'role-bulk-update',
  'role-replicate',

  // SDX.
  'sdx-request-create',
  'sdx-access-request-update',

  // Teams.
  'team-create',
  'team-update',
  'team-delete',
  'team-member-add',
  'team-member-remove',
  'team-member-role-update',

  // Users.
  'user-create',
  'user-update',
  'user-delete',
  'user-profile-update',

  // Organizations.
  'organization-create',
  'organization-update',
  'organization-delete',
  'organization-member-add',
  'organization-member-remove',
  'organization-member-role-update',
  'organization-team-invite',
  'organization-team-join',
  'organization-team-decline',
  'organization-team-leave',
  'organization-consent-update',
  'organization-overrides-update',
] as const;

export type AuditAction = typeof AUDIT_ACTIONS[number];

// Actions that exist in released rows but are never written again. The
// migration only splits `-success`/`-failure` off a code, so anything whose
// name changed stays here for readers to recognise. `request-apply` cannot be
// told apart into create and update mechanically; `team-admin-removal` is
// covered by `team-member-remove` and `team-member-role-update`.
export const LEGACY_AUDIT_ACTIONS = [
  'request-apply',
  'request-pr',
  'team-admin-removal',
  'organization-member-added',
  'organization-member-removed',
  'organization-member-role-updated',
  'organization-team-invited',
  'organization-team-joined',
  'organization-team-declined',
  'organization-team-left',
  'organization-consent-updated',
  'organization-overrides-updated',
] as const;

export type LegacyAuditAction = typeof LEGACY_AUDIT_ACTIONS[number];

// The workflow engine owns the terminal outcome of these. The hanging-operation
// alerts use a longer threshold for them than for inline operations.
export const WORKFLOW_ACTIONS = [
  'request-create',
  'request-update',
  'request-delete',
  'request-restore',
  'api-account-create',
  'api-account-delete',
  'api-account-restore',
] as const;

export type WorkflowAction = typeof WORKFLOW_ACTIONS[number];

// Compile-time check that every workflow action is a current action.
const _workflowActionsAreActions: readonly AuditAction[] = WORKFLOW_ACTIONS;
void _workflowActionsAreActions;

export const OUTCOMES = ['requested', 'success', 'failure', 'superseded'] as const;

export type Outcome = typeof OUTCOMES[number];

// Every `requested` row is answered by exactly one of these.
export type TerminalOutcome = Exclude<Outcome, 'requested'>;

export const TARGET_TYPES = [
  // A Keycloak user, identified by its normalized username.
  'user',
  // A Keycloak service account user, identified by its normalized username
  // (`service-account-<client id>`).
  'service-account',
  // A row in the app's `users` table, identified by its id. Kept apart from
  // `user` so one target id never means two different things.
  'app-user',
  'role',
  'team',
  'integration',
  'organization',
] as const;

export type TargetType = typeof TARGET_TYPES[number];

export const ENVIRONMENTS = ['dev', 'test', 'prod'] as const;

export type Environment = typeof ENVIRONMENTS[number];

const includes = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value);

export const isAuditAction = (value: unknown): value is AuditAction => includes(AUDIT_ACTIONS, value);
export const isLegacyAuditAction = (value: unknown): value is LegacyAuditAction =>
  includes(LEGACY_AUDIT_ACTIONS, value);
export const isWorkflowAction = (value: unknown): value is WorkflowAction => includes(WORKFLOW_ACTIONS, value);
export const isOutcome = (value: unknown): value is Outcome => includes(OUTCOMES, value);
export const isTargetType = (value: unknown): value is TargetType => includes(TARGET_TYPES, value);
export const isEnvironment = (value: unknown): value is Environment => includes(ENVIRONMENTS, value);
