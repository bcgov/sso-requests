import { sequelize, models } from '../../../shared/sequelize/models/models';

export const getMemberOnTeam = async (teamId: number, userId: number, options: { raw: boolean }) => {
  return models.user.findOne({
    where: { id: userId },
    include: [
      {
        model: models.usersTeam,
        where: { teamId },
        required: true,
        attributes: [],
      },
    ],
    attributes: [
      'id',
      'idirUserid',
      'idirEmail',
      [sequelize.col('usersTeams.role'), 'role'],
      [sequelize.col('usersTeams.pending'), 'pending'],
      [sequelize.col('usersTeams.created_at'), 'createdAt'],
      [sequelize.col('usersTeams.updated_at'), 'updatedAt'],
    ],
    ...options,
  });
};
