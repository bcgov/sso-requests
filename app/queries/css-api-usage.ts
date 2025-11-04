import { models } from '@app/shared/sequelize/models/models';

export const deleteOlderThanDate = async (date: Date) => {
  return await models.apiUsageMetrics.destroy({
    where: {
      timestamp: {
        [models.Sequelize.Op.lt]: date,
      },
    },
  });
};
