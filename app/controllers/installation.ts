import { Session, User } from '@app/shared/interfaces';
import { generateInstallation, updateClientSecret } from '@app/keycloak/installation';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import createHttpError from 'http-errors';

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  const authorized = await authorizeIntegration(session, data.requestId, 'integrations:write');
  if (!authorized) throw new createHttpError.Forbidden('not allowed to access this integration');
  const { integration: request } = authorized;

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
  const authorized = await authorizeIntegration(session, data.requestId, 'integrations:write');
  if (!authorized) throw new createHttpError.Forbidden('not allowed to access this integration');
  const { integration: request } = authorized;

  await updateClientSecret({
    serviceType: request.serviceType,
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientId,
  });

  return { success: true };
};
