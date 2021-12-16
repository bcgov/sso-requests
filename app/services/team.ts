import { instance } from './axios';
import { AxiosError } from 'axios';
import { Team } from 'interfaces/team';
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
