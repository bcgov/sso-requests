import { Op } from 'sequelize';
import { models } from '@app/shared/sequelize/models/models';
import { KeyCredential } from '@microsoft/microsoft-graph-types';

export const getEntraClientByRequestId = async (
  data: { integrationId: number; environment: string },
  options: { plain?: boolean } = {},
) => {
  return await models.entraClient.findAll({
    where: {
      requestId: data.integrationId,
      environment: data.environment,
    },
    ...(options.plain ? { plain: true } : {}),
  });
};

export const saveEntraClient = async (
  data: {
    appName: string;
    appId: string;
    keyThumbprint: string | null;
    servicePrincipalId: string;
    environment: string;
    requestId: number;
  },
  options: { plain?: boolean } = {},
) => {
  return await models.entraClient.create(data, options);
};

export const fetchAllEntraClients = async (environment: string, options: { plain?: boolean } = {}) => {
  return await models.entraClient.findAll({
    where: {
      environment,
    },
    ...(options.plain ? { plain: true } : {}),
  });
};
