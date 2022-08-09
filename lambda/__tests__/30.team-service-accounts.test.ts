import { authenticate } from '@lambda-app/authenticate';
import { sendEmail } from '@lambda-shared/utils/ches';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';
import { Integration } from './helpers/integration';
import { models } from '../shared/sequelize/models/models';

const TEST_TOKEN = 'testtoken';

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

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

let serviceAccount;

mockedAuthenticate.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

describe('CSS API Account', () => {
  const integration = new Integration();

  it('should create a team', async () => {
    const res = await integration.createTeam();
    expect(res.statusCode).toEqual(200);
  });

  it('should allow admins to create CSS API Account belonging to that team', async () => {
    const res = await integration.createServiceAccount();
    expect(res.statusCode).toEqual(200);
    serviceAccount = res.data;
    expect(serviceAccount.apiServiceAccount).toBe(true);
    expect(serviceAccount.usesTeam).toBe(true);
    expect(serviceAccount.serviceType).toBe('gold');
    expect(sendEmail).toHaveBeenCalled();
  });

  it('should allow admins to delete CSS API Account belonging to that team', async () => {
    const res = await integration.deleteServiceAccount();
    expect(res.statusCode).toEqual(200);

    const deletedServiceAccount = await models.request.findOne({ where: { id: serviceAccount.id } });

    expect(deletedServiceAccount.archived).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('should remove the team', async () => {
    const res = await integration.removeTeam();
    expect(res.statusCode).toEqual(200);
  });
});
