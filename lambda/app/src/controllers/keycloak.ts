import { Session, User } from '@lambda-shared/interfaces';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { searchUsers } from '../keycloak/users';
import { getBaseWhereForMyOrTeamIntegrations } from '@lambda-app/queries/request';

export const searchKeycloakUsers = async (session: Session, data: any) => {
  const where: any = getBaseWhereForMyOrTeamIntegrations(session.user.id);
  where.id = data.integrationId;
  where.apiServiceAccount = false;
  where.archived = false;

  const integration = await models.request.findOne({
    where,
    attributes: ['id', 'clientId'],
    raw: true,
  });

  data.clientId = integration.clientId;

  return searchUsers(data);
};
