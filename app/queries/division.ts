import { models } from '@app/shared/sequelize/models/models';

export const listDivisions = async () => {
  return await models.division.findAll();
};

export const getByBcgovUnitAndDivision = async (bcgovUnitId: number, divisionId: number) => {
  return await models.division.findOne({
    where: {
      bcgovUnitId,
      id: divisionId,
    },
  });
};

export const getDivisionById = async (divisionId: number) => {
  return await models.division.findOne({
    where: {
      id: divisionId,
    },
  });
};
