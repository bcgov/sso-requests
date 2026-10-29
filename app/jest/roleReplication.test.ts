import { isNotFoundInMfa, planRoleReplication, previewRoleReplication } from '@app/keycloak/roleReplication';

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
const viewerRepresentation = { id: 'role-viewer-id', name: 'viewer' };

// Existing azureidir users, keyed by username.
const existingMfaUsersByUsername: Record<string, any> = {
  'guid-already-replicated@azureidir': {
    id: 'kc-mfa-already-replicated',
    username: 'guid-already-replicated@azureidir',
  },
  'guid-to-replicate@azureidir': { id: 'kc-mfa-to-replicate', username: 'guid-to-replicate@azureidir' },
  'guid-errors@azureidir': { id: 'kc-mfa-errors', username: 'guid-errors@azureidir' },
};

// Roles already assigned on the MFA side, keyed by keycloak user id. Self-contained: jest hoists this above
// the other constants along with the mock factory that reads it.
const existingMfaRoleMappingsByUserId: Record<string, any[]> = {
  'kc-mfa-already-replicated': [{ id: 'role-editor-id', name: 'editor' }],
  'kc-mfa-to-replicate': [],
  'kc-mfa-errors': [],
};

const mockAddClientRoleMappings = jest.fn(({ id }: { id: string }) =>
  id === 'kc-mfa-errors' ? Promise.reject(new Error('keycloak 500')) : Promise.resolve(),
);
// The client's roles; each test starts from editor alone.
const mockListRoles = jest.fn(() => Promise.resolve([roleRepresentation]));
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
          listRoles: () => mockListRoles(),
          findUsersWithRole: () => Promise.resolve(idirUsers),
          findRole: ({ roleName }: { roleName: string }) =>
            mockListRoles().then((roles) => roles.find((role) => role.name === roleName)),
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

  it('plans without changing anything, leaving out users who already hold the role or have no account', async () => {
    const plan = await planRoleReplication(integration, { environment: 'dev', roleName: 'editor' });

    expect(plan.alreadyReplicated.map((row) => [row.guid, row.status])).toEqual([
      ['guid-already-replicated', 'ALREADY_REPLICATED'],
    ]);
    // No Azure IDIR account means nothing to replicate to: reported, not planned.
    expect(plan.notFound.map((row) => [row.guid, row.status])).toEqual([['guid-not-found', 'NOT_FOUND_IN_MFA']]);
    // Every other idir user is still to do, named by the azureidir user that would receive the role.
    expect(plan.pending.map((row) => [row.idirUsername, row.mfaUsername])).toEqual([
      ['to.replicate', 'guid-to-replicate@azureidir'],
      ['to.provision', 'guid-to-provision@azureidir'],
      ['errors', 'guid-errors@azureidir'],
    ]);
    // Only the users with no azureidir user in Keycloak are looked up in MS Graph.
    expect(mockVerifyAzureIdirAccountByGuid.mock.calls.map(([guid]) => guid).sort()).toEqual([
      'guid-not-found',
      'guid-to-provision',
    ]);
    expect(mockAddClientRoleMappings).not.toHaveBeenCalled();
    expect(mockCreateAzureIdirUser).not.toHaveBeenCalled();
  });

  it('replicates one user at a time: grants, provisions first when needed, and fails the ones it cannot do', async () => {
    const plan = await planRoleReplication(integration, { environment: 'dev', roleName: 'editor' });
    const outcomes = await Promise.allSettled(plan.pending.map((row) => plan.replicate(row)));
    const byGuid = Object.fromEntries(plan.pending.map((row, index) => [row.guid, outcomes[index]]));

    expect(byGuid['guid-to-replicate'].status).toBe('fulfilled');
    expect(byGuid['guid-to-provision'].status).toBe('fulfilled');
    expect((byGuid['guid-errors'] as PromiseRejectedResult).reason.message).toBe('keycloak 500');

    // Never removes/touches roles already on the MFA side.
    expect(mockAddClientRoleMappings).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-already-replicated' }),
    );
    // Provisions the missing azureidir user before assigning the role.
    expect(mockCreateAzureIdirUser).toHaveBeenCalledWith(expect.objectContaining({ guid: 'guid-to-provision' }));
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-to-replicate', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );
    expect(mockAddClientRoleMappings).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'kc-mfa-provisioned', roles: [{ id: 'role-editor-id', name: 'editor' }] }),
    );
  });

  it('creates a missing azureidir user once, however many roles it receives at the same time', async () => {
    mockListRoles.mockImplementation(() => Promise.resolve([roleRepresentation, viewerRepresentation]));
    const plan = await planRoleReplication(integration, { environment: 'dev' });
    const provisioning = plan.pending.filter((row) => row.guid === 'guid-to-provision');
    expect(provisioning.map((row) => row.role)).toEqual(['editor', 'viewer']);

    const outcomes = await Promise.allSettled(provisioning.map((row) => plan.replicate(row)));

    expect(outcomes.map((outcome) => outcome.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(mockCreateAzureIdirUser).toHaveBeenCalledTimes(1);
    // The account found while planning is reused rather than looked up again.
    expect(mockVerifyAzureIdirAccountByGuid.mock.calls.filter(([guid]) => guid === 'guid-to-provision')).toHaveLength(
      1,
    );
  });

  it('resolves targets before the grants, moving a user whose azureidir user cannot be created to notFound', async () => {
    mockCreateAzureIdirUser.mockImplementationOnce(() => Promise.resolve(null as any));
    const plan = await planRoleReplication(integration, { environment: 'dev', roleName: 'editor' });

    const { pending, notFound } = await plan.resolveTargets();

    expect(pending.map((row) => row.guid)).toEqual(['guid-to-replicate', 'guid-errors']);
    expect(notFound.map((row) => [row.guid, row.status])).toEqual([
      ['guid-not-found', 'NOT_FOUND_IN_MFA'],
      ['guid-to-provision', 'NOT_FOUND_IN_MFA'],
    ]);
    expect(mockCreateAzureIdirUser).toHaveBeenCalledTimes(1);
    expect(mockAddClientRoleMappings).not.toHaveBeenCalled();
  });

  it('still reports a user as not found when MS Graph has no account at grant time', async () => {
    const plan = await planRoleReplication(integration, { environment: 'dev', roleName: 'editor' });
    const row = { ...plan.pending[0], guid: 'guid-vanished', mfaUsername: 'guid-vanished@azureidir' };

    const reason = await plan.replicate(row).catch((err) => err);

    expect(isNotFoundInMfa(reason)).toBe(true);
    expect(mockCreateAzureIdirUser).not.toHaveBeenCalled();
  });
});
