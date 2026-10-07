import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  SSO_ADMIN_USERID_01,
  SSO_ADMIN_EMAIL_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
} from './helpers/fixtures';
import { createIntegration, updateIntegration } from './helpers/modules/integrations';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { fetchClient } from '@app/keycloak/client';
import { keycloakClient } from '@app/keycloak/integration';

jest.mock('@app/keycloak/client', () => ({
  disableIntegration: jest.fn(() => Promise.resolve()),
  fetchClient: jest.fn(() => Promise.resolve(null)),
}));

const mockedFetchClient = jest.mocked(fetchClient);

const asUser = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
const asSsoAdmin = () => createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

const draftWithClientId = async (clientId: string, projectName = 'Custom Client') => {
  const created = await createIntegration({
    ...getCreateIntegrationData({ projectName }),
    clientId,
  } as any);
  expect(created.status).toEqual(200);
  return created.body;
};

const submit = (integration: any, envs = ['dev']) =>
  updateIntegration(getUpdateIntegrationData({ integration, envs }), true);

/**
 * A client id is an identity. The CSS API reads the `azp` claim off a token and
 * resolves the account it names (api/src/modules/authorization), so whoever
 * gets to name a Keycloak client decides what that client speaks for — and
 * provisioning *updates* a client already carrying the id rather than refusing
 * it. These pin who may choose an id, and that a chosen one must be free.
 */
describe('choosing a client id', () => {
  beforeAll(async () => {
    await cleanUpDatabaseTables();
  });

  beforeEach(() => {
    mockedFetchClient.mockResolvedValue(null as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('refuses one from an actor who may not choose one, at creation', async () => {
    asUser();
    const created = await createIntegration({
      ...getCreateIntegrationData({ projectName: 'Spoof' }),
      clientId: 'service-account-org-1-9999',
    } as any);

    expect(created.status).toEqual(403);
    expect(await models.request.count({ where: { clientId: 'service-account-org-1-9999' } })).toEqual(0);
  });

  it('refuses the api-account namespace even to an sso-admin', async () => {
    asSsoAdmin();
    for (const clientId of ['service-account-org-1-9999', 'service-account-team-2-3', 'SERVICE-ACCOUNT-anything']) {
      const created = await createIntegration({
        ...getCreateIntegrationData({ projectName: 'Spoof' }),
        clientId,
      } as any);
      expect(created.status).toEqual(400);
    }
    expect(await models.request.count({ where: { apiServiceAccount: false } })).toEqual(0);
  });

  it('lets an sso-admin choose a free one', async () => {
    asSsoAdmin();
    const integration = await draftWithClientId('custom-admin-client');
    const submitted = await submit(integration);

    expect(submitted.status).toEqual(200);
    const row = await models.request.findOne({ where: { id: integration.id }, raw: true });
    expect(row?.clientId).toEqual('custom-admin-client');
  });

  it('refuses at submit an id another row holds, whatever the protocol', async () => {
    asSsoAdmin();
    const taken = await models.request.create({ projectName: 'Taken', clientId: 'taken-client', protocol: 'oidc' });
    const integration = await draftWithClientId('taken-client');

    // updateRequest reports a refused submission as 422 carrying the reason.
    const submitted = await submit(integration);
    expect(submitted.status).toEqual(422);
    expect(submitted.body.message).toMatch(/already exists/);

    await models.request.destroy({ where: { id: taken.id } });
  });

  // An api account is invisible to every integration list, but its client id is
  // exactly the one worth stealing.
  it('counts an api account as holding its client id', async () => {
    asSsoAdmin();
    const organization = await models.organization.create({ name: 'Ministry of Accounts' });
    const account = await models.request.create({
      projectName: 'Legacy account',
      clientId: 'legacy-api-account',
      apiServiceAccount: true,
      organizationId: organization.id,
    });
    const integration = await draftWithClientId('legacy-api-account');

    const submitted = await submit(integration);
    expect(submitted.status).toEqual(422);
    expect(submitted.body.message).toMatch(/already exists/);

    await models.request.destroy({ where: { id: account.id } });
    await models.organization.destroy({ where: { id: organization.id } });
  });

  it('checks every environment the integration asks for, not only dev', async () => {
    asSsoAdmin();
    mockedFetchClient.mockImplementation(({ environment }: any) =>
      Promise.resolve(environment === 'prod' ? ({ id: 'kc' } as any) : null),
    );

    const integration = await draftWithClientId('prod-only-collision');
    const submitted = await submit(integration, ['dev', 'test', 'prod']);

    expect(submitted.status).toEqual(422);
    expect(submitted.body.message).toMatch(/already exists/);
    expect(mockedFetchClient).toHaveBeenCalledWith(expect.objectContaining({ environment: 'prod' }));
  });

  it('never provisions a non-account integration under an api account client id', async () => {
    await expect(
      keycloakClient('prod', { clientId: 'service-account-org-1-2', apiServiceAccount: false } as any),
    ).rejects.toThrow(/reserved/);
  });

  it('still generates an id ending in the row id when none was chosen', async () => {
    asUser();
    const created = await createIntegration(getCreateIntegrationData({ projectName: 'Generated Name' }));
    const submitted = await submit(created.body);

    expect(submitted.status).toEqual(200);
    const row = await models.request.findOne({ where: { id: created.body.id }, raw: true });
    expect(row?.clientId).toEqual(`generated-name-${created.body.id}`);
  });
});
