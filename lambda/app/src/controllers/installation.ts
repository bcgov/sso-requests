import { Session, User } from '../../../shared/interfaces';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';
import { getMyOrTeamRequest } from '@lambda-app/queries/request';

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await getMyOrTeamRequest(session.user.id, data.requestId);

  const installation = await generateInstallation({
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientName,
  });

  return installation;
};

export const changeSecret = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await getMyOrTeamRequest(session.user.id, data.requestId);

  await updateClientSecret({
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientName,
  });

  return { success: true };
};
