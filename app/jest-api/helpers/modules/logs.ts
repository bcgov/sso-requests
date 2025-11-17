import requestLogsHandler from '@app/pages/api/requests/[id]/logs';
import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';

export const getLogs = async (integrationId: number, queryString: string) => {
  return await testClient(requestLogsHandler)
    .get(`${API_BASE_PATH}/requests/${integrationId}/logs?${queryString}`)
    .set('Accept', 'application/json');
};
