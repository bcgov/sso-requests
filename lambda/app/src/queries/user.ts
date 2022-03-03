import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';

export const getUserById = async (userId: number, options?: { raw: boolean }) => {
  return models.user.findOne({
    where: { id: userId },
    ...options,
  });
};
