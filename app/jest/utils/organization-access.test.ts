import { buildOrganizationAccess, getOrganizationAccessForIntegrations } from '@app/queries/organization';
import {
  canCreateOrDeleteRoles,
  canDeleteIntegration,
  canEditIntegration,
  canManageRoleAssignments,
  getAccessibleEnvironments,
} from '@app/helpers/permissions';

const mockMemberFindAll = jest.fn();
const mockLinkFindAll = jest.fn();
const mockCeilingFindAll = jest.fn();

jest.mock('@app/shared/sequelize/models/models', () => ({
  models: {
    organizationMember: { findAll: (...args: any[]) => mockMemberFindAll(...args) },
    organizationTeam: { findAll: (...args: any[]) => mockLinkFindAll(...args) },
    organizationTeamCeiling: { findAll: (...args: any[]) => mockCeilingFindAll(...args) },
  },
}));
jest.mock('sequelize', () => ({ Op: { in: Symbol('in') } }));

const integration = (organizationAccess: any, userTeamRole?: string) =>
  ({
    id: 10,
    status: 'applied',
    usesTeam: true,
    teamId: 20,
    environments: ['dev', 'prod'],
    organizationAccess,
    userTeamRole,
  } as any);

describe('organization-derived integration access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caps organization members at viewer and honors explicit environment none', () => {
    const access = buildOrganizationAccess({
      organizationId: 1,
      organizationRole: 'member',
      integrationId: 10,
      environments: ['dev', 'prod'],
      ceilings: [{ level: 'editor' }, { integrationId: 10, environment: 'prod', level: 'none' }],
    });

    expect(access.defaultLevel).toBe('viewer');
    expect(access.environmentLevels).toEqual({ dev: 'viewer', prod: 'none' });
    expect(getAccessibleEnvironments(integration(access))).toEqual(['dev']);
    expect(canEditIntegration(integration(access))).toBe(false);
    expect(canCreateOrDeleteRoles(integration(access), 'dev')).toBe(false);
  });

  it('caps organization admins at editor while preserving more specific role-manager ceilings', () => {
    const access = buildOrganizationAccess({
      organizationId: 1,
      organizationRole: 'admin',
      integrationId: 10,
      environments: ['dev', 'prod'],
      ceilings: [{ level: 'editor' }, { integrationId: 10, environment: 'prod', level: 'role-manager' }],
    });
    const request = integration(access);

    expect(access.environmentLevels).toEqual({ dev: 'editor', prod: 'role-manager' });
    expect(canCreateOrDeleteRoles(request, 'prod')).toBe(true);
    expect(canManageRoleAssignments(request, 'prod')).toBe(true);
    expect(canEditIntegration(request)).toBe(false);
    expect(canDeleteIntegration(request)).toBe(false);
  });

  it('uses integration ceilings before team-wide environment ceilings', () => {
    const access = buildOrganizationAccess({
      organizationId: 1,
      organizationRole: 'admin',
      integrationId: 10,
      environments: ['prod'],
      ceilings: [
        { level: 'editor' },
        { environment: 'prod', level: 'viewer' },
        { integrationId: 10, level: 'role-manager' },
      ],
    });

    expect(access.environmentLevels.prod).toBe('role-manager');
  });

  it('does not reduce native team permissions when the organization ceiling is none', () => {
    const access = buildOrganizationAccess({
      organizationId: 1,
      organizationRole: 'member',
      integrationId: 10,
      environments: ['dev', 'prod'],
      ceilings: [{ level: 'none' }],
    });
    const request = integration(access, 'admin');

    expect(canEditIntegration(request)).toBe(true);
    expect(canDeleteIntegration(request)).toBe(true);
    expect(canCreateOrDeleteRoles(request, 'prod')).toBe(true);
    expect(getAccessibleEnvironments(request)).toEqual(['dev', 'prod']);
  });

  it('grants nothing for pending memberships or pending team links', async () => {
    mockMemberFindAll.mockResolvedValueOnce([]);
    await expect(
      getOrganizationAccessForIntegrations(7, [{ id: 10, usesTeam: true, teamId: 20, environments: ['dev'] }]),
    ).resolves.toEqual(new Map());
    expect(mockLinkFindAll).not.toHaveBeenCalled();

    mockMemberFindAll.mockResolvedValueOnce([{ organizationId: 1, role: 'admin' }]);
    mockLinkFindAll.mockResolvedValueOnce([]);
    await expect(
      getOrganizationAccessForIntegrations(7, [{ id: 10, usesTeam: true, teamId: 20, environments: ['dev'] }]),
    ).resolves.toEqual(new Map());
    expect(mockCeilingFindAll).not.toHaveBeenCalled();
  });

  it('recomputes changed ceilings on every authorization request', async () => {
    mockMemberFindAll.mockResolvedValue([{ organizationId: 1, role: 'admin' }]);
    mockLinkFindAll.mockResolvedValue([{ id: 30, organizationId: 1, teamId: 20 }]);
    mockCeilingFindAll
      .mockResolvedValueOnce([{ organizationTeamId: 30, level: 'editor' }])
      .mockResolvedValueOnce([{ organizationTeamId: 30, level: 'none' }]);
    const requests = [{ id: 10, usesTeam: true, teamId: 20, environments: ['dev'] }];

    const first = await getOrganizationAccessForIntegrations(7, requests);
    const second = await getOrganizationAccessForIntegrations(7, requests);

    expect(first.get(10)?.environmentLevels.dev).toBe('editor');
    expect(second.get(10)?.environmentLevels.dev).toBe('none');
    expect(mockCeilingFindAll).toHaveBeenCalledTimes(2);
  });
});
