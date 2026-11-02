// What every api write route records. The coverage check (zz.audit-coverage.test.ts) requires an entry for
// every route in routes.ts that handles POST, PUT, DELETE or PATCH, and for every GET route seen writing.
//
//   actions   – each must be recorded (requested or success) by some test's request to the route.
//   unaudited – why the route writes no event.

export type CoverageEntry = { actions: string[] } | { unaudited: string };

const INTEGRATION = '/integrations/:integrationId/:environment';

export const AUDIT_COVERAGE: Record<string, CoverageEntry> = {
  'POST /token': { unaudited: "Exchanges an API account's credentials for an access token: nothing changes." },

  [`POST ${INTEGRATION}/roles`]: { actions: ['role-create'] },
  [`PUT ${INTEGRATION}/roles/:roleName`]: { actions: ['role-update'] },
  [`DELETE ${INTEGRATION}/roles/:roleName`]: { actions: ['role-delete'] },
  [`POST ${INTEGRATION}/roles/:roleName/composite-roles`]: { actions: ['role-composite-update'] },
  [`DELETE ${INTEGRATION}/roles/:roleName/composite-roles/:compositeRoleName`]: {
    actions: ['role-composite-update'],
  },

  [`POST ${INTEGRATION}/user-role-mappings`]: { actions: ['role-assign', 'role-unassign'] },
  [`POST ${INTEGRATION}/users/:username/roles`]: { actions: ['role-assign', 'role-bulk-update'] },
  [`POST ${INTEGRATION}/users/:username/roles-new`]: { actions: ['role-assign'] },
  [`DELETE ${INTEGRATION}/users/:username/roles/:roleName`]: { actions: ['role-unassign'] },

  [`GET ${INTEGRATION}/logs`]: { actions: ['logs-download'] },
};
