import { authenticate } from '@lambda-app/authenticate';
import { renderTemplate } from '@lambda-shared/templates';
import { sendEmail } from '@lambda-shared/utils/ches';
import { EMAILS } from '@lambda-shared/enums';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, TEST_IDIR_EMAIL_2, AuthMock } from './00.db.test';
import { Integration } from './helpers/integration';

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
const mockedSendEmail = sendEmail as jest.Mock<any>;

mockedAuthenticate.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

const setMockedSendEmail = () => {
  const result = [];
  mockedSendEmail.mockImplementation((data: any) => {
    result.push(data);
    return Promise.resolve(null);
  });

  return result;
};

describe('Feature: Invite Team Members - Team invitation email', () => {
  let emailList: any = [];
  let team;

  const integration = new Integration();

  it('should create a team and send invitations', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.createTeam();
    expect(res.statusCode).toEqual(200);
    team = res.data;
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const template = await renderTemplate(EMAILS.TEAM_INVITATION, { team, invitationLink: TEST_TOKEN });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEST_IDIR_EMAIL_2);
    expect(emailList[0].cc.length).toEqual(0);
  });
});
