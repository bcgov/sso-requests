import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { generateInstallation } from '../keycloak/installation';

export const getInstallation = async (session: Session, data: { requestId: number }) => {
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
      proms.push(
        generateInstallation({ environment: env, realmName: request.realm, clientId: kebabCase(request.projectName) })
      );
    });

    const installations = await Promise.all(proms);

    return {
      statusCode: 200,
      body: JSON.stringify(installations),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 422,
      body: JSON.stringify({ success: false, message: err.message || err }),
    };
  }
};
