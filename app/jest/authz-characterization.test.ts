import { Integration } from 'interfaces/Request';
import { Status } from 'interfaces/types';
import { canCreateOrDeleteRoles, canDeleteIntegration, canEditIntegration } from '@app/helpers/permissions';
import { hasAnyPendingStatus } from 'utils/helpers';
import { appPermissions, getAllAppPermissions, hasTeamPermission, teamPermissions } from '@app/utils/authorize';

/**
 * Characterization tests for the client-side authorization vocabulary on `dev`, recorded before
 * the authorization rewrite begins. They describe what the code does today, not what it should do.
 *
 * The server-side counterpart is jest-api/33.authz-characterization.
 */

const ALL_STATUSES: Status[] = [
  'draft',
  'submitted',
  'pr',
  'prFailed',
  'planned',
  'planFailed',
  'applied',
  'applyFailed',
];

const integration = (overrides: Partial<Integration> = {}): Integration =>
  ({
    id: 1,
    status: 'applied',
    archived: false,
    apiServiceAccount: false,
    usesTeam: false,
    ...overrides,
  } as Integration);

describe('status guards (dev baseline)', () => {
  /**
   * Three guards, three different status lists, no two alike — plus `hasAnyPendingStatus`, which
   * is a fourth. Reading the columns across is the argument for a single transition table: there
   * is no status for which all four agree on what is in flight.
   *
   *   status        delete   edit    roles   pending
   *   ------------------------------------------------
   *   draft           Y       Y       Y        N
   *   submitted       N       N       N        Y
   *   pr              Y       N       N        Y
   *   prFailed        Y       N       Y        Y
   *   planned         N       N       N        Y
   *   planFailed      N       N       Y        Y
   *   applied         Y       Y       Y        N
   *   applyFailed     N       N       Y        Y
   */
  const table: Record<Status, { canDelete: boolean; canEdit: boolean; canManageRoles: boolean; pending: boolean }> = {
    draft: { canDelete: true, canEdit: true, canManageRoles: true, pending: false },
    submitted: { canDelete: false, canEdit: false, canManageRoles: false, pending: true },
    pr: { canDelete: true, canEdit: false, canManageRoles: false, pending: true },
    prFailed: { canDelete: true, canEdit: false, canManageRoles: true, pending: true },
    planned: { canDelete: false, canEdit: false, canManageRoles: false, pending: true },
    planFailed: { canDelete: false, canEdit: false, canManageRoles: true, pending: true },
    applied: { canDelete: true, canEdit: true, canManageRoles: true, pending: false },
    applyFailed: { canDelete: false, canEdit: false, canManageRoles: true, pending: true },
  };

  it.each(ALL_STATUSES)('pins every guard for status %s', (status) => {
    const request = integration({ status });
    expect({
      canDelete: canDeleteIntegration(request),
      canEdit: canEditIntegration(request),
      canManageRoles: canCreateOrDeleteRoles(request),
      pending: hasAnyPendingStatus([request]),
    }).toEqual(table[status]);
  });

  /**
   * BUG (F4): `planFailed` and `applyFailed` are editable by neither guard, so a user whose
   * integration failed can only delete it — and `canDeleteIntegration` says no to that too. The
   * server agrees (401); see the delete cases in jest-api/33.authz-characterization. Both flip
   * when every resting state becomes editable and deletable.
   */
  it('BUG (F4): a failed integration can be neither edited nor deleted', () => {
    for (const status of ['planFailed', 'applyFailed'] as Status[]) {
      const request = integration({ status });
      expect(canEditIntegration(request)).toBe(false);
      expect(canDeleteIntegration(request)).toBe(false);
    }
  });

  /**
   * F19: a fifth status list, and the only one containing 'approved' — which is not a member of
   * the `Status` union at all, so the entry can never match.
   */
  it('F19: hasAnyPendingStatus tests a status that does not exist', () => {
    expect(hasAnyPendingStatus([{ status: 'approved' } as unknown as Integration])).toBe(true);
    expect(ALL_STATUSES).not.toContain('approved');
  });

  it('archived and api-service-account integrations are refused by every guard', () => {
    for (const overrides of [{ archived: true }, { apiServiceAccount: true }]) {
      const request = integration(overrides);
      expect(canDeleteIntegration(request)).toBe(false);
      expect(canEditIntegration(request)).toBe(false);
      expect(canCreateOrDeleteRoles(request)).toBe(false);
    }
  });
});

describe('team-role gating (dev baseline)', () => {
  const teamIntegration = (userTeamRole?: string) =>
    integration({ usesTeam: true, teamId: 1, userTeamRole } as Partial<Integration>);

  it('restricts deleting a team integration to team admins', () => {
    expect(canDeleteIntegration(teamIntegration('admin'))).toBe(true);
    expect(canDeleteIntegration(teamIntegration('member'))).toBe(false);
    expect(canDeleteIntegration(teamIntegration(undefined))).toBe(false);
  });

  it('restricts managing roles on a team integration to team admins', () => {
    expect(canCreateOrDeleteRoles(teamIntegration('admin'))).toBe(true);
    expect(canCreateOrDeleteRoles(teamIntegration('member'))).toBe(false);
  });

  it('lets any team member edit a team integration', () => {
    expect(canEditIntegration(teamIntegration('member'))).toBe(true);
  });

  /**
   * A draft switched to team ownership before a team was picked has `teamId: null`, which skips
   * the team-permission branch entirely and lands on the unconditional `else`.
   */
  it('treats a team-less draft as personally owned', () => {
    // `teamId` is typed `number | string | undefined`, but the column really is null for these rows.
    const draft = integration({ status: 'draft', usesTeam: true, teamId: null } as unknown as Partial<Integration>);
    expect(canDeleteIntegration(draft)).toBe(true);
    expect(canEditIntegration(draft)).toBe(true);
  });

  it('pins the team role vocabulary', () => {
    expect(hasTeamPermission('member', teamPermissions.UPDATE_REQUEST)).toBe(true);
    expect(hasTeamPermission('member', teamPermissions.DELETE_REQUEST)).toBe(false);
    expect(hasTeamPermission('member', teamPermissions.MANAGE_ROLES)).toBe(false);
    expect(hasTeamPermission('member', teamPermissions.ADD_MEMBER)).toBe(false);

    expect(hasTeamPermission('admin', teamPermissions.UPDATE_REQUEST)).toBe(true);
    expect(hasTeamPermission('admin', teamPermissions.DELETE_REQUEST)).toBe(true);
    expect(hasTeamPermission('admin', teamPermissions.MANAGE_ROLES)).toBe(true);
    expect(hasTeamPermission('admin', teamPermissions.ADD_MEMBER)).toBe(true);

    expect(hasTeamPermission(undefined, teamPermissions.UPDATE_REQUEST)).toBe(false);
    expect(hasTeamPermission('not-a-role', teamPermissions.UPDATE_REQUEST)).toBe(false);
  });
});

/**
 * The app-role vocabulary. This is the authority that has to survive being resolved into the
 * common permission set: after the rewrite, a session carrying these client roles must end up
 * with an equivalent `Permission[]`, and nothing more.
 */
describe('app-role permission expansion (dev baseline)', () => {
  const APPROVER_BASE = [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
  ];

  it.each([
    ['guest', [appPermissions.VIEW_TERMS_AND_CONDITIONS]],
    ['user', [appPermissions.VIEW_MY_DASHBOARD]],
    ['bceid-approver', [...APPROVER_BASE, appPermissions.APPROVE_BCEID]],
    ['github-approver', [...APPROVER_BASE, appPermissions.APPROVE_GITHUB]],
    ['social-approver', [...APPROVER_BASE, appPermissions.APPROVE_SOCIAL]],
    ['otp-approver', [...APPROVER_BASE, appPermissions.APPROVE_OTP]],
    ['bc-services-card-approver', [...APPROVER_BASE, appPermissions.APPROVE_BC_SERVICES_CARD]],
  ])('expands %s to exactly its own permissions', (role, expected) => {
    expect(getAllAppPermissions([role as string]).sort()).toEqual([...(expected as string[])].sort());
  });

  it('expands sso-admin to the full admin set', () => {
    expect(getAllAppPermissions(['sso-admin']).sort()).toEqual(
      [
        appPermissions.VIEW_TEAMS,
        appPermissions.ADD_REQUEST_COMMENT,
        appPermissions.UPDATE_REQUEST_META_DATA,
        appPermissions.UPDATE_SAML_REQUEST_CLIENT_ID,
        appPermissions.ADD_RESTRICTED_IDPS,
        appPermissions.UPDATE_REQUEST_ADDITIONAL_SETTINGS,
        appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST,
        appPermissions.ADMIN_DASHBOARD_VIEW_ALL_REQUESTS,
        appPermissions.ADMIN_DASHBOARD_DELETE_REQUEST,
        appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS,
        appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES,
        appPermissions.ADMIN_DASHBOARD_VIEW_ROLES_USERS,
        appPermissions.ADMIN_DASHBOARD_RESTORE_REQUEST,
        appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST,
        appPermissions.VIEW_MY_DASHBOARD,
        appPermissions.VIEW_ADMIN_DASHBOARD,
        appPermissions.DOWNLOAD_ADMIN_REPORTS,
        appPermissions.ADMIN_DASHBOARD_VIEW_IDPS_FILTER,
        appPermissions.APPROVE_BC_SERVICES_CARD,
        appPermissions.APPROVE_OTP,
        appPermissions.APPROVE_GITHUB,
        appPermissions.APPROVE_BCEID,
        appPermissions.APPROVE_SOCIAL,
      ].sort(),
    );
  });

  it('unions the permissions of multiple roles and ignores unknown ones', () => {
    expect(getAllAppPermissions(['bceid-approver', 'github-approver']).sort()).toEqual(
      [...APPROVER_BASE, appPermissions.APPROVE_BCEID, appPermissions.APPROVE_GITHUB].sort(),
    );
    expect(getAllAppPermissions(['not-a-role'])).toEqual([]);
    expect(getAllAppPermissions([])).toEqual([]);
  });

  /**
   * No approver role carries any of the dashboard-wide permissions. This is the invariant that
   * `'team-admin': order([...PERMISSIONS])` would quietly break once approver permissions join
   * the shared vocabulary (F1) — which is why the preset has to become an explicit list before
   * any admin-scoped permission is added.
   */
  it('F1: no approver role carries an admin-dashboard permission', () => {
    const approverRoles = [
      'bceid-approver',
      'github-approver',
      'social-approver',
      'otp-approver',
      'bc-services-card-approver',
    ];
    for (const role of approverRoles) {
      const granted = getAllAppPermissions([role]);
      expect(granted).not.toContain(appPermissions.ADMIN_DASHBOARD_VIEW_ALL_REQUESTS);
      expect(granted).not.toContain(appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST);
      expect(granted).not.toContain(appPermissions.ADMIN_DASHBOARD_DELETE_REQUEST);
      expect(granted).not.toContain(appPermissions.ADD_RESTRICTED_IDPS);
    }
  });
});
