import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_ADMIN_IDIR_EMAIL_03,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_USERID_03,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  postTeam,
  postTeamMembers,
  putTeam,
} from './helpers/fixtures';
import {
  addMembersToTeam,
  createTeam,
  deleteMembersOfTeam,
  deleteTeam,
  getMembersOfTeam,
  getTeams,
  sendTeamInvite,
  updateTeam,
  verifyTeamMember,
} from './helpers/modules/teams';
import { getAuthenticatedUser } from './helpers/modules/users';
import { generateInvitationToken } from '@app/helpers/token';
import { sendEmail } from '@app/utils/ches';
import { models } from '@app/shared/sequelize/models/models';
import { findOrCreateUser } from '@app/controllers/user';

jest.mock('@app/controllers/requests', () => {
  const original = jest.requireActual('@app/controllers/requests');
  return {
    ...original,
    processIntegrationRequest: jest.fn(() => true),
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
    let teamId: number;
    let teamCreatorId: number;
    let teamMemberIds: number[];

    it('should find user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getAuthenticatedUser();
      expect(result.status).toEqual(200);
      expect(result.body.idirUserid).toEqual(TEAM_ADMIN_IDIR_USERID_01);
      expect(result.body.idirEmail).toEqual(TEAM_ADMIN_IDIR_EMAIL_01);
      teamCreatorId = result.body.id;
    });

    it('should find empty team list', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getTeams();
      expect(result.status).toEqual(200);
      expect(result.body.length).toEqual(0);
    });

    it('should create a team by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createTeam({ ...postTeam, members: [] });
      teamId = result.body.id;
      expect(result.status).toEqual(200);
      expect(result.body.name).toEqual(postTeam.name);
    });

    it('should not allow the only team admin to leave the team', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await deleteMembersOfTeam(teamId, teamCreatorId);
      expect(result.status).toEqual(403);
    });

    it('should find team created by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getTeams();
      expect(result.status).toEqual(200);
      expect(result.body.length).toEqual(1);
    });

    it('should not find any teams for a different user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
      const result = await getTeams();
      expect(result.status).toEqual(200);
      expect(result.body.length).toEqual(0);
    });

    it('should update team created by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await updateTeam(teamId, putTeam);
      expect(result.status).toEqual(200);
      expect(result.body.name).toEqual(putTeam.name);
    });

    it('should add members to team created by team admin', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await addMembersToTeam(teamId, postTeamMembers);
      expect(result.status).toEqual(200);
      expect(result.body).not.toEqual([]);
      teamMemberIds = result.body;
      const membersRes = await getMembersOfTeam(teamId);
      expect(membersRes.status).toEqual(200);
      const postTeamMembersEmails = postTeamMembers.map((member) => member.idirEmail);
      const memberEmails = membersRes.body.map((member: any) => member.idirEmail);
      postTeamMembersEmails.forEach((mem) => {
        expect(memberEmails).toContain(mem);
      });
    });

    it('should not add duplicate users upon inviting to a team by admin', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const teamsRes = await createTeam({
        name: 'dummy_team',
        members: [
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_02,
            role: 'admin',
          },
        ],
      });
      expect(teamsRes.status).toEqual(200);
      expect(teamsRes.body.name).toEqual('dummy_team');
      const newUsers = await models.user.findAll({ where: { idirEmail: TEAM_ADMIN_IDIR_EMAIL_02 } });
      expect(newUsers.length).toBe(1);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not allow pending team members from reading teams membership', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
      const teamsRes = await getTeams();
      expect(teamsRes.status).toEqual(200);
      expect(teamsRes.body).toEqual([]);
    });

    it('should be redirected without team token to validate', async () => {
      const result = await verifyTeamMember('');
      expect(result.status).toEqual(307);
      expect(result.headers.location).toEqual('/verify-user?message=notoken');
    });

    it('should have an error with invalid team invitation token', async () => {
      const result = await verifyTeamMember('qerasdf');
      expect(result.status).toEqual(307);
      expect(result.headers.location).toEqual('/verify-user?message=malformed');
    });

    it('should verify team admins added by the admin', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
      const userRes = await getAuthenticatedUser();
      const token = generateInvitationToken(userRes.body as any, teamId);
      await verifyTeamMember(token);
      const users = await models.usersTeam.findAll({ where: { userId: userRes.body.id, teamId } });
      expect(users[0].pending).not.toBeTruthy;
    });

    it('should verify team members added by the admin', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const userRes = await getAuthenticatedUser();
      const token = generateInvitationToken(userRes.body as any, teamId);
      await verifyTeamMember(token);
      const users = await models.usersTeam.findAll({ where: { userId: userRes.body.id, teamId } });
      expect(users[0].pending).not.toBeTruthy;
    });

    it('should not allow non-admins to add users to their team', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await addMembersToTeam(teamId, [{ idirEmail: 'test_user', role: 'member' }]);
      expect(result.status).toEqual(403);
    });

    it('should block pending admins from removing team members', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_03, TEAM_ADMIN_IDIR_EMAIL_03);
      const result = await deleteMembersOfTeam(teamId, teamMemberIds[0]);
      expect(result.status).toEqual(403);
    });

    it('should not allow team members to remove other team members or admins', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await deleteMembersOfTeam(teamId, teamMemberIds[0]);
      expect(result.status).toEqual(403);
    });

    it('should allow admins to remove team members', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
      const result = await deleteMembersOfTeam(teamId, teamMemberIds[teamMemberIds.length - 1]);
      expect(result.status).toEqual(200);
    });

    it('should allow admins to re-send invitations', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await sendTeamInvite(teamId, postTeamMembers[0]);
      expect(result.status).toEqual(200);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not allow non-admins to resend invitations', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await sendTeamInvite(teamId, postTeamMembers[2]);
      expect(result.status).toEqual(403);
    });

    it('should not allow non-admins to delete team', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await deleteTeam(teamId);
      expect(result.status).toEqual(403);
    });

    it('should allow team admins to delete team', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await deleteTeam(teamId);
      expect(result.status).toEqual(200);
    });
  } catch (err) {
    console.error('EXCEPTION : ', err);
  }
});

describe('User creation and Updating', () => {
  beforeAll(async () => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  it('creates a new user if neither email nor idir_userid exists in the database', async () => {
    await findOrCreateUser({
      idir_userid: 'TESTUSER',
      email: 'a@b.com',
      client_roles: [],
      given_name: 'TEST',
      family_name: 'TEST',
    });

    const users = await models.user.findAll();
    expect(users.length).toBe(1);
    expect(users[0].idirUserid).toBe('TESTUSER');
    expect(users[0].idirEmail).toBe('a@b.com');
  });

  it('Updates the existing information when email already exists in the database', async () => {
    // User exists with only email via invite
    await models.user.create({
      idirEmail: 'a@b.com',
    });

    let users = await models.user.findAll();
    expect(users.length).toBe(1);
    expect(users[0].idirUserid).toBeNull();

    // Add user with same email address, more info
    await findOrCreateUser({
      idir_userid: 'TESTUSER',
      email: 'a@b.com',
      client_roles: [],
      given_name: 'TEST',
      family_name: 'TEST',
    });

    users = await models.user.findAll();
    expect(users.length).toBe(1);
    expect(users[0].idirUserid).toBe('TESTUSER');
    expect(users[0].idirEmail).toBe('a@b.com');
  });

  it('Cleans up users if re-invited on a new email address and existing GUID', async () => {
    // User initially exists with an old email and id
    await models.user.create({
      idirEmail: 'old@email.com',
      idirUserid: 'TEST',
    });

    // User invited with new email. No guid inserted yet since hasn't logged in
    await models.user.create({
      idirEmail: 'second@email.com',
    });

    // Simulate login step using new email from invite, same guid as before
    await findOrCreateUser({
      idir_userid: 'TEST',
      email: 'second@email.com',
      client_roles: [],
      given_name: 'TEST',
      family_name: 'TEST',
    });

    // Only one user record with expected guid and new email address in DB
    const users = await models.user.findAll();
    expect(users.length).toBe(1);
    expect(users[0].idirUserid).toBe('TEST');
    expect(users[0].idirEmail).toBe('second@email.com');
  });
});
