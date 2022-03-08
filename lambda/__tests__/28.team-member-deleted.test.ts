import { authenticate } from '@lambda-app/authenticate';
import { renderTemplate } from '@lambda-shared/templates';
import { sendEmail } from '@lambda-shared/utils/ches';
import { EMAILS } from '@lambda-shared/enums';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS } from '@lambda-shared/local';
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

describe('Feature: Delete Team Member - Team member removal email', () => {
  let emailList: any = [];

  const integration = new Integration();

  it('should create a team', async () => {
    const res = await integration.createTeam();
    expect(res.statusCode).toEqual(200);
  });

  it('should remove a first member', async () => {
    emailList = setMockedSendEmail();

    const res = await integration.removeMember();
    expect(res.statusCode).toEqual(200);
  });

  it('should render the expected template and send it to the expected emails', async () => {
    const payload = { team: integration.team, user: integration.firstTeamMember };
    const templates = await Promise.all([
      renderTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, payload),
      renderTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, payload),
    ]);

    expect(emailList.length).toEqual(2);

    for (let x = 0; x < templates.length; x++) {
      const template = templates[x];
      const email = emailList.find((email) => email.code === template.code);
      expect(email).toBeTruthy();

      // TEAM_MEMBER_DELETED_ADMINS
      if (x === 0) {
        expect(email.subject).toEqual(template.subject);
        expect(email.body).toEqual(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([TEST_IDIR_EMAIL]);
        expect(email.cc.length).toEqual(0);
      }
      // TEAM_MEMBER_DELETED_USER_REMOVED
      else {
        expect(email.subject).toEqual(template.subject);
        expect(email.body).toEqual(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([TEST_IDIR_EMAIL_2]);
        expect(email.cc.length).toEqual(0);
      }
    }
  });
});
