import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import {
  SSO_TEAM_IDIR_EMAIL,
  SSO_TEAM_IDIR_USER,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_USERNAME_01,
  postTeam,
  postTeamMembers,
} from './helpers/fixtures';
import { addMembersToTeam, createTeam, getMembersOfTeam, updateTeamMembers } from './helpers/modules/teams';
import { deleteInactiveUsers, getAuthenticatedUser } from './helpers/modules/users';
import { Integration } from 'app/interfaces/Request';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@lambda-shared/sequelize/models/models';
import { EMAILS } from '@lambda-shared/enums';
import { renderTemplate } from '@lambda-shared/templates';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';

const testUser = {
  username: TEAM_ADMIN_IDIR_USERNAME_01,
  email: TEAM_ADMIN_IDIR_EMAIL_01,
  attributes: {
    idir_user_guid: TEAM_ADMIN_IDIR_USERID_01,
    idir_username: TEAM_ADMIN_IDIR_USERNAME_01,
  },
  clientData: {},
};

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

describe('users and teams', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });
    let teamWithoutAdmins: number;
    let teamWithOtherAdmins: number;
    let nonTeamIntegration: Integration;
    let teamIntegration: Integration;
    let emailList: any;

    it('should allow sso team user to login', async () => {
      createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
      const result = await getAuthenticatedUser();
      expect(result.status).toEqual(200);
    });

    it('should create teams by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let createTeamRes = await createTeam({ ...postTeam, members: [] });
      teamWithoutAdmins = createTeamRes.body.id;
      expect(createTeamRes.status).toEqual(200);
      expect(createTeamRes.body.name).toEqual(postTeam.name);
      createTeamRes = await createTeam({ ...postTeam, members: [] });
      teamWithOtherAdmins = createTeamRes.body.id;
      const result = await addMembersToTeam(teamWithOtherAdmins, postTeamMembers);
      expect(result.status).toEqual(200);
      expect(result.body).not.toEqual([]);
      await updateTeamMembers(teamWithOtherAdmins);
    });

    it('should create an non team integration by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
      });
      expect(integrationRes.status).toEqual(200);
      nonTeamIntegration = integrationRes.body;
    });

    it('should create a team integration by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
        teamId: teamWithoutAdmins,
      });
      expect(integrationRes.status).toEqual(200);
      teamIntegration = integrationRes.body;
    });

    it('should add sso team account after removing the only team admin', async () => {
      emailList = createMockSendEmail();
      testUser.clientData = [{ client: teamIntegration.clientId, roles: ['test_role'] }];
      const deleteResponse = await deleteInactiveUsers(testUser);
      const template = await renderTemplate(EMAILS.DELETE_INACTIVE_IDIR_USER, {
        teamId: teamWithoutAdmins,
        username: testUser.username,
        clientId: testUser.clientData[0].client,
        roles: testUser.clientData[0].roles[0],
        teamAdmin: true,
      });
      expect(deleteResponse.status).toEqual(200);
      const user = await models.user.findOne({ where: { idir_userid: TEAM_ADMIN_IDIR_USERID_01 }, raw: true });
      expect(user).toBeNull();
      expect(emailList.length).toEqual(2);
      expect(emailList[0].subject).toEqual(template.subject);
      expect(emailList[0].body).toEqual(template.body);
      expect(emailList[0].to.length).toEqual(1);
      expect(emailList[0].to).toContain(TEAM_ADMIN_IDIR_EMAIL_01);
      expect(emailList[0].cc.length).toEqual(1);
      expect(emailList[0].cc[0]).toEqual(SSO_EMAIL_ADDRESS);
    });

    it('should verify the admin status of sso team user in team with only admin', async () => {
      createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
      const membersRes = await getMembersOfTeam(teamWithoutAdmins);
      expect(membersRes.status).toEqual(200);
      expect(membersRes.body.length).toEqual(1);
      expect(membersRes.body[0].idirUserid).toEqual(SSO_TEAM_IDIR_USER);
    });

    it('should verify the admin status of sso team user in team with other admins', async () => {
      createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
      const membersRes = await getMembersOfTeam(teamWithOtherAdmins);
      expect(membersRes.status).toEqual(200);
      expect(membersRes.body).toEqual([]);
    });

    it('should verify the transition of non team integration to sso team user', async () => {
      createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
      const user = await models.user.findOne({ where: { idirUserid: SSO_TEAM_IDIR_USER }, raw: true });
      const int = await models.request.findOne({ where: { id: nonTeamIntegration.id }, raw: true });
      expect(int.userId).toEqual(user.id);
    });

    it('should verify the transition of team integration to sso team user', async () => {
      createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
      const user = await models.user.findOne({ where: { idirUserid: SSO_TEAM_IDIR_USER }, raw: true });
      const int = await models.request.findOne({ where: { id: teamIntegration.id }, raw: true });
      expect(int.userId).toEqual(user.id);
    });
  } catch (err) {
    console.error('EXCEPTION : ', err);
  }
});
