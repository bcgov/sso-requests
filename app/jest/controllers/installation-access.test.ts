import { changeSecret, getInstallation } from '@app/controllers/installation';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';

const mockAssertAuthorizedIntegration = jest.fn();
const mockGenerateInstallation = jest.fn();
const mockUpdateClientSecret = jest.fn();

jest.mock('@app/queries/integrationAccess', () => ({
  assertAuthorizedIntegration: (...args: any[]) => mockAssertAuthorizedIntegration(...args),
}));

jest.mock('@app/keycloak/installation', () => ({
  generateInstallation: (...args: any[]) => mockGenerateInstallation(...args),
  updateClientSecret: (...args: any[]) => mockUpdateClientSecret(...args),
}));

const session = { user: { id: 7 } } as any;
const request = {
  id: 11,
  serviceType: 'gold',
  realm: 'standard',
  clientId: 'client',
  authType: 'browser-login',
};

describe('installation authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertAuthorizedIntegration.mockResolvedValue(request);
  });

  it('requires environment-scoped viewer access to read installation details', async () => {
    await getInstallation(session, { requestId: 11, environment: 'test' });

    expect(mockAssertAuthorizedIntegration).toHaveBeenCalledWith(7, 11, {
      resource: API_RESOURCES.INTEGRATIONS,
      action: API_ACTIONS.READ,
      environment: 'test',
    });
    expect(mockGenerateInstallation).toHaveBeenCalled();
  });

  it('requires environment-scoped editor access before rotating a secret', async () => {
    await changeSecret(session, { requestId: 11, environment: 'prod' });

    expect(mockAssertAuthorizedIntegration).toHaveBeenCalledWith(7, 11, {
      resource: API_RESOURCES.INTEGRATIONS,
      action: API_ACTIONS.WRITE,
      environment: 'prod',
    });
    expect(mockUpdateClientSecret).toHaveBeenCalled();
  });

  it('does not call Keycloak after authorization is denied', async () => {
    mockAssertAuthorizedIntegration.mockRejectedValue(new Error('forbidden'));

    await expect(changeSecret(session, { requestId: 11, environment: 'prod' })).rejects.toThrow('forbidden');
    expect(mockUpdateClientSecret).not.toHaveBeenCalled();
  });
});
