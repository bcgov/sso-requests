import { randomUUID } from 'node:crypto';
import { cleanUpDatabaseTables } from './helpers/utils';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { audit } from '@app/queries/event';
import { recordWorkflowEvent } from '@app/workflow/audit';
import { restoreIntegrationRoles, snapshotIntegrationRoles } from '@app/workflow/effects';
import { WorkflowType } from '@app/workflow/types';
import { ACTION_TYPES } from '@app/shared/enums';
import { systemActor, withActor } from '@sso/audit/server';
import * as users from '@app/keycloak/users';

jest.mock('@app/keycloak/adminClient');
jest.mock('@app/keycloak/users', () => ({
  ...jest.requireActual('@app/keycloak/users'),
  bulkCreateRole: jest.fn(),
  listClientRoles: jest.fn(),
  getCompositeClientRoles: jest.fn(),
  setCompositeClientRoles: jest.fn(),
}));

// A Keycloak holding each role's composites, by environment.
let keycloak: Record<string, Record<string, string[]>>;

const fakeKeycloak = () => {
  (users.bulkCreateRole as jest.Mock).mockImplementation(async (_integration, roles: users.NewRole[]) =>
    ['dev', 'test', 'prod'].map((env) => {
      const result = { env, success: [] as string[], duplicate: [] as string[], failure: [], clientNotFound: false };
      for (const role of roles.filter((role) => role.envs?.includes(env))) {
        keycloak[env] ??= {};
        if (role.name in keycloak[env]) result.duplicate.push(role.name);
        else {
          keycloak[env][role.name] = [];
          result.success.push(role.name);
        }
      }
      return result;
    }),
  );
  (users.listClientRoles as jest.Mock).mockImplementation(async (_integration, { environment }) =>
    Object.keys(keycloak[environment] ?? {}).map((name) => ({ name })),
  );
  (users.getCompositeClientRoles as jest.Mock).mockImplementation(
    async (_integration, { environment, roleName }) => keycloak[environment][roleName],
  );
  (users.setCompositeClientRoles as jest.Mock).mockImplementation(
    async (_integration, { environment, roleName, compositeRoleNames }) => {
      keycloak[environment][roleName] = compositeRoleNames;
    },
  );
};

const asEngine = <T>(fn: () => Promise<T>) => withActor(systemActor('workflow-engine'), fn);

const childEvents = async (parentOperationId: string) =>
  (await models.event.findAll({ where: { parentOperationId }, raw: true }))
    .map((event: any) => [event.eventCode, event.targetId, event.details])
    .sort((a: any[], b: any[]) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`));

describe('restoring roles, retried', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.restoreAllMocks();
    keycloak = { dev: { existing: [] } };
    fakeKeycloak();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('records what an earlier attempt changed but could not record, once, and never what was already there', async () => {
    const integration = await models.request.create({
      projectName: 'restored',
      clientId: 'restored-client',
      protocol: 'oidc',
      environments: ['dev'],
    });
    const role = (name: string, fields: Record<string, unknown> = {}) =>
      models.requestRole.create({
        name,
        environment: 'dev',
        requestId: integration.id,
        composite: false,
        compositeRoles: [],
        ...fields,
      });
    await role('existing');
    const reader = await role('reader');
    await role('admin', { composite: true, compositeRoles: [reader.id] });

    const workflow = { id: randomUUID(), correlationId: randomUUID(), requestId: integration.id };
    // The restore operation the role events are children of.
    await asEngine(async () => {
      for (const outcome of ['requested', 'success'] as const) {
        await audit.createEvent({
          action: 'request-restore',
          outcome,
          operationId: workflow.correlationId,
          workflowId: workflow.id,
          requestId: integration.id,
          details: {},
        } as any);
      }
    });
    const before = await snapshotIntegrationRoles(integration.id);

    // The first attempt creates the roles, then cannot record them.
    jest.spyOn(audit, 'createEvent').mockRejectedValueOnce(new Error('database unavailable'));
    await expect(asEngine(() => restoreIntegrationRoles(workflow, before))).rejects.toThrow('database unavailable');
    expect(keycloak.dev).toEqual({ existing: [], reader: [], admin: [] });

    await asEngine(() => restoreIntegrationRoles(workflow, before));
    const expected = [
      ['role-composite-update', 'admin', { roleName: 'admin', add: ['reader'], remove: [] }],
      ['role-create', 'admin', { roleName: 'admin' }],
      ['role-create', 'reader', { roleName: 'reader' }],
    ];
    expect(await childEvents(workflow.correlationId)).toEqual(expected);

    // A further replay records nothing new.
    await asEngine(() => restoreIntegrationRoles(workflow, before));
    expect(await childEvents(workflow.correlationId)).toEqual(expected);
  });
});

describe('terminal outcomes, racing', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('records one terminal outcome when a finish races a supersede that has not committed yet', async () => {
    const integration = await models.request.create({ projectName: 'raced', environments: ['dev'] });
    const workflow = {
      id: randomUUID(),
      correlationId: randomUUID(),
      type: WorkflowType.INTEGRATION_APPLY,
      action: ACTION_TYPES.UPDATE,
      payload: { id: integration.id },
    };

    let finishing: Promise<void> | undefined;
    await sequelize.transaction(async (transaction) => {
      await recordWorkflowEvent(workflow as any, { outcome: 'superseded' }, { transaction });
      // The finalize step writes while the supersede is still open; it has to wait for it, then see it.
      finishing = recordWorkflowEvent(workflow as any, { outcome: 'success' });
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
    await finishing;

    const outcomes = (await models.event.findAll({ where: { operationId: workflow.correlationId }, raw: true })).map(
      (event: any) => event.outcome,
    );
    expect(outcomes).toEqual(['superseded']);
  });
});
