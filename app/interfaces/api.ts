import { StandardRealmSettings } from './keycloak';

export interface GetStandardSettingsResponse {
  dev: StandardRealmSettings;
  test: StandardRealmSettings;
  prod: StandardRealmSettings;
}
