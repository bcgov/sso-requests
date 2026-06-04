import { testClient } from '../test-client';
import { API_BASE_PATH } from '../constants';
import claimsHandler from '@app/pages/api/bc-services-card/claim-types';
import privacyZoneHandler from '@app/pages/api/bc-services-card/privacy-zones';

export const getBcscClaims = async () => {
  return await testClient(claimsHandler).get(`${API_BASE_PATH}/claim-types`).set('Accept', 'application/json');
};

export const getPrivacyZones = async () => {
  return await testClient(privacyZoneHandler).get(`${API_BASE_PATH}/privacy-zones`).set('Accept', 'application/json');
};
