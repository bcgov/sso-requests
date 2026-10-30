import { replicateRoleMfa } from '@app/controllers/roles';
import { userActor, withActor } from '@sso/audit/server';

const mockPlan = jest.fn();
const mockRows: any[] = [];

jest.mock('@app/keycloak/roleReplication', () => {
  const actual = jest.requireActual('@app/keycloak/roleReplication');
  return {
    isNotFoundInMfa: actual.isNotFoundInMfa,
    previewRoleReplication: jest.fn(),
    planRoleReplication: (...args: any[]) => mockPlan(...args),
  };
});
// The real writer over an in-memory event table, so the test sees the rows replicate would write.
jest.mock('@app/queries/event', () => {
  const { createAuditWriter } = jest.requireActual('@sso/audit/server');
  return {
    audit: createAuditWriter({
      model: { create: async (row: any) => mockRows.push(row) },
      transaction: (fn: any) => fn({}),
      logger: { error: () => undefined },
    }),
  };
});
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
const asUser = <T>(fn: () => Promise<T>) => withActor(userActor('u1', 'Test'), fn);

const pending = (guid: string, idirUsername: string) => ({
  guid,
  idirUsername,
  role: 'editor',
  mfaUsername: `${guid}@azureidir`,
});

// A plan whose `resolveTargets` moves the rows of `vanished` GUIDs (no azureidir user at grant time) to notFound.
const planned = ({
  alreadyReplicated = [],
  notFound = [],
  pending = [],
  replicate = jest.fn(),
  vanished = [],
}: any) => ({
  alreadyReplicated,
  notFound,
  pending,
  replicate,
  resolveTargets: jest.fn(async () => ({
    pending: pending.filter((row: any) => !vanished.includes(row.guid)),
    notFound: [
      ...notFound,
      ...pending
        .filter((row: any) => vanished.includes(row.guid))
        .map(({ idirUsername, guid, role }: any) => ({ idirUsername, guid, role, status: 'NOT_FOUND_IN_MFA' })),
    ],
  })),
});

describe('replicateRoleMfa audit events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRows.length = 0;
  });

  it('records a role-replicate parent with one role-assign child per user still to replicate', async () => {
    const replicate = jest.fn(({ guid }: any) =>
      guid === 'ge' ? Promise.reject(new Error('keycloak down')) : Promise.resolve(),
    );
    mockPlan.mockResolvedValue(
      planned({
        alreadyReplicated: [{ idirUsername: 'b', guid: 'gb', role: 'editor', status: 'ALREADY_REPLICATED' }],
        notFound: [{ idirUsername: 'd', guid: 'gd', role: 'editor', status: 'NOT_FOUND_IN_MFA' }],
        pending: [pending('ga', 'a'), pending('gc', 'c'), pending('ge', 'e')],
        replicate,
        // MS Graph found gc while planning, but no azureidir user resolved for it before the grants.
        vanished: ['gc'],
      }),
    );

    const results = await asUser(() => replicateRoleMfa(session, params));

    expect(results.map((row) => [row.guid, row.status])).toEqual([
      ['gb', 'ALREADY_REPLICATED'],
      ['gd', 'NOT_FOUND_IN_MFA'],
      ['gc', 'NOT_FOUND_IN_MFA'],
      ['ga', 'REPLICATED'],
      ['ge', 'ERROR'],
    ]);

    const parent = mockRows.find((row) => row.eventCode === 'role-replicate' && row.outcome === 'requested');
    expect(parent).toMatchObject({
      requestId: 10,
      environment: 'dev',
      targetType: 'role',
      targetId: 'editor',
      details: { roleName: 'editor', sourceIdp: 'idir', targetIdp: 'azureidir' },
    });

    // Every child is stored before any grant; users who already hold the role or have no account are not.
    const requested = mockRows.filter((row) => row.eventCode === 'role-assign' && row.outcome === 'requested');
    expect(requested.map((row) => [row.targetId, row.details.replicatedFrom, row.parentOperationId])).toEqual([
      ['ga@azureidir', 'a', parent.operationId],
      ['ge@azureidir', 'e', parent.operationId],
    ]);

    const outcomes = mockRows.filter((row) => row.eventCode === 'role-assign' && row.outcome !== 'requested');
    expect(outcomes.map((row) => [row.targetId, row.outcome])).toEqual([
      ['ga@azureidir', 'success'],
      ['ge@azureidir', 'failure'],
    ]);
    expect(
      mockRows.find((row) => row.eventCode === 'role-replicate' && row.outcome === 'failure').details,
    ).toMatchObject({
      total: 2,
      succeeded: 1,
      failed: 1,
    });
  });

  it('records nothing when planning rejects the request', async () => {
    mockPlan.mockRejectedValue(Object.assign(new Error('role editor not found'), { status: 404 }));

    await expect(asUser(() => replicateRoleMfa(session, params))).rejects.toThrow('role editor not found');
    expect(mockRows).toEqual([]);
  });

  it('still records the parent when everyone already holds the role, so the run is visible', async () => {
    mockPlan.mockResolvedValue(planned({}));

    await asUser(() => replicateRoleMfa(session, params));
    expect(mockRows.map((row) => [row.eventCode, row.outcome])).toEqual([
      ['role-replicate', 'requested'],
      ['role-replicate', 'success'],
    ]);
  });
});
