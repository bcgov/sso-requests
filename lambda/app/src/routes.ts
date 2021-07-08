import { models } from '../../shared/sequelize/models/models';
import { Data } from '../../shared/interfaces';
import { formatFormData } from './helpers';
const AWS = require('aws-sdk');

export const createRequest = async (data: Data) => {
  const formattedFormData = formatFormData(data);
  try {
    const { projectName, identityProviders, validRedirectUrls, environments } = formattedFormData;
    const result = await models.request.create({
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

// TODO: Get by IDIR. Currently getting all records for development
export const getRequests = async () => {
  try {
    const requests = await models.request.findAll();
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
