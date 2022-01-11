import { instance } from './axios';
import { AxiosError } from 'axios';
import { Team, User } from 'interfaces/team';
import { handleAxiosError } from 'services/axios';

export const getTeams = async (): Promise<[Team[], null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('teams').then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const createTeam = async (data: any): Promise<[Team, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('teams', data).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};

export const addTeamMembers = async (data: { members: User[]; id?: number }) => {
  try {
    const { id, members } = data;
    const result = await instance.post(`teams/${id}/members`, members).then((res) => res.data);
    return [result, null];
  } catch (err) {
    handleAxiosError(err);
  }
};

export const getTeamMembers = async (id?: number) => {
  try {
    const result = await instance.get(`teams/${id}/members`).then((res) => res.data);
    return [result, null];
  } catch (err) {
    return handleAxiosError(err);
  }
};
