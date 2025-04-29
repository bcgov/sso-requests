import { Session } from '@app/shared/interfaces';
import { models } from '@app/shared/sequelize/models/models';
import { searchUsers } from '../keycloak/users';
import { getBaseWhereForMyOrTeamIntegrations } from '@app/queries/request';

export const searchKeycloakUsers = async (session: Session, data: any) => {
  const where: any = getBaseWhereForMyOrTeamIntegrations(session?.user?.id as number);
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
