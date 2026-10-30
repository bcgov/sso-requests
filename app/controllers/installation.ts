import { Session } from '@app/shared/interfaces';
import { generateInstallation, updateClientSecret } from '@app/keycloak/installation';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import { audit } from '@app/queries/event';
import { isEnvironment } from '@sso/audit';
import createHttpError from 'http-errors';

const authorizedRequest = async (session: Session, data: { requestId: number; environment: string }) => {
  const authorized = await authorizeIntegration(session, data.requestId, 'integrations:write');
  if (!authorized) throw new createHttpError.Forbidden('not allowed to access this integration');
  if (!isEnvironment(data.environment)) throw new createHttpError.BadRequest(`invalid environment ${data.environment}`);
  const { integration: request } = authorized;
  // The same scope for viewing and for rotating, so one query finds both for a client.
  const scope = {
    requestId: request.id,
    environment: data.environment,
    target: { type: 'integration' as const, id: request.clientId },
  };
  return { request, scope };
};

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  const { request, scope } = await authorizedRequest(session, data);

  const installation = await generateInstallation({
    serviceType: request.serviceType,
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientId,
    authType: request.authType,
  });

  // Strict and before returning: credentials nobody can account for are never handed out.
  await audit.createEvent({ action: 'credentials-view', outcome: 'success', ...scope, details: {} });
  return installation;
};

export const changeSecret = async (session: Session, data: { requestId: number; environment: string }) => {
  const { request, scope } = await authorizedRequest(session, data);

  await audit.runAuditedOperation({ action: 'secret-rotate', ...scope, details: {} }, () =>
    updateClientSecret({
      serviceType: request.serviceType,
      environment: data.environment,
      realmName: request.realm,
      clientId: request.clientId,
    }),
  );

  return { success: true };
};
