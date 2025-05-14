import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import { models } from '@app/shared/sequelize/models/models';
import teamsHandler from '@app/pages/api/teams';
import teamHandler from '@app/pages/api/teams/[teamId]';
import teamMembersHandler from '@app/pages/api/teams/[teamId]/members';
import teamMemberHandler from '@app/pages/api/teams/[teamId]/members/[memberId]';
import teamVerifyHandler from '@app/pages/api/teams/verify';
import teamInviteHandler from '@app/pages/api/teams/[teamId]/invite';

export const getTeams = async () => {
  return await testClient(teamsHandler).get(`${API_BASE_PATH}/teams`);
};

export const createTeam = async (data: { name: string; members: { idirEmail: string; role: string }[] }) => {
  return await testClient(teamsHandler).post(`${API_BASE_PATH}/teams`).send(data).set('Accept', 'application/json');
};

export const updateTeam = async (teamId: number, data: { name: string }) => {
  return await testClient(teamHandler)
    .put(`${API_BASE_PATH}/teams/${teamId}`)
    .send(data)
    .set('Accept', 'application/json');
};

export const addMembersToTeam = async (teamId: number, data: { idirEmail: string; role: string }[]) => {
  return await testClient(teamMembersHandler)
    .post(`${API_BASE_PATH}/teams/${teamId}/members`)
    .send(data)
    .set('Accept', 'application/json');
};

export const getMembersOfTeam = async (teamId: number) => {
  return await testClient(teamMembersHandler).get(`${API_BASE_PATH}/teams/${teamId}/members`);
};

export const verifyTeamMember = async (token: string) => {
  return await testClient(teamVerifyHandler).get(`${API_BASE_PATH}/teams/verify${token ? '?token=' + token : ''}`);
};

export const deleteMembersOfTeam = async (teamId: number, userId: number) => {
  return await testClient(teamMemberHandler).delete(`${API_BASE_PATH}/teams/${teamId}/members/${userId}`);
};

export const sendTeamInvite = async (teamId: number, data: { idirEmail: string; role: string }) => {
  return await testClient(teamInviteHandler)
    .post(`${API_BASE_PATH}/teams/${teamId}/invite`)
    .send(data)
    .set('Accept', 'application/json');
};

export const deleteTeam = async (teamId: number) => {
  return await testClient(teamHandler).del(`${API_BASE_PATH}/teams/${teamId}`);
};

export const updateTeamMember = async (teamId: number, memberId: number, data: { role: string }) => {
  return await testClient(teamMemberHandler)
    .put(`${API_BASE_PATH}/teams/${teamId}/members/${memberId}`)
    .send(data)
    .set('Accept', 'application/json');
};

export const updateTeamMembers = async (teamId: number) => {
  await models.usersTeam.update(
    { pending: false },
    {
      where: {
        teamId,
      },
    },
  );
};
