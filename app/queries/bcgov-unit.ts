import { models } from '@app/shared/sequelize/models/models';

export const listBcgovUnits = async () => {
  return await models.bcgovUnit.findAll();
};

export const getBcgovUnitById = async (bcgovUnitId: number) => {
  return await models.bcgovUnit.findOne({
    where: {
      id: bcgovUnitId,
    },
  });
};
