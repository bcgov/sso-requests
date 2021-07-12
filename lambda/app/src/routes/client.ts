import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { fetchClient } from '../keycloak/client';

export const getClient = async (session: Session, data: { requestId: number }) => {
  try {
    const request = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id: data.requestId,
      },
    });

    console.log(request.environments, request.projectName);

    const proms = [];
    request.environments.forEach((env) => {
      proms.push(fetchClient({ environment: env, realmName: 'onestopauth', clientId: kebabCase(request.projectName) }));
    });

    const clients = await Promise.all(proms);

    return {
      statusCode: 200,
      body: JSON.stringify(clients),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 422,
      body: JSON.stringify({ success: false, message: err.message || err }),
    };
  }
};
