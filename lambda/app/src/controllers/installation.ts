import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';

export const getInstallation = async (
  session: Session,
  user: User,
  data: { requestId: number; environment: string },
) => {
  const where: any = { id: data.requestId };

  where[Op.or] = [
    {
      usesTeam: true,
      teamId: { [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}')`) },
    },
    {
      idirUserid: session.idir_userid,
    },
  ];

  const request = await models.request.findOne({
    where,
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
