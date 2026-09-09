import {
  getAuthorizedIntegration,
  redactOrganizationRestrictedEventDetails,
  redactOrganizationRestrictedFields,
} from '@app/queries/integrationAccess';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';
import { teamPermissions } from '@app/utils/authorize';

const mockRequestFindOne = jest.fn();
const mockMembershipFindOne = jest.fn();
const mockGetOrganizationAccess = jest.fn();

jest.mock('@app/shared/sequelize/models/models', () => ({
  models: {
    request: { findOne: (...args: any[]) => mockRequestFindOne(...args) },
    usersTeam: { findOne: (...args: any[]) => mockMembershipFindOne(...args) },
    user: {},
    team: {},
  },
}));

jest.mock('@app/queries/organization', () => ({
  getOrganizationAccessForIntegration: (...args: any[]) => mockGetOrganizationAccess(...args),
  getOrganizationAccessForIntegrations: jest.fn(),
}));

const request = {
  id: 10,
  usesTeam: true,
  teamId: 20,
  apiServiceAccount: false,
  archived: false,
  environments: ['dev', 'prod'],
};

describe('server integration authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestFindOne.mockResolvedValue({ ...request });
    mockMembershipFindOne.mockResolvedValue(null);
    mockGetOrganizationAccess.mockResolvedValue(undefined);
  });

  it('allows native team permissions independently of an organization ceiling', async () => {
    mockMembershipFindOne.mockResolvedValue({ role: 'member' });

    await expect(
      getAuthorizedIntegration(7, 10, {
        resource: API_RESOURCES.INTEGRATIONS,
        action: API_ACTIONS.WRITE,
        everyEnvironment: true,
        nativeTeamPermission: teamPermissions.UPDATE_REQUEST,
      }),
    ).resolves.toMatchObject({ id: 10, userTeamRole: 'member' });
    expect(mockGetOrganizationAccess).not.toHaveBeenCalled();
  });

  it('enforces environment ceilings and every-environment integration writes', async () => {
    mockGetOrganizationAccess.mockResolvedValue({
      defaultLevel: 'editor',
      effectiveLevel: 'editor',
      environmentLevels: { dev: 'editor', prod: 'role-manager' },
    });

    await expect(
      getAuthorizedIntegration(7, 10, {
        resource: API_RESOURCES.INTEGRATIONS,
        action: API_ACTIONS.WRITE,
        everyEnvironment: true,
      }),
    ).resolves.toBeNull();

    await expect(
      getAuthorizedIntegration(7, 10, {
        resource: API_RESOURCES.ROLES,
        action: API_ACTIONS.WRITE,
        environment: 'prod',
      }),
    ).resolves.toMatchObject({ id: 10 });
  });

  it('denies an environment-specific read when that environment is explicitly none', async () => {
    mockGetOrganizationAccess.mockResolvedValue({
      defaultLevel: 'viewer',
      effectiveLevel: 'viewer',
      environmentLevels: { dev: 'viewer', prod: 'none' },
    });

    await expect(
      getAuthorizedIntegration(7, 10, {
        resource: API_RESOURCES.INTEGRATIONS,
        action: API_ACTIONS.READ,
        environment: 'prod',
      }),
    ).resolves.toBeNull();
  });

  it('redacts fields and history changes for denied environments', () => {
    const organizationAccess = {
      defaultLevel: 'viewer',
      effectiveLevel: 'viewer',
      environmentLevels: { dev: 'viewer', prod: 'none' },
    };
    const integration = {
      ...request,
      devIdps: ['idir'],
      prodIdps: ['githubpublic'],
      prodValidRedirectUris: ['https://private.example'],
      organizationAccess,
    };

    expect(redactOrganizationRestrictedFields(integration)).toMatchObject({
      environments: ['dev'],
      devIdps: ['idir'],
    });
    expect(redactOrganizationRestrictedFields(integration)).not.toHaveProperty('prodIdps');
    expect(redactOrganizationRestrictedFields(integration)).not.toHaveProperty('prodValidRedirectUris');

    expect(
      redactOrganizationRestrictedEventDetails(
        {
          changes: [
            { path: ['devIdps'], rhs: ['idir'] },
            { path: ['prodIdps'], rhs: ['githubpublic'] },
            { path: ['projectName'], rhs: 'Visible' },
          ],
        },
        integration,
      ),
    ).toEqual({
      changes: [
        { path: ['devIdps'], rhs: ['idir'] },
        { path: ['projectName'], rhs: 'Visible' },
      ],
    });
  });
});
