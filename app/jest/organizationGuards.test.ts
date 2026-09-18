import { PRESETS } from '@sso/authz';
import { Integration } from 'interfaces/Request';
import {
  canCreateOrDeleteRoles,
  canDeleteIntegration,
  canEditIntegration,
  canManageUserRoleMappings,
} from '@app/helpers/permissions';

/**
 * What the dashboard offers someone who reaches an integration through an
 * organization. They hold no team role at all, so the guards answer from the
 * permissions the server resolved onto the row: a viewer is shown the
 * integration and nothing they may press, and a role manager is shown role
 * management although they may not touch the integration itself.
 */
const integration = (permissions: any, overrides: Partial<Integration> = {}): Integration =>
  ({
    id: 1,
    status: 'applied',
    archived: false,
    apiServiceAccount: false,
    usesTeam: true,
    teamId: 7,
    userTeamRole: null,
    permissions,
    ...overrides,
  } as unknown as Integration);

const guards = (row: Integration) => ({
  edit: canEditIntegration(row),
  delete: canDeleteIntegration(row),
  roles: canCreateOrDeleteRoles(row),
  roleMappings: canManageUserRoleMappings(row),
});

describe('what an organization may press', () => {
  it.each([
    ['viewer', PRESETS.viewer, { edit: false, delete: false, roles: false, roleMappings: false }],
    ['role-manager', PRESETS['role-manager'], { edit: false, delete: false, roles: true, roleMappings: true }],
    ['editor', PRESETS.editor, { edit: true, delete: true, roles: false, roleMappings: false }],
    ['admin', PRESETS.admin, { edit: true, delete: true, roles: true, roleMappings: true }],
    ['no access', [], { edit: false, delete: false, roles: false, roleMappings: false }],
  ])('answers every guard from a %s consent', (_name, permissions, expected) => {
    expect(guards(integration(permissions))).toEqual(expected);
  });

  it('still refuses everything while the integration is in flight', () => {
    const inFlight = integration(PRESETS.admin, { status: 'submitted' });
    expect(canEditIntegration(inFlight)).toBe(false);
    expect(canDeleteIntegration(inFlight)).toBe(false);
    expect(canCreateOrDeleteRoles(inFlight)).toBe(false);
  });

  /**
   * A row that never passed through the resolver — a shape a caller built for
   * itself — is answered by the team role, as it was before organizations.
   */
  it('falls back to the team role on a row carrying no permissions', () => {
    const teamMember = integration(undefined, { userTeamRole: 'member' } as Partial<Integration>);
    expect(guards(teamMember)).toEqual({ edit: true, delete: false, roles: false, roleMappings: true });

    const teamAdmin = integration(undefined, { userTeamRole: 'admin' } as Partial<Integration>);
    expect(guards(teamAdmin)).toEqual({ edit: true, delete: true, roles: true, roleMappings: true });
  });
});
