import { models } from '@lambda-shared/sequelize/models/models';

export const getByRequestId = async (integrationId: number, environment: string) => {
  return await models.bcscClient.findOne({
    where: {
      requestId: integrationId,
      environment,
      archived: false,
    },
  });
};
