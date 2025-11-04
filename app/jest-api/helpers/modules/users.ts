import { API_BASE_PATH } from '../constants';
import { User } from '@app/interfaces/team';
import meHandler from '@app/pages/api/me';
import deleteInactiveUsersHandler from '@app/pages/api/delete-inactive-idir-users';
import idirUsersHandler from '@app/pages/api/idir-users';
import { testClient } from '../test-client';

export const getAuthenticatedUser = async () => {
  return await testClient(meHandler).get(`${API_BASE_PATH}/me`);
};

export const updateProfile = async (data: User) => {
  return await testClient(meHandler).post(`${API_BASE_PATH}/me`).send(data);
};

export const deleteInactiveUsers = async (userData: any) => {
  return await testClient(deleteInactiveUsersHandler)
    .post(`${API_BASE_PATH}/delete-inactive-idir-users`)
    .send(userData)
    .set('Accept', 'application/json')
    .set('Authorization', 'test');
};

export const searchIdirUsers = async (email: any) => {
  return testClient(idirUsersHandler).get(`${API_BASE_PATH}/idir-users?email=${email}`);
};
