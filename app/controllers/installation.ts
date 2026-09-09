import { Session, User } from '@app/shared/interfaces';
import { generateInstallation, updateClientSecret } from '@app/keycloak/installation';
import { assertAuthorizedIntegration } from '@app/queries/integrationAccess';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await assertAuthorizedIntegration(session.user!.id, data.requestId, {
    resource: API_RESOURCES.INTEGRATIONS,
    action: API_ACTIONS.READ,
    environment: data.environment,
  });

  const installation = await generateInstallation({
    serviceType: request.serviceType,
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientId,
    authType: request.authType,
  });

  return installation;
};

export const changeSecret = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await assertAuthorizedIntegration(session.user!.id, data.requestId, {
    resource: API_RESOURCES.INTEGRATIONS,
    action: API_ACTIONS.WRITE,
    environment: data.environment,
  });

  await updateClientSecret({
    serviceType: request.serviceType,
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientId,
  });

  return { success: true };
};
