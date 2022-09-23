import { instance } from './axios';
import { AxiosError } from 'axios';
import { Team, User } from 'interfaces/team';
import { handleAxiosError } from 'services/axios';

export const getMyTeams = async (): Promise<[Team[], null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('teams').then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getAllowedTeams = async (): Promise<[Team[], null] | [null, AxiosError]> => {
  try {
    const result = await instance.get('allowed-teams').then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getAllowedTeam = async (id: string): Promise<[Team, null] | [null, AxiosError]> => {
  try {
    const result = await instance.get(`allowed-teams/${id}`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const createTeam = async (data: any): Promise<[Team, null] | [null, AxiosError]> => {
  try {
    const result = await instance.post('teams', data).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const editTeamName = async (data: { name: string; id?: number }): Promise<[Team, null] | [null, AxiosError]> => {
  try {
    const { name, id } = data;
    const body = { name: name };
    const result = await instance.put(`teams/${id}`, body).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const addTeamMembers = async (data: { members: User[]; id?: number }) => {
  try {
    const { id, members } = data;
    const result = await instance.post(`teams/${id}/members`, members).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getTeamMembers = async (id?: number) => {
  try {
    const result = await instance.get(`teams/${id}/members`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const updateTeamMember = async (teamId: number, memberId: number, data: { role: string }) => {
  try {
    const result = await instance.put(`teams/${teamId}/members/${memberId}`, data).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const deleteTeamMember = async (userId: number, teamId: number) => {
  try {
    const result = await instance.delete(`teams/${teamId}/members/${userId}`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const inviteTeamMember = async (user: User, teamId: number) => {
  try {
    const result = await instance.post(`teams/${teamId}/invite`, user).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const deleteTeam = async (teamId?: number) => {
  try {
    const result = await instance.delete(`teams/${teamId}`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const requestServiceAccount = async (teamId?: number) => {
  try {
    const result = await instance.post(`teams/${teamId}/service-accounts`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

// export const getServiceAccount = async (teamId?: number) => {
//   try {
//     const result = await instance.get(`teams/${teamId}/service-accounts`).then((res) => res.data);
//     return [result, null];
//   } catch (err: any) {
//     return handleAxiosError(err);
//   }
// };

export const getServiceAccounts = async (teamId?: number) => {
  try {
    const result = await instance.get(`teams/${teamId}/service-accounts`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getServiceAccount = async (teamId?: number, saId?: number) => {
  try {
    const result = await instance.get(`teams/${teamId}/service-accounts/${saId}`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const getServiceAccountCredentials = async (teamId?: number, saId?: number) => {
  try {
    const result = await instance.get(`teams/${teamId}/service-accounts/${saId}/credentials`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const updateServiceAccountCredentials = async (teamId?: number, saId?: number) => {
  try {
    const result = await instance.put(`teams/${teamId}/service-accounts/${saId}/credentials`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};

export const deleteServiceAccount = async (teamId?: number, saId?: number) => {
  try {
    const result = await instance.delete(`teams/${teamId}/service-accounts/${saId}`).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    return handleAxiosError(err);
  }
};
