import { API_BASE_PATH } from '../constants';
import { testClient } from '../test-client';
import standardSettingsHandler from '@app/pages/api/keycloak/standard-settings';

export const fetchStandardSettings = async () => {
  return await testClient(standardSettingsHandler)
    .get(`${API_BASE_PATH}/keycloak/standard/settings`)
    .set('Accept', 'application/json')
    .set('Authorization', 'test');
};
