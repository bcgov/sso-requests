import { models } from '../../shared/sequelize/models/models';
import { Data } from '../shared/interfaces';
import { formatFormData } from './helpers';

export const createRequest = async (data: Data) => {
  const formattedFormData = formatFormData(data);
  try {
    const { projectName, identityProviders, validRedirectUris, environments } = formattedFormData;
    const result = await models.request.create({
      projectName,
      identityProviders,
      validRedirectUris,
      environments,
    });
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
