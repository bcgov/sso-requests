import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from '../constants';
import { models } from '@lambda-shared/sequelize/models/models';

export const getTeams = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/teams`);
};

export const createTeam = async (data: { name: string; members: { idirEmail: string; role: string }[] }) => {
  return await supertest(app).post(`${APP_BASE_PATH}/teams`).send(data).set('Accept', 'application/json');
};

export const updateTeam = async (teamId: number, data: { name: string }) => {
  return await supertest(app).put(`${APP_BASE_PATH}/teams/${teamId}`).send(data).set('Accept', 'application/json');
};

export const addMembersToTeam = async (teamId: number, data: { idirEmail: string; role: string }[]) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/teams/${teamId}/members`)
    .send(data)
    .set('Accept', 'application/json');
};

export const getMembersOfTeam = async (teamId: number) => {
  return await supertest(app).get(`${APP_BASE_PATH}/teams/${teamId}/members`);
};

export const verifyTeamMember = async (token: string) => {
  return await supertest(app).get(`${APP_BASE_PATH}/teams/verify${token ? '?token=' + token : ''}`);
};

export const deleteMembersOfTeam = async (teamId: number, userId: number) => {
  return await supertest(app).del(`${APP_BASE_PATH}/teams/${teamId}/members/${userId}`);
};

export const sendTeamInvite = async (teamId: number, data: { idirEmail: string; role: string }) => {
  return await supertest(app)
    .post(`${APP_BASE_PATH}/teams/${teamId}/invite`)
    .send(data)
    .set('Accept', 'application/json');
};

export const deleteTeam = async (teamId: number) => {
  return await supertest(app).del(`${APP_BASE_PATH}/teams/${teamId}`);
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
