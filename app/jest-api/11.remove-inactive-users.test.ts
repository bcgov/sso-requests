import { cleanUpDatabaseTables } from './helpers/utils';
import {
  SSO_TEAM_IDIR_EMAIL,
  SSO_TEAM_IDIR_USER,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_ADMIN_IDIR_EMAIL_03,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_USERNAME_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  postTeam,
  postTeamMembers,
} from './helpers/fixtures';
import { addMembersToTeam, createTeam, getMembersOfTeam, updateTeamMembers } from './helpers/modules/teams';
import { deleteInactiveUsers, getAuthenticatedUser } from './helpers/modules/users';
import { Integration } from '@app/interfaces/Request';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@app/shared/sequelize/models/models';
import { EMAILS } from '@app/shared/enums';
import { renderTemplate } from '@app/shared/templates';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { deleteIntegration } from './helpers/modules/integrations';
import { createMockAuth } from './mocks/authenticate';
import { createMockSendEmail } from './mocks/mail';

const testUser: any = {
  username: TEAM_ADMIN_IDIR_USERNAME_01,
  email: TEAM_ADMIN_IDIR_EMAIL_01,
  attributes: {
    idir_user_guid: TEAM_ADMIN_IDIR_USERID_01,
    idir_username: TEAM_ADMIN_IDIR_USERNAME_01,
  },
  clientData: {},
  env: 'prod',
};

const authenticateAsTestUser = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/keycloak/client', () => {
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
        username: testUser?.username,
        clientId: testUser?.clientData[0]?.client,
        roles: testUser.clientData[0].roles[0],
        teamAdmin: true,
        env: 'prod',
      });
      expect(deleteResponse.status).toEqual(200);
      const user = await models.user.findOne({ where: { idir_userid: TEAM_ADMIN_IDIR_USERID_01 }, raw: true });
      expect(user).toBeNull();

      /* Expect 4 emails:
        - User with roles deleted email
        - Orphaned integration email for the directly owned request
        - Orphaned integration email for the team request (since this was the only admin on it)
        - Team update email
      */
      expect(emailList.length).toEqual(4);
      expect(emailList.filter((email: any) => email.code === EMAILS.DELETE_INACTIVE_IDIR_USER).length).toBe(1);
      expect(emailList.filter((email: any) => email.code === EMAILS.ORPHAN_INTEGRATION).length).toBe(2);
      expect(emailList.filter((email: any) => email.code === EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM).length).toBe(
        1,
      );
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

describe('Deleted user emails', () => {
  afterEach(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();
  });

  beforeEach(async () => {
    await models.user.create({ idirUserid: SSO_TEAM_IDIR_USER, idirEmail: SSO_TEAM_IDIR_EMAIL });
    await models.user.create({ idirUserid: TEAM_ADMIN_IDIR_USERID_01, idirEmail: TEAM_ADMIN_IDIR_EMAIL_01 });
  });

  describe('Roles Emails', () => {
    beforeEach(async () => {
      authenticateAsTestUser();
    });

    it('Sends the roles email to a direct integration owner when a user with roles on the integration is deleted', async () => {
      const emailList = createMockSendEmail();
      const request = await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
      });
      testUser.clientData = [{ client: request.body.clientId, roles: ['role1', 'role2'] }];

      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.DELETE_INACTIVE_IDIR_USER,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(1);
      expect(deleteInactiveIntegrationEmails[0].to.includes(TEAM_ADMIN_IDIR_EMAIL_01)).toBeTruthy();
      expect(deleteInactiveIntegrationEmails[0].to.length).toBe(1);
    });

    it('Does not send the roles email if no client roles are provided', async () => {
      const emailList = createMockSendEmail();
      await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
      });
      testUser.clientData = [];

      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.DELETE_INACTIVE_IDIR_USER,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(0);
    });

    it('Sends the roles email to all team admins and members when a user with roles on the integration is deleted', async () => {
      const emailList = createMockSendEmail();
      const adminTeam = await createTeam({
        name: 'test_team',
        members: [
          {
            idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
            role: 'member',
          },
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_01,
            role: 'admin',
          },
        ],
      });
      await updateTeamMembers(adminTeam.body.id);

      const request = await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
        teamId: adminTeam.body.id,
      });

      testUser.clientData = [{ client: request.body.clientId, roles: ['role1', 'role2'] }];
      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.DELETE_INACTIVE_IDIR_USER,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(1);
      expect(deleteInactiveIntegrationEmails[0].to.includes(TEAM_MEMBER_IDIR_EMAIL_01)).toBeTruthy();
      expect(deleteInactiveIntegrationEmails[0].to.includes(TEAM_ADMIN_IDIR_EMAIL_01)).toBeTruthy();
    });
  });

  describe('Orphaned Emails', () => {
    it('Sends the orphaned integration email to sso email address when the last team admin is deleted for each orphaned integration', async () => {
      authenticateAsTestUser();
      const emailList = createMockSendEmail();
      // Authenticated user gets admin status on the created team.
      const adminTeam = await createTeam({
        name: 'test_team',
        members: [
          {
            idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
            role: 'member',
          },
        ],
      });
      await updateTeamMembers(adminTeam.body.id);
      const firstProjectName = 'First Project';
      const secondProjectName = 'Second Project';
      await buildIntegration({
        projectName: firstProjectName,
        submitted: true,
        teamId: adminTeam.body.id,
      });
      await buildIntegration({
        projectName: secondProjectName,
        submitted: true,
        teamId: adminTeam.body.id,
      });

      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.ORPHAN_INTEGRATION,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(2);
      expect(deleteInactiveIntegrationEmails[0].body.includes(firstProjectName)).toBeTruthy();
      expect(deleteInactiveIntegrationEmails[1].body.includes(secondProjectName)).toBeTruthy();
    });

    it('Does not send the orphaned integration email when additional team admins exist', async () => {
      authenticateAsTestUser();
      const emailList = createMockSendEmail();
      const adminTeam = await createTeam({
        name: 'test_team',
        members: [
          {
            idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
            role: 'admin',
          },
        ],
      });

      await updateTeamMembers(adminTeam.body.id);
      await buildIntegration({
        projectName: 'project',
        submitted: true,
        teamId: adminTeam.body.id,
      });

      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.ORPHAN_INTEGRATION,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(0);
    });

    it('Sends the orphaned integration email to sso email address when a directly owned integration is deleted', async () => {
      const emailList = createMockSendEmail();
      authenticateAsTestUser();
      await buildIntegration({
        projectName: 'project',
        submitted: true,
      });
      await deleteInactiveUsers(testUser);
      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.ORPHAN_INTEGRATION,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(1);
    });
  });

  describe('Membership change', () => {
    it('Sends the membership-change email to all other team admins, but not team members', async () => {
      authenticateAsTestUser();
      const emailList = createMockSendEmail();
      const adminTeam = await createTeam({
        name: 'test_team',
        members: [
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_02,
            role: 'admin',
          },
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_03,
            role: 'admin',
          },
          {
            idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
            role: 'member',
          },
        ],
      });
      await updateTeamMembers(adminTeam.body.id);
      await buildIntegration({
        projectName: 'project',
        submitted: true,
        teamId: adminTeam.body.id,
      });

      await deleteInactiveUsers(testUser);
      const removeTeamMemberEmails = emailList.filter(
        (email: any) => email.code === EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM,
      );
      expect(removeTeamMemberEmails.length).toBe(1);
      expect(removeTeamMemberEmails[0].to.length).toBe(2);
      expect(removeTeamMemberEmails[0].to.includes(TEAM_ADMIN_IDIR_EMAIL_02)).toBeTruthy();
      expect(removeTeamMemberEmails[0].to.includes(TEAM_ADMIN_IDIR_EMAIL_03)).toBeTruthy();
      expect(removeTeamMemberEmails[0].to.includes(TEAM_MEMBER_IDIR_EMAIL_01)).toBeFalsy();
    });

    it('Sends the membership-change email when non-admins leave', async () => {
      // Create a member-user for the team
      await models.user.create({ idirUserid: TEAM_MEMBER_IDIR_USERID_01, idirEmail: TEAM_MEMBER_IDIR_EMAIL_01 });
      authenticateAsTestUser();
      const emailList = createMockSendEmail();
      const adminTeam = await createTeam({
        name: 'test_team',
        members: [
          {
            idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
            role: 'member',
          },
        ],
      });
      await updateTeamMembers(adminTeam.body.id);
      await buildIntegration({
        projectName: 'project',
        submitted: true,
        teamId: adminTeam.body.id,
      });

      await deleteInactiveUsers({
        username: TEAM_MEMBER_IDIR_USERID_01,
        email: TEAM_MEMBER_IDIR_EMAIL_01,
        attributes: {
          idir_user_guid: TEAM_MEMBER_IDIR_USERID_01,
          idir_username: TEAM_MEMBER_IDIR_USERID_01,
        },
        clientData: {},
        env: 'prod',
      });

      const removeTeamMemberEmails = emailList.filter(
        (email: any) => email.code === EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM,
      );
      expect(removeTeamMemberEmails.length).toBe(1);
      expect(removeTeamMemberEmails[0].to.length).toBe(1);
      expect(removeTeamMemberEmails[0].to.includes(TEAM_ADMIN_IDIR_EMAIL_01)).toBeTruthy();
    });
  });
});

describe('Environment Check', () => {
  beforeAll(async () => {
    await cleanUpDatabaseTables();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();
  });

  beforeEach(async () => {
    await models.user.create({ idirUserid: SSO_TEAM_IDIR_USER, idirEmail: SSO_TEAM_IDIR_EMAIL });
    await models.user.create({ idirUserid: TEAM_ADMIN_IDIR_USERID_01, idirEmail: TEAM_ADMIN_IDIR_EMAIL_01 });
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
  });

  it('Only removes users in CSS when they are deleted from the production environment', async () => {
    testUser.env = 'dev';
    await deleteInactiveUsers(testUser);
    let user = await models.user.findOne({ where: { idir_email: testUser.email }, raw: true });
    expect(user).not.toBeNull();

    testUser.env = 'test';
    await deleteInactiveUsers(testUser);
    user = await models.user.findOne({ where: { idir_email: testUser.email }, raw: true });
    expect(user).not.toBeNull();

    testUser.env = 'prod';
    await deleteInactiveUsers(testUser);
    user = await models.user.findOne({ where: { idir_email: testUser.email }, raw: true });
    expect(user).toBeNull();
  });

  it('Sends role information for all environments, and team admin information only for production', async () => {
    let emailList = createMockSendEmail();
    const adminTeam = await createTeam({
      name: 'test_team',
      members: [
        {
          idirEmail: TEAM_ADMIN_IDIR_EMAIL_01,
          role: 'admin',
        },
        {
          idirEmail: TEAM_ADMIN_IDIR_EMAIL_02,
          role: 'admin',
        },
      ],
    });
    await updateTeamMembers(adminTeam.body.id);
    const request = await buildIntegration({
      projectName: 'Delete Inactive Users',
      bceid: false,
      prodEnv: false,
      submitted: true,
      teamId: adminTeam.body.id,
    });

    for (const env of ['dev', 'test', 'prod']) {
      // Reset mocks between env tests
      if (emailList.length) {
        jest.clearAllMocks();
        createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
        emailList = createMockSendEmail();
      }

      testUser.env = env;
      testUser.clientData = [{ client: request.body.clientId, roles: ['role1', 'role2'] }];
      await deleteInactiveUsers(testUser);

      const deleteInactiveIntegrationEmails = emailList.filter(
        (email: any) => email.code === EMAILS.DELETE_INACTIVE_IDIR_USER,
      );
      const deleteInactiteamMembershipChangeEmails = emailList.filter(
        (email: any) => email.code === EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM,
      );
      expect(deleteInactiveIntegrationEmails.length).toBe(1);

      // Only does team admin notification for prod users
      if (env === 'prod') {
        expect(deleteInactiteamMembershipChangeEmails.length).toBe(1);
      } else {
        expect(deleteInactiteamMembershipChangeEmails.length).toBe(0);
      }

      // Always sends role information
      expect(deleteInactiveIntegrationEmails[0].body.includes('role1')).toBeTruthy();
      expect(deleteInactiveIntegrationEmails[0].body.includes('role2')).toBeTruthy();
      expect(deleteInactiveIntegrationEmails[0].body.includes(env)).toBeTruthy();
    }
  });
});
