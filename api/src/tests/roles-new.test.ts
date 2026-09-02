import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from '@/tests/helpers/fixtures';
import supertest from 'supertest';
import app from '@/tests/helpers/server';
import { KeycloakService } from '@/services/keycloak-service';
import { BceidWebserviceService } from '@/services/bceid-webservice';
import { MsGraphService } from '@/services/ms-graph-idir';
import { seedApiAccount, seedIntergrations, seedTeamAndMembers } from './helpers/seeder';

const API_BASE_PATH = '/api/v1';
let team: any;
let integration: any;
let apiAccount: any;

const clientRoles = [{ name: 'role1', composite: false }];

jest.mock('@/modules/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: team.id as any, apiClientId: apiAccount.clientId },
        err: null,
      });
    }),
  };
});

describe('roles-new endpoint', () => {
  beforeAll(async () => {
    jest.clearAllMocks();
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    team = await seedTeamAndMembers('roles-new test team', [
      {
        idirUserId: TEAM_ADMIN_IDIR_USERID_01,
        email: TEAM_ADMIN_IDIR_EMAIL_01,
        role: 'admin',
      },
    ]);

    integration = await seedIntergrations({
      integrationName: 'Roles New Test Integration',
      idps: ['idir', 'bceidbasic', 'bceidbusiness', 'bceidboth', 'azureidir'],
      teamId: team?.id,
      submitted: true,
    });

    apiAccount = await seedApiAccount(team.id);
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => Promise.resolve());
  });

  const mockRoleAssignment = () => {
    jest.spyOn(KeycloakService.prototype, 'listClientRoles').mockImplementation(() => Promise.resolve(clientRoles));
    jest
      .spyOn(KeycloakService.prototype, 'getClient')
      .mockImplementation(() => Promise.resolve({ id: 'client-1', enabled: true, name: 'test client' }));
    jest
      .spyOn(KeycloakService.prototype, 'addClientUserRoleMapping')
      .mockImplementation(() => Promise.resolve(clientRoles));
    jest
      .spyOn(KeycloakService.prototype, 'listClientUserRoleMappings')
      .mockImplementation(() => Promise.resolve(clientRoles));
  };

  it('assigns a role directly when the user already exists', async () => {
    mockRoleAssignment();
    const getUserMock = jest
      .spyOn(KeycloakService.prototype, 'getUser')
      .mockImplementation(() => Promise.resolve({ id: 'user-1', username: 'existinguser@idir' }));
    const createUserMock = jest.spyOn(KeycloakService.prototype, 'createUser');
    const bceidVerifyMock = jest.spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid');

    const result = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/existinguser@idir/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(201);

    expect(getUserMock).toHaveBeenCalled();
    expect(createUserMock).not.toHaveBeenCalled();
    expect(bceidVerifyMock).not.toHaveBeenCalled();
    expect(result.body.data[0].name).toBe('role1');
  });

  it('verifies and imports a new idir user via the BCeID webservice, then assigns the role', async () => {
    mockRoleAssignment();
    jest
      .spyOn(KeycloakService.prototype, 'getUser')
      .mockRejectedValueOnce(new (require('http-errors')[404])('not found'))
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 'user-1', username: 'aaaaaaaa11112222333344445555aaaa@idir' }),
      );
    const createUserMock = jest
      .spyOn(KeycloakService.prototype, 'createUser')
      .mockImplementation(() => Promise.resolve({ id: 'user-1' }));
    const verifyMock = jest
      .spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid')
      .mockImplementation(() =>
        Promise.resolve({ guid: 'aaaaaaaa11112222333344445555aaaa', firstName: 'New', lastName: 'User' }),
      );

    const result = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/aaaaaaaa11112222333344445555aaaa@idir/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(201);

    expect(verifyMock).toHaveBeenCalledWith('idir', 'aaaaaaaa11112222333344445555aaaa', 'dev');
    expect(createUserMock).toHaveBeenCalled();
    expect(result.body.data[0].name).toBe('role1');
  });

  it.each(['bceidbasic', 'bceidbusiness', 'bceidboth'])(
    'verifies and imports a new %s user via the BCeID webservice, then assigns the role',
    async (idp) => {
      mockRoleAssignment();
      jest
        .spyOn(KeycloakService.prototype, 'getUser')
        .mockRejectedValueOnce(new (require('http-errors')[404])('not found'))
        .mockImplementationOnce(() =>
          Promise.resolve({ id: 'user-1', username: `bbbbbbbb11112222333344445555bbbb@${idp}` }),
        );
      const createUserMock = jest
        .spyOn(KeycloakService.prototype, 'createUser')
        .mockImplementation(() => Promise.resolve({ id: 'user-1' }));
      const verifyMock = jest
        .spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid')
        .mockImplementation(() =>
          Promise.resolve({ guid: 'bbbbbbbb11112222333344445555bbbb', firstName: 'New', lastName: 'User' }),
        );

      await supertest(app)
        .post(
          `${API_BASE_PATH}/integrations/${integration.id}/dev/users/bbbbbbbb11112222333344445555bbbb@${idp}/roles-new`,
        )
        .send([{ name: 'role1' }])
        .set('Accept', 'application/json')
        .expect(201);

      expect(verifyMock).toHaveBeenCalledWith(idp, 'bbbbbbbb11112222333344445555bbbb', 'dev');
      expect(createUserMock).toHaveBeenCalled();
    },
  );

  it('verifies and imports a new azureidir user via MS Graph, then assigns the role', async () => {
    mockRoleAssignment();
    jest
      .spyOn(KeycloakService.prototype, 'getUser')
      .mockRejectedValueOnce(new (require('http-errors')[404])('not found'))
      .mockImplementationOnce(() =>
        Promise.resolve({ id: 'user-1', username: 'cccccccc11112222333344445555cccc@azureidir' }),
      );
    const createUserMock = jest
      .spyOn(KeycloakService.prototype, 'createUser')
      .mockImplementation(() => Promise.resolve({ id: 'user-1' }));
    const bceidVerifyMock = jest.spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid');
    const graphVerifyMock = jest
      .spyOn(MsGraphService.prototype, 'verifyAzureIdirAccountByGuid')
      .mockImplementation(() =>
        Promise.resolve({ guid: 'cccccccc11112222333344445555cccc', firstName: 'Az', lastName: 'User' }),
      );

    await supertest(app)
      .post(
        `${API_BASE_PATH}/integrations/${integration.id}/dev/users/cccccccc11112222333344445555cccc@azureidir/roles-new`,
      )
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(201);

    expect(bceidVerifyMock).not.toHaveBeenCalled();
    expect(graphVerifyMock).toHaveBeenCalledWith('cccccccc11112222333344445555cccc');
    expect(createUserMock).toHaveBeenCalled();
  });

  it.each(['githubbcgov', 'githubpublic'])(
    'assigns a role directly for an existing %s user without attempting provisioning',
    async (idp) => {
      mockRoleAssignment();
      const getUserMock = jest
        .spyOn(KeycloakService.prototype, 'getUser')
        .mockImplementation(() => Promise.resolve({ id: 'user-1', username: `existinguser@${idp}` }));
      const createUserMock = jest.spyOn(KeycloakService.prototype, 'createUser');
      const bceidVerifyMock = jest.spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid');
      const graphVerifyMock = jest.spyOn(MsGraphService.prototype, 'verifyAzureIdirAccountByGuid');

      const result = await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/existinguser@${idp}/roles-new`)
        .send([{ name: 'role1' }])
        .set('Accept', 'application/json')
        .expect(201);

      expect(createUserMock).not.toHaveBeenCalled();
      expect(bceidVerifyMock).not.toHaveBeenCalled();
      expect(graphVerifyMock).not.toHaveBeenCalled();
      expect(result.body.data[0].name).toBe('role1');
    },
  );

  it.each(['githubbcgov', 'githubpublic'])(
    'returns 404 for a non-existent %s user instead of attempting to auto-provision them',
    async (idp) => {
      jest.spyOn(KeycloakService.prototype, 'listClientRoles').mockImplementation(() => Promise.resolve(clientRoles));
      jest
        .spyOn(KeycloakService.prototype, 'getClient')
        .mockImplementation(() => Promise.resolve({ id: 'client-1', enabled: true, name: 'test client' }));
      // addClientUserRoleMapping looks the user up internally and 404s if not found; simulate that
      // here since we don't call getUser ourselves for non-auto-provisionable idps like github.
      jest
        .spyOn(KeycloakService.prototype, 'addClientUserRoleMapping')
        .mockRejectedValue(new (require('http-errors')[404])('user not found'));
      const createUserMock = jest.spyOn(KeycloakService.prototype, 'createUser');

      await supertest(app)
        .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/nonexistentuser@${idp}/roles-new`)
        .send([{ name: 'role1' }])
        .set('Accept', 'application/json')
        .expect(404);

      expect(createUserMock).not.toHaveBeenCalled();
    },
  );

  it('returns 400 for a username with no @ sign', async () => {
    mockRoleAssignment();
    jest.spyOn(KeycloakService.prototype, 'getUser').mockRejectedValue(new (require('http-errors')[404])('not found'));

    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/noatsignhere/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('returns 400 for a username with more than one @ sign', async () => {
    mockRoleAssignment();
    jest.spyOn(KeycloakService.prototype, 'getUser').mockRejectedValue(new (require('http-errors')[404])('not found'));

    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/some@guid@idir/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('returns 400 for an unrecognized/disallowed idp alias', async () => {
    mockRoleAssignment();
    jest.spyOn(KeycloakService.prototype, 'getUser').mockRejectedValue(new (require('http-errors')[404])('not found'));

    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/someguid@notreal/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('returns 400 when the upstream identity provider has no matching account', async () => {
    mockRoleAssignment();
    jest.spyOn(KeycloakService.prototype, 'getUser').mockRejectedValue(new (require('http-errors')[404])('not found'));
    const verifyMock = jest
      .spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid')
      .mockImplementation(() => Promise.resolve(null));

    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/dddddddd11112222333344445555dddd@idir/roles-new`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(400);

    expect(verifyMock).toHaveBeenCalled();
  });
});
