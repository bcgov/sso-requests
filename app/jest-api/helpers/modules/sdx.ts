import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import sdxResourceServersHandler from '@app/pages/api/sdx-resource-servers';
import sdxAllowedAccessHandler from '@app/pages/api/requests/[id]/sdx-allowed-access';
import { SDXAccessRequest } from '@app/shared/interfaces';

export const getSdxResourceServers = async () => {
  return await testClient(sdxResourceServersHandler)
    .get(`${API_BASE_PATH}/sdx-resource-servers`)
    .set('Accept', 'application/json');
};

export const postSdxResourceServers = async () => {
  return await testClient(sdxResourceServersHandler)
    .post(`${API_BASE_PATH}/sdx-resource-servers`)
    .set('Accept', 'application/json');
};

export const getSdxAllowedAccess = async (integrationId: number, status?: string) => {
  const query = status ? `?status=${status}` : '';
  return await testClient(sdxAllowedAccessHandler)
    .get(`${API_BASE_PATH}/requests/${integrationId}/sdx-allowed-access${query}`)
    .set('Accept', 'application/json');
};

// The route params are inferred from the url, so an unmatched url leaves the integration id out.
export const getSdxAllowedAccessWithoutId = async () => {
  return await testClient(sdxAllowedAccessHandler)
    .get(`${API_BASE_PATH}/requests/sdx-allowed-access`)
    .set('Accept', 'application/json');
};

export const putSdxAllowedAccess = async (
  integrationId: number,
  data: Partial<SDXAccessRequest>,
  bearerToken?: string,
) => {
  const client = testClient(sdxAllowedAccessHandler)
    .put(`${API_BASE_PATH}/requests/${integrationId}/sdx-allowed-access`)
    .set('Accept', 'application/json');

  if (bearerToken !== undefined) client.set('Authorization', `Bearer ${bearerToken}`);

  return await client.type('json').send(data as object);
};

export const putSdxAllowedAccessWithRawAuthorization = async (
  integrationId: number,
  data: Partial<SDXAccessRequest>,
  authorization: string,
) => {
  return await testClient(sdxAllowedAccessHandler)
    .put(`${API_BASE_PATH}/requests/${integrationId}/sdx-allowed-access`)
    .set('Accept', 'application/json')
    .set('Authorization', authorization)
    .type('json')
    .send(data as object);
};

export const deleteSdxAllowedAccess = async (integrationId: number) => {
  return await testClient(sdxAllowedAccessHandler)
    .delete(`${API_BASE_PATH}/requests/${integrationId}/sdx-allowed-access`)
    .set('Accept', 'application/json');
};
