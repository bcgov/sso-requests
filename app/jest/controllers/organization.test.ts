import { deleteOrganization } from '@app/controllers/organization';

const mockTransaction = {};
const mockOrganizationDestroy = jest.fn();
const mockRequestFindOne = jest.fn();
const mockRequestUpdate = jest.fn();
const mockGetOrganizationById = jest.fn();
const mockCreateEvent = jest.fn();

jest.mock('@app/shared/sequelize/models/models', () => ({
  sequelize: {
    transaction: jest.fn((callback) => callback(mockTransaction)),
  },
  models: {
    request: {
      findOne: (...args: any[]) => mockRequestFindOne(...args),
      update: (...args: any[]) => mockRequestUpdate(...args),
    },
  },
}));

jest.mock('sequelize', () => ({
  Op: { in: Symbol('in') },
}));

jest.mock('@app/utils/authorize', () => ({
  appPermissions: { MANAGE_ORGANIZATIONS: 'manage-organizations' },
  organizationPermissions: {},
  teamPermissions: {},
  hasAppPermission: jest.fn(() => true),
  hasOrganizationPermission: jest.fn(),
  hasTeamPermission: jest.fn(),
}));

jest.mock('@app/controllers/requests', () => ({
  checkIfRequestMerged: jest.fn(),
  createEvent: (...args: any[]) => mockCreateEvent(...args),
  processIntegrationRequest: jest.fn(),
}));

jest.mock('@app/keycloak/installation', () => ({
  generateInstallation: jest.fn(),
  updateClientSecret: jest.fn(),
}));

jest.mock('@app/queries/team', () => ({
  getTeamRoleByUserId: jest.fn(),
}));

jest.mock('@app/queries/apiAccountGrant', () => ({
  createGrants: jest.fn(),
  deleteGrantsForAccount: jest.fn(),
  getGrantsForAccount: jest.fn(),
}));

jest.mock('@app/queries/organization', () => ({
  fullCeiling: jest.fn(),
  getActiveLinkForTeam: jest.fn(),
  getCeilings: jest.fn(),
  getLinksForTeam: jest.fn(),
  getOrganizationById: (...args: any[]) => mockGetOrganizationById(...args),
  getOrganizationMember: jest.fn(),
  getOrganizationTeamLink: jest.fn(),
  isWithinCeiling: jest.fn(),
  replaceCeilings: jest.fn(),
}));

jest.mock('@app/utils/helpers', () => ({
  getDisplayName: jest.fn(() => 'CSS Admin'),
}));

jest.mock('@app/helpers/string', () => ({
  lowcase: jest.fn((value) => value),
}));

const session = {
  client_roles: ['sso-admin'],
  idir_userid: 'cssadmin',
  user: { id: 1, displayName: 'CSS Admin' },
} as any;

describe('deleteOrganization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrganizationById.mockResolvedValue({
      id: 42,
      name: 'Audit Org',
      destroy: mockOrganizationDestroy,
    });
    mockRequestFindOne.mockResolvedValue(null);
    mockRequestUpdate.mockResolvedValue([1]);
    mockOrganizationDestroy.mockResolvedValue(undefined);
  });

  it('retains archived API account requests when deleting an organization', async () => {
    await expect(deleteOrganization(session, 42)).resolves.toEqual({ success: true });

    expect(mockRequestUpdate).toHaveBeenCalledWith(
      { organizationId: null },
      {
        where: { organizationId: 42, apiServiceAccount: true, archived: true },
        transaction: mockTransaction,
      },
    );
    expect(mockOrganizationDestroy).toHaveBeenCalledWith({ transaction: mockTransaction });
    expect(mockRequestUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      mockOrganizationDestroy.mock.invocationCallOrder[0],
    );
  });

  it('does not delete an organization with an active API account', async () => {
    mockRequestFindOne.mockResolvedValue({ id: 7 });

    await expect(deleteOrganization(session, 42)).rejects.toThrow('organization still has active api accounts');

    expect(mockRequestUpdate).not.toHaveBeenCalled();
    expect(mockOrganizationDestroy).not.toHaveBeenCalled();
  });
});
