import { Op } from 'sequelize';
import { models } from '@app/shared/sequelize/models/models';

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
    secret: string;
    servicePrincipalId: string;
    secretExpiryDate: Date | null;
    environment: string;
    requestId: number;
  },
  options: { plain?: boolean } = {},
) => {
  return await models.entraClient.create(data, options);
};

export const fetchAllEntraClientsWithExpiringSecrets = async (days: number, options: { plain?: boolean } = {}) => {
  return await models.entraClient.findAll({
    where: {
      secretExpiryDate: {
        [Op.lte]: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    },
    ...(options.plain ? { plain: true } : {}),
  });
};
