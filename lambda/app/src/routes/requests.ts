import { models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { formatFormData } from '../helpers';
const AWS = require('aws-sdk');

export const createRequest = async (session: Session, data: Data) => {
  const formattedFormData = formatFormData(data);
  try {
    const { projectName, identityProviders, validRedirectUrls, environments } = formattedFormData;
    const result = await models.request.create({
      idirUserid: session.idir_userid,
      projectName,
      identityProviders,
      validRedirectUrls,
      environments,
    });

    const payload = JSON.stringify({ ...formattedFormData, id: result.id });

    var lambda = new AWS.Lambda({
      region: 'ca-central-1',
    });

    await lambda.invoke(
      {
        FunctionName: 'lambda-github',
        Payload: payload,
      },
      function (err) {
        if (err) {
          console.error(err);
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 422,
    };
  }
};

export const getRequests = async (session: Session) => {
  try {
    const requests = await models.request.findAll({
      where: {
        idirUserid: session.idir_userid,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 422,
    };
  }
};
