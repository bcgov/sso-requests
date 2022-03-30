import { Session } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { fetchClient } from '../keycloak/client';
import { getMyOrTeamRequest } from '@lambda-app/queries/request';

export const getClient = async (session: Session, data: { requestId: number }) => {
  const request = await getMyOrTeamRequest(session.user.id, data.requestId);

  const proms = [];
  request.environments.forEach((env) => {
    proms.push(
      fetchClient({
        serviceType: request.serviceType,
        environment: env,
        realmName: 'onestopauth',
        clientId: kebabCase(request.projectName),
      }),
    );
  });

  return Promise.all(proms);
};
