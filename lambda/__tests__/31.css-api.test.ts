import app from './helpers/server';
import supertest from 'supertest';
import { authenticate } from '@lambda-app/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';
import { models } from '../shared/sequelize/models/models';
import { Integration } from './helpers/integration';

const BASE_PATH = '/api/v1';
const TEST_TOKEN = 'testtoken';
let integration = new Integration();

jest.mock('@lambda-app/authenticate');
jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
    closeOpenPullRequests: jest.fn(() => Promise.resolve()),
  };
});
jest.mock('@lambda-app/helpers/token', () => {
  const actual = jest.requireActual('@lambda-app/helpers/token');
  return {
    ...actual,
    generateInvitationToken: jest.fn(() => TEST_TOKEN),
  };
});
jest.mock('@lambda-shared/utils/ches');

export type ApiAuthData = {
  teamId: number;
};

export type ApiAuthMock = Promise<{
  success: boolean;
  data: ApiAuthData;
  err: string | null;
}>;

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

mockedAuthenticate.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

let teamRequest;

jest.mock('../css-api/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: integration.team.id },
        err: null,
      });
    }),
  };
});

describe('create team and gold integration', () => {
  let user;

  beforeAll(async () => {
    jest.clearAllMocks();
    user = await models.user.findOne({ where: { id: 1 } });
    teamRequest = await integration.create({ usesTeam: true, serviceType: 'gold' });
    integration.set({ devIdps: ['idir'], environments: ['dev', 'test', 'prod'], prodValidRedirectUris: ['https://a'] });
    await integration.submit();
    await integration.success();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('gets api heartbeat', async () => {
    await supertest(app).get(`${BASE_PATH}/heartbeat`).expect(200);
  });
  it('gets team integrations', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations`).expect(200);
    expect(result.body.data.length).toBe(1);
  });
  it('gets team integration by id', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}`).expect(200);
    expect(result.body.data.id).toBe(integration.int.id);
  });
});
