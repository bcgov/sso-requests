import { renderTemplate } from '@app/shared/templates';
import { EMAILS } from '@app/shared/enums';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  postTeam,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_ADMIN_IDIR_EMAIL_03,
} from './helpers/fixtures';
import { activateTeamPendingUsers, cleanUpDatabaseTables } from './helpers/utils';
import { createTeam, deleteMembersOfTeam, deleteTeam, getMembersOfTeam } from './helpers/modules/teams';
import { createMockSendEmail } from './__mocks__/mail';
import { createMockAuth } from './__mocks__/authenticate';

const TEST_TOKEN = 'testtoken';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/helpers/token', () => {
  const actual = jest.requireActual('@app/helpers/token');
  return {
    ...actual,
    generateInvitationToken: jest.fn(() => TEST_TOKEN),
  };
});

describe('emails for teams', () => {
  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  let emailList: any = [];
  let team: any = {};

  it('should create a team', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    emailList = createMockSendEmail();
    const result = await createTeam(postTeam);
    expect(result.statusCode).toEqual(200);
    team = result.body;
  });

  it('should render the expected template in the teams invitation email sent to users', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const template = await renderTemplate(EMAILS.TEAM_INVITATION, { team, invitationLink: TEST_TOKEN, role: 'admin' });
    // four users are being added when creating a team
    expect(emailList.length).toEqual(4);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(1);
    expect(emailList[0].to[0]).toEqual(TEAM_ADMIN_IDIR_EMAIL_02);
    expect(emailList[0].cc.length).toEqual(0);
  });

  it('should render the expected template in the email being sent to deleted user', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    await activateTeamPendingUsers(team.id);
    const teamUsersRes = await getMembersOfTeam(team.id);
    expect(teamUsersRes.status).toEqual(200);
    const teamUsers = teamUsersRes.body;
    const user = teamUsers.find((member: any) => member.role === 'member');
    const payload = {
      team,
      user,
    };
    emailList = createMockSendEmail();
    await deleteMembersOfTeam(team.id, user.id);
    const templates = await Promise.all([
      renderTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, payload),
      renderTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, payload),
    ]);

    expect(emailList.length).toEqual(2);

    for (let x = 0; x < templates.length; x++) {
      const template = templates[x];
      const email = emailList.find((email: any) => email.code === template.code);
      expect(email).toBeTruthy();

      // TEAM_MEMBER_DELETED_ADMINS
      if (x === 0) {
        expect(email.subject).toEqual(template.subject);
        expect(email.body).toEqual(template.body);
        expect(email.to.length).toEqual(3);
        expect(email.to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
        expect(email.to).toContain(TEAM_ADMIN_IDIR_EMAIL_02);
        expect(email.to).toContain(TEAM_ADMIN_IDIR_EMAIL_03);
        expect(email.cc.length).toEqual(0);
      }
      // TEAM_MEMBER_DELETED_USER_REMOVED
      else {
        expect(email.subject).toEqual(template.subject);
        expect(email.body).toEqual(template.body);
        expect(email.to.length).toEqual(1);
        expect(email.to).toEqual([user.idirEmail]);
        expect(email.cc.length).toEqual(0);
      }
    }
  });

  it('should render the expected template in the email sent after team is deleted', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    emailList = createMockSendEmail();
    await deleteTeam(team.id);
    const template = await renderTemplate(EMAILS.TEAM_DELETED, { team });
    expect(emailList.length).toEqual(1);
    expect(emailList[0].subject).toEqual(template.subject);
    expect(emailList[0].body).toEqual(template.body);
    expect(emailList[0].to.length).toEqual(4);
    expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
    expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_02);
    expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_03);
    expect(emailList[0].cc.length).toEqual(0);
  });
});
