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
import { generateInvitationToken } from '@lambda-app/helpers/token';
import { sendEmail } from '@lambda-shared/utils/ches';
import { models } from '@lambda-shared/sequelize/models/models';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
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
    let teamMemberIds: number[];

    it('should find user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getAuthenticatedUser();
      expect(result.status).toEqual(200);
      expect(result.body.idirUserid).toEqual(TEAM_ADMIN_IDIR_USERID_01);
      expect(result.body.idirEmail).toEqual(TEAM_ADMIN_IDIR_EMAIL_01);
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
      const memberEmails = membersRes.body.map((member) => member.idirEmail);
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
      const result = await verifyTeamMember(null);
      expect(result.status).toEqual(302);
      expect(result.headers.location).toEqual('/verify-user?message=notoken');
    });

    it('should have an error with invalid team invitation token', async () => {
      const result = await verifyTeamMember('qerasdf');
      expect(result.status).toEqual(302);
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
      expect(result.status).toEqual(401);
    });

    it('should block pending admins from removing team members', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_03, TEAM_ADMIN_IDIR_EMAIL_03);
      const result = await deleteMembersOfTeam(teamId, teamMemberIds[0]);
      expect(result.status).toEqual(401);
    });

    it('should not allow team members to remove other team members or admins', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await deleteMembersOfTeam(teamId, teamMemberIds[0]);
      expect(result.status).toEqual(401);
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
      expect(result.status).toEqual(401);
    });

    it('should not allow non-admins to delete team', async () => {
      createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
      const result = await deleteTeam(teamId);
      expect(result.status).toEqual(401);
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
