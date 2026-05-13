import { API_BASE_PATH } from '../constants';
import { User } from '@app/interfaces/team';
import meHandler from '@app/pages/api/me';
import deleteInactiveUsersHandler from '@app/pages/api/delete-inactive-idir-users';
import idirUsersHandler from '@app/pages/api/idir-users';
import { testClient } from '../test-client';
import idirSearchHandler from '@app/pages/api/bceid-webservice/idir/search';
import idirImportHandler from '@app/pages/api/bceid-webservice/idir/import';
import azureIdirSearchHandler from '@app/pages/api/ms-graph/idir/search';
import azureIdirImportHandler from '@app/pages/api/ms-graph/idir/import';

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

export const searchAzureIdirUsersByEmail = async (email: any) => {
  return testClient(idirUsersHandler).get(`${API_BASE_PATH}/idir-users?email=${email}`);
};

export const searchIdirUsers = async (field: string, search: string) => {
  return testClient(idirSearchHandler)
    .post(`${API_BASE_PATH}/bceid-webservice/idir/search`)
    .send({ field, search })
    .set('Accept', 'application/json');
};

export const importIdirUser = async (data: any) => {
  return testClient(idirImportHandler)
    .post(`${API_BASE_PATH}/bceid-webservice/idir/import`)
    .send(data)
    .set('Accept', 'application/json');
};

export const searchAzureIdirUsers = async (field: string, search: string) => {
  return testClient(azureIdirSearchHandler)
    .post(`${API_BASE_PATH}/ms-graph/idir/search`)
    .send({ field, search })
    .set('Accept', 'application/json');
};

export const importAzureIdirUser = async (data: any) => {
  return testClient(azureIdirImportHandler)
    .post(`${API_BASE_PATH}/ms-graph/idir/import`)
    .send(data)
    .set('Accept', 'application/json');
};
