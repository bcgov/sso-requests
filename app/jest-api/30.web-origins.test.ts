import { openIdClientProfile } from '@app/keycloak/integration';
import { IntegrationData } from '@app/shared/interfaces';

jest.mock('@app/keycloak/adminClient', () => ({}));
jest.mock('@app/controllers/requests', () => ({
  createBCSCIntegration: jest.fn(),
  deleteBCSCIntegration: jest.fn(),
}));
jest.mock('@app/helpers/integration', () => ({
  usesBcServicesCard: jest.fn(),
  usesOTP: jest.fn(),
}));
jest.mock('@app/queries/bcsc-client', () => ({
  getByRequestId: jest.fn(),
}));
jest.mock('@app/keycloak/protocolMappers', () => ({
  createAccessTokenAudMapper: jest.fn(),
  createClientRolesMapper: jest.fn(),
  createPreferredUsernameMapper: jest.fn(),
  createTeamMapper: jest.fn(),
  deleteMapper: jest.fn(),
  listClientProtocolMappers: jest.fn(),
  manageAdditionalClientRolesMapper: jest.fn(),
}));
jest.mock('@app/utils/bcsc-client', () => ({
  getPrivacyZoneURI: jest.fn(),
}));

const baseIntegration: Partial<IntegrationData> = {
  clientId: 'test-client',
  authType: 'browser-login',
  browserFlowOverride: '',
};

const authFlows: any[] = [];

describe('WebOrigins with scheme://* redirect URIs', () => {
  describe('public client in dev', () => {
    it('includes * in webOrigins when https://* is a redirect URI', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        devValidRedirectUris: ['https://*', 'https://example.com/*'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'dev', authFlows);

      expect(profile.webOrigins).toContain('*');
      expect(profile.webOrigins).toContain('+');
    });

    it('includes * in webOrigins when https://*/path is a redirect URI', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        devValidRedirectUris: ['https://*/some-specific-path'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'dev', authFlows);

      expect(profile.webOrigins).toContain('*');
    });

    it('does not include * when no scheme://* redirect URI is present', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        devValidRedirectUris: ['https://example.com/*', 'https://app.example.com/callback'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'dev', authFlows);

      expect(profile.webOrigins).not.toContain('*');
      expect(profile.webOrigins).toContain('+');
    });

    it('does not include * for non-http/https schemes (e.g. custom deep links)', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        devValidRedirectUris: ['myapp://*'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'dev', authFlows);

      expect(profile.webOrigins).not.toContain('*');
    });
  });

  describe('public client in test', () => {
    it('includes * in webOrigins when https://* is a redirect URI', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        testValidRedirectUris: ['https://*'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'test', authFlows);

      expect(profile.webOrigins).toContain('*');
    });
  });

  describe('confidential client in dev', () => {
    it('never includes * in webOrigins even with https://* redirect URI', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: false,
        devValidRedirectUris: ['https://*'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'dev', authFlows);

      expect(profile.webOrigins).not.toContain('*');
      expect(profile.webOrigins).toContain('+');
    });
  });

  describe('public client in prod', () => {
    it('never includes * in webOrigins regardless of redirect URIs', () => {
      const integration = {
        ...baseIntegration,
        publicAccess: true,
        // prod validation blocks https://* but we test the safeguard directly
        prodValidRedirectUris: ['https://*'],
      } as IntegrationData;

      const profile = openIdClientProfile(integration, 'prod', authFlows);

      expect(profile.webOrigins).not.toContain('*');
    });
  });
});
