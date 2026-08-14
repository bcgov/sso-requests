import { previewRoleSync, syncRolesToMfa } from '@app/keycloak/roleSync';

const CLIENT_ID = 'client-1';

// Users assigned to the "editor" role on the idir realm.
const idirUsers = [
  {
    id: 'kc-idir-already-synced',
    username: 'guid-already-synced@idir',
    attributes: { idir_user_guid: ['guid-already-synced'], idir_username: ['already.synced'] },
  },
  {
    id: 'kc-idir-to-sync',
    username: 'guid-to-sync@idir',
    attributes: { idir_user_guid: ['guid-to-sync'], idir_username: ['to.sync'] },
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
  'guid-already-synced@azureidir': { id: 'kc-mfa-already-synced', username: 'guid-already-synced@azureidir' },
  'guid-to-sync@azureidir': { id: 'kc-mfa-to-sync', username: 'guid-to-sync@azureidir' },
  'guid-errors@azureidir': { id: 'kc-mfa-errors', username: 'guid-errors@azureidir' },
};

// Roles already assigned on the MFA side, keyed by keycloak user id.
const existingMfaRoleMappingsByUserId: Record<string, any[]> = {
  'kc-mfa-already-synced': [roleRepresentation],
  'kc-mfa-to-sync': [],
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

jest.mock('@app/utils/ms-graph-idir', () => ({
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

describe('role sync (idir -> azureidir MFA)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('previews counts without mutating anything', async () => {
    const preview = await previewRoleSync(integration, { environment: 'dev', roleName: 'editor' });

    expect(preview).toEqual([{ role: 'editor', total: 5, alreadySynced: 1, toAttempt: 4 }]);
    expect(mockAddClientRoleMappings).not.toHaveBeenCalled();
    expect(mockCreateAzureIdirUser).not.toHaveBeenCalled();
  });

  it('is additive-only: SYNCED, ALREADY_SYNCED, NOT_FOUND_IN_MFA, ERROR, and continues past failures', async () => {
    const results = await syncRolesToMfa(integration, { environment: 'dev', roleName: 'editor' });

    const byGuid = Object.fromEntries(results.map((row) => [row.guid, row]));

    expect(byGuid['guid-already-synced'].status).toBe('ALREADY_SYNCED');
    expect(byGuid['guid-to-sync'].status).toBe('SYNCED');
    expect(byGuid['guid-not-found'].status).toBe('NOT_FOUND_IN_MFA');
    expect(byGuid['guid-to-provision'].status).toBe('SYNCED');
    expect(byGuid['guid-errors'].status).toBe('ERROR');
    expect(byGuid['guid-errors'].detail).toContain('keycloak 500');

    // Never removes/touches roles already on the MFA side.
    expect(mockAddClientRoleMappings).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-already-synced' }),
    );
    // Provisions the missing azureidir user before assigning the role.
    expect(mockCreateAzureIdirUser).toHaveBeenCalledWith(expect.objectContaining({ guid: 'guid-to-provision' }));
    // Assigns the role to both the pre-existing and newly-provisioned MFA users.
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-to-sync', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-provisioned', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );

    expect(results).toHaveLength(5);
  });
});
