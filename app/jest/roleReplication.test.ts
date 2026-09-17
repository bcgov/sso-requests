import { previewRoleReplication, replicateRolesToMfa } from '@app/keycloak/roleReplication';

const CLIENT_ID = 'client-1';

// Users assigned to the "editor" role on the idir realm.
const idirUsers = [
  {
    id: 'kc-idir-already-replicated',
    username: 'guid-already-replicated@idir',
    attributes: { idir_user_guid: ['guid-already-replicated'], idir_username: ['already.replicated'] },
  },
  {
    id: 'kc-idir-to-replicate',
    username: 'guid-to-replicate@idir',
    attributes: { idir_user_guid: ['guid-to-replicate'], idir_username: ['to.replicate'] },
  },
  {
    id: 'kc-idir-not-found',
    username: 'guid-not-found@idir',
    attributes: { idir_user_guid: ['guid-not-found'], idir_username: ['not.found'] },
  },
  {
    id: 'kc-idir-to-provision',
    username: 'guid-to-provision@idir',
    attributes: { idir_user_guid: ['guid-to-provision'], idir_username: ['to.provision'] },
  },
  {
    id: 'kc-idir-errors',
    username: 'guid-errors@idir',
    attributes: { idir_user_guid: ['guid-errors'], idir_username: ['errors'] },
  },
];

const roleRepresentation = { id: 'role-editor-id', name: 'editor' };

// Existing azureidir users, keyed by username.
const existingMfaUsersByUsername: Record<string, any> = {
  'guid-already-replicated@azureidir': {
    id: 'kc-mfa-already-replicated',
    username: 'guid-already-replicated@azureidir',
  },
  'guid-to-replicate@azureidir': { id: 'kc-mfa-to-replicate', username: 'guid-to-replicate@azureidir' },
  'guid-errors@azureidir': { id: 'kc-mfa-errors', username: 'guid-errors@azureidir' },
};

// Roles already assigned on the MFA side, keyed by keycloak user id.
const existingMfaRoleMappingsByUserId: Record<string, any[]> = {
  'kc-mfa-already-replicated': [roleRepresentation],
  'kc-mfa-to-replicate': [],
  'kc-mfa-errors': [],
};

const mockAddClientRoleMappings = jest.fn(() => Promise.resolve());
const mockCreateAzureIdirUser = jest.fn((...args: any[]) =>
  Promise.resolve({ id: 'kc-mfa-provisioned', username: 'guid-to-provision@azureidir' }),
);
const mockVerifyAzureIdirAccountByGuid = jest.fn((guid: string) => {
  if (guid === 'guid-to-provision') {
    return Promise.resolve({
      guid,
      userId: 'to.provision',
      email: 'to.provision@gov.bc.ca',
      firstName: 'To',
      lastName: 'Provision',
      displayName: 'To Provision',
      userPrincipalName: 'to.provision@gov.bc.ca',
    });
  }
  return Promise.resolve(null);
});

jest.mock('@app/keycloak/users', () => ({
  createAzureIdirUser: (arg: any) => mockCreateAzureIdirUser(arg),
}));

jest.mock('@app/utils/graph-api', () => ({
  verifyAzureIdirAccountByGuid: (guid: string) => mockVerifyAzureIdirAccountByGuid(guid),
}));

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: () =>
    Promise.resolve({
      kcAdminClient: {
        clients: {
          find: () => Promise.resolve([{ id: CLIENT_ID }]),
          listRoles: () => Promise.resolve([roleRepresentation]),
          findUsersWithRole: () => Promise.resolve(idirUsers),
          findRole: () => Promise.resolve(roleRepresentation),
        },
        users: {
          find: ({ username }: { username: string }) =>
            Promise.resolve(existingMfaUsersByUsername[username] ? [existingMfaUsersByUsername[username]] : []),
          listClientRoleMappings: ({ id }: { id: string }) => {
            if (id === 'kc-mfa-errors') throw new Error('keycloak 500');
            return Promise.resolve(existingMfaRoleMappingsByUserId[id] || []);
          },
          addClientRoleMappings: mockAddClientRoleMappings,
        },
      },
    }),
}));

const integration = { clientId: CLIENT_ID } as any;

describe('role replication (idir -> azureidir MFA)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('previews counts without mutating anything', async () => {
    const preview = await previewRoleReplication(integration, { environment: 'dev', roleName: 'editor' });

    expect(preview).toEqual([{ role: 'editor', total: 5, alreadyReplicated: 1, toAttempt: 4 }]);
    expect(mockAddClientRoleMappings).not.toHaveBeenCalled();
    expect(mockCreateAzureIdirUser).not.toHaveBeenCalled();
  });

  it('is additive-only: REPLICATED, ALREADY_REPLICATED, NOT_FOUND_IN_MFA, ERROR, and continues past failures', async () => {
    const results = await replicateRolesToMfa(integration, { environment: 'dev', roleName: 'editor' });

    const byGuid = Object.fromEntries(results.map((row) => [row.guid, row]));

    expect(byGuid['guid-already-replicated'].status).toBe('ALREADY_REPLICATED');
    expect(byGuid['guid-to-replicate'].status).toBe('REPLICATED');
    expect(byGuid['guid-not-found'].status).toBe('NOT_FOUND_IN_MFA');
    expect(byGuid['guid-to-provision'].status).toBe('REPLICATED');
    expect(byGuid['guid-errors'].status).toBe('ERROR');

    // Never removes/touches roles already on the MFA side.
    expect(mockAddClientRoleMappings).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-already-replicated' }),
    );
    // Provisions the missing azureidir user before assigning the role.
    expect(mockCreateAzureIdirUser).toHaveBeenCalledWith(expect.objectContaining({ guid: 'guid-to-provision' }));
    // Assigns the role to both the pre-existing and newly-provisioned MFA users.
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-to-replicate', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-provisioned', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );

    expect(results).toHaveLength(5);
  });
});
