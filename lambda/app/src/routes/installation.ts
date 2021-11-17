import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';

export const getInstallation = async (session: Session, data: { requestId: number; environment: string }) => {
  try {
    const request = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id: data.requestId,
      },
    });

    console.log(request);

    const installation = await generateInstallation({
      environment: data.environment,
      realmName: request.realm,
      clientId: request.clientName,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(installation),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 422,
      body: JSON.stringify({ success: false, message: err.message || err }),
    };
  }
};

export const changeSecret = async (session: Session, data: { requestId: number; environment: string }) => {
  try {
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
    return {
      statusCode: 200,
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 422,
      body: JSON.stringify({ success: false, message: err.message || err }),
    };
  }
};
