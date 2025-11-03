import { Session } from '@app/shared/interfaces';
import { models } from '@app/shared/sequelize/models/models';
import { searchUsers } from '../keycloak/users';
import { getBaseWhereForMyOrTeamIntegrations } from '@app/queries/request';
import { getAdminClient } from '@app/keycloak/adminClient';

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

export const getKeycloakClientsByEnv = async (environment: string) => {
  const clientList = [];
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const max = 100;
  let first = 0;

  while (true) {
    const result = await kcAdminClient.clients.find({ realm: 'standard', max, first });
    if (result.length === 0) {
      break;
    }
    clientList.push(...result);
    first = first + max;
  }
  return clientList;
};
