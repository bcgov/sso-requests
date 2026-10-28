import { replicateRoleMfa } from '@app/controllers/roles';

const mockReplicate = jest.fn();
const mockComplete = jest.fn();

jest.mock('@app/keycloak/roleReplication', () => ({
  previewRoleReplication: jest.fn(),
  replicateRolesToMfa: (...args: any[]) => mockReplicate(...args),
}));
jest.mock('@app/queries/event', () => ({
  beginLifecycleEvent: jest.fn(() => Promise.resolve(1)),
  completeLifecycleEvent: (...args: any[]) => mockComplete(...args),
  runAuditedOperation: jest.fn(),
}));
jest.mock('@app/queries/integrationAccess', () => ({
  authorizeIntegration: jest.fn(() =>
    Promise.resolve({ integration: { id: 10, status: 'applied', devIdps: ['idir', 'azureidir'] } }),
  ),
}));
jest.mock('@app/helpers/permissions', () => ({ canCreateOrDeleteRoles: () => true }));
jest.mock('@app/keycloak/users', () => ({}));
jest.mock('@app/shared/sequelize/models/models', () => ({ models: {} }));
jest.mock('@app/queries/roles', () => ({}));

const session = { idir_userid: 'u1', user: { displayName: 'Test' } } as any;
const params = { environment: 'dev', integrationId: 10, roleName: 'editor' };

const rows = [
  { idirUsername: 'a', guid: 'ga', role: 'editor', status: 'REPLICATED' },
  { idirUsername: 'b', guid: 'gb', role: 'editor', status: 'ALREADY_REPLICATED' },
  { idirUsername: 'c', guid: 'gc', role: 'editor', status: 'NOT_FOUND_IN_MFA', detail: 'no account' },
];

describe('replicateRoleMfa audit event', () => {
  beforeEach(() => jest.clearAllMocks());

  it('stores the full per-user snapshot and status counts on success', async () => {
    mockReplicate.mockResolvedValue(rows);
    await replicateRoleMfa(session, params);

    const [, data] = mockComplete.mock.calls[0];
    expect(data.eventCode).toBe('role-replicate-success');
    expect(data.details.resultCount).toBe(3);
    expect(data.details.failedCount).toBe(0);
    expect(data.details.statusCounts).toEqual({ REPLICATED: 1, ALREADY_REPLICATED: 1, NOT_FOUND_IN_MFA: 1 });
    expect(data.details.assignments).toEqual(rows);
  });

  it('keeps partial results on the failure event when the run throws', async () => {
    const err: any = new Error('keycloak down');
    err.partialResults = [rows[0]];
    mockReplicate.mockRejectedValue(err);

    await expect(replicateRoleMfa(session, params)).rejects.toThrow('keycloak down');

    const [, data] = mockComplete.mock.calls[0];
    expect(data.eventCode).toBe('role-replicate-failure');
    expect(data.details.assignments).toEqual([rows[0]]);
  });
});
