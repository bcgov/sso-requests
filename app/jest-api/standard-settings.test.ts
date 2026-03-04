import { createMockAuth } from './mocks/authenticate';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01, formDataDev, formDataProd } from './helpers/fixtures';
import { fetchStandardSettings } from './helpers/modules/keycloak';
import { getAdminClient } from '@app/keycloak/adminClient';
import { defaultStandardRealmSettings } from '@app/utils/constants';

jest.mock('@app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() => Promise.resolve([{ privacy_zone_uri: 'zone', privacy_zone_name: 'zone' }])),
  };
});

beforeEach(() => {
  jest.resetModules();
});

const realmSettings = {
  accessTokenLifespan: 300,
  ssoSessionIdleTimeout: 360,
  ssoSessionMaxLifespan: 30,
  offlineSessionIdleTimeout: 3600,
  offlineSessionMaxLifespan: 3660,
};

const expectedConvertedSeconds = {
  accessTokenLifespan: '5 Minutes',
  ssoSessionIdleTimeout: '6 Minutes',
  ssoSessionMaxLifespan: '30 Seconds',
  offlineSessionIdleTimeout: '1 Hour',
  offlineSessionMaxLifespan: '61 Minutes',
};

jest.mock('@app/keycloak/adminClient', () => {
  return {
    getAdminClient: jest.fn(() => {
      return Promise.resolve({
        kcAdminClient: {
          realms: {
            findOne: jest.fn(() => {
              return Promise.resolve(realmSettings);
            }),
          },
        },
      });
    }),
  };
});

describe('standard realm settings', () => {
  it('converts seconds to appropriate readable values', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await fetchStandardSettings();
    expect(result.body.dev).toEqual(expectedConvertedSeconds);
  });

  it('Falls back to default values when an environment fails to respond', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

    const mockedGetAdminClient = getAdminClient as jest.MockedFunction<any>;
    mockedGetAdminClient.mockImplementation(async ({ environment }: any) => {
      return {
        kcAdminClient: {
          realms: {
            findOne: jest.fn(() => {
              // Only resolve in dev, reject test/prod
              if (environment === 'dev') {
                return Promise.resolve(realmSettings);
              } else return Promise.reject();
            }),
          },
        },
      };
    });

    const result = await fetchStandardSettings();
    // Dev should still resolve
    expect(result.body.dev).toEqual(expectedConvertedSeconds);
    // test/prod should fallback due to reject
    expect(result.body.prod).toEqual(defaultStandardRealmSettings);
    expect(result.body.test).toEqual(defaultStandardRealmSettings);
  });
});
