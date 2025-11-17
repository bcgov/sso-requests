import { models } from '@app/shared/sequelize/models/models';

export const getUserById = async (userId: number, options?: { raw: boolean }) => {
  return models.user.findOne({
    where: { id: userId },
    ...options,
  });
};
