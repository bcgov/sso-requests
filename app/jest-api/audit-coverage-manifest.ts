// What every app write route records. The coverage check (zz.audit-coverage.test.ts) requires an entry for
// every route under pages/api that handles POST, PUT, DELETE or PATCH, and for every GET route seen writing.
//
//   actions   – each must be recorded (requested or success) by some test's request to the route.
//   unaudited – why the route writes no event. A read sent as POST counts here too.

export type CoverageEntry = { actions: string[] } | { unaudited: string };

const READ_AS_POST = 'A read sent as POST: nothing changes.';
const USER_IMPORT =
  'Imports an IDIR user into Keycloak ahead of a role grant. The grant itself is audited (role-assign); the import is not.';

export const AUDIT_COVERAGE: Record<string, CoverageEntry> = {
  // Integrations
  'PUT /api/requests': { actions: ['request-create', 'request-update'] },
  'DELETE /api/requests': { actions: ['request-delete'] },
  'POST /api/requests': {
    unaudited:
      'Creates a draft, which reaches nothing outside the app until it is submitted (PUT /api/requests?submit). A refusal at the daily limit is recorded as request-limit-reached.',
  },
  'POST /api/requests/[id]/restore': { actions: ['request-restore'] },
  'GET /api/requests/[id]/resubmit': { actions: ['request-update'] },
  'GET /api/requests/[id]/logs': { actions: ['logs-download'] },
  'PUT /api/request-metadata': { actions: ['request-status-update'] },
  'PUT /api/requests/[id]/sdx-allowed-access': { actions: ['sdx-access-request-update'] },
  'POST /api/installation': { actions: ['credentials-view'] },
  'PUT /api/installation': { actions: ['secret-rotate'] },

  // Roles
  'PUT /api/keycloak/roles': { actions: ['role-create'] },
  'POST /api/keycloak/bulk-roles': { actions: ['role-bulk-create', 'role-create'] },
  'POST /api/keycloak/delete-role': { actions: ['role-delete'] },
  'POST /api/keycloak/set-composite-roles': { actions: ['role-composite-update'] },
  'PUT /api/keycloak/user-roles': { actions: ['role-assign', 'role-unassign', 'role-bulk-update'] },
  'POST /api/keycloak/role-replicate': { actions: ['role-replicate'] },

  // Teams and their API accounts
  'POST /api/teams': { actions: ['team-create', 'team-member-add'] },
  'PUT /api/teams/[teamId]': { actions: ['team-update'] },
  'DELETE /api/teams/[teamId]': { actions: ['team-delete', 'team-member-remove'] },
  'POST /api/teams/[teamId]/members': { actions: ['team-member-add'] },
  'PUT /api/teams/[teamId]/members/[memberId]': { actions: ['team-member-role-update'] },
  'DELETE /api/teams/[teamId]/members/[memberId]': { actions: ['team-member-remove'] },
  'POST /api/teams/[teamId]/service-accounts': { actions: ['api-account-create'] },
  'DELETE /api/teams/[teamId]/service-accounts/[saId]': { actions: ['api-account-delete'] },
  'GET /api/teams/[teamId]/service-accounts/[saId]/restore': { actions: ['api-account-restore'] },
  'GET /api/teams/[teamId]/service-accounts/[saId]/credentials': { actions: ['credentials-view'] },
  'PUT /api/teams/[teamId]/service-accounts/[saId]/credentials': { actions: ['secret-rotate'] },

  // Organizations, and teams' side of them
  'POST /api/organizations': { actions: ['organization-create'] },
  'PUT /api/organizations/[orgId]': { actions: ['organization-update'] },
  'DELETE /api/organizations/[orgId]': { actions: ['organization-delete'] },
  'POST /api/organizations/[orgId]/members': { actions: ['organization-member-add'] },
  'PUT /api/organizations/[orgId]/members/[userId]': { actions: ['organization-member-role-update'] },
  'DELETE /api/organizations/[orgId]/members/[userId]': { actions: ['organization-member-remove'] },
  'POST /api/organizations/[orgId]/teams': { actions: ['organization-team-invite'] },
  'DELETE /api/organizations/[orgId]/teams/[teamId]': { actions: ['organization-team-leave'] },
  'POST /api/organizations/[orgId]/api-accounts': { actions: ['api-account-create'] },
  'DELETE /api/organizations/[orgId]/api-accounts/[accountId]': { actions: ['api-account-delete'] },
  'GET /api/organizations/[orgId]/api-accounts/[accountId]/credentials': { actions: ['credentials-view'] },
  'PUT /api/organizations/[orgId]/api-accounts/[accountId]/credentials': { actions: ['secret-rotate'] },
  'POST /api/teams/[teamId]/organizations/[orgId]': {
    actions: ['organization-team-join', 'organization-team-decline'],
  },
  'PUT /api/teams/[teamId]/organizations/[orgId]': { actions: ['organization-consent-update'] },
  'PUT /api/teams/[teamId]/organizations/[orgId]/overrides': { actions: ['organization-overrides-update'] },
  'DELETE /api/teams/[teamId]/organizations/[orgId]': { actions: ['organization-team-leave'] },

  // Users
  'POST /api/me': { actions: ['user-profile-update'] },
  'POST /api/delete-inactive-idir-users': { actions: ['user-delete'] },
  'POST /api/surveys': { unaudited: 'A satisfaction survey response, not a change to any resource.' },
  'POST /api/bceid-webservice/idir/import': { unaudited: USER_IMPORT },
  'POST /api/ms-graph/idir/import': { unaudited: USER_IMPORT },

  // Writes made by scheduled jobs through GET
  'GET /api/processRequestQueue': {
    unaudited:
      "Runs workflows already requested elsewhere. Their outcomes are recorded by the engine, under each operation's own id.",
  },
  'GET /api/cleanupCssApiUsage': {
    unaudited: 'Retention housekeeping: deletes CSS API usage metrics older than six months.',
  },
  'GET /api/ms-graph/refreshApplicationKeyCredentials': {
    unaudited:
      'Rotates the realm key Keycloak signs Entra client assertions with. Not yet audited; its outcome is in the job logs.',
  },

  // Reads sent as POST
  'POST /api/request': { unaudited: READ_AS_POST },
  'POST /api/requests-all': { unaudited: READ_AS_POST },
  'POST /api/events': { unaudited: READ_AS_POST },
  'POST /api/keycloak/roles': { unaudited: READ_AS_POST },
  'POST /api/keycloak/role': { unaudited: READ_AS_POST },
  'POST /api/keycloak/role-users': { unaudited: READ_AS_POST },
  'POST /api/keycloak/get-composite-roles': { unaudited: READ_AS_POST },
  'POST /api/keycloak/user-roles': { unaudited: READ_AS_POST },
  'POST /api/keycloak/users': { unaudited: READ_AS_POST },
  'POST /api/bceid-webservice/idir/search': { unaudited: READ_AS_POST },
  'POST /api/ms-graph/idir/search': { unaudited: READ_AS_POST },
};
