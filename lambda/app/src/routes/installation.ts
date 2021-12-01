import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await models.request.findOne({
    where: {
      idirUserid: session.idir_userid,
      id: data.requestId,
    },
  });

  const installation = await generateInstallation({
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientName,
  });

  return installation;
};

export const changeSecret = async (session: Session, data: { requestId: number; environment: string }) => {
  const request = await models.request.findOne({
    where: {
      idirUserid: session.idir_userid,
      id: data.requestId,
    },
  });
  await updateClientSecret({
    environment: data.environment,
    realmName: request.realm,
    clientId: request.clientName,
  });

  return { success: true };
};
