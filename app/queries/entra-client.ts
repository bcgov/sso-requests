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
    secretExpiryDate: Date;
    environment: string;
    requestId: number;
  },
  options: { plain?: boolean } = {},
) => {
  return await models.entraClient.create(data, options);
};
