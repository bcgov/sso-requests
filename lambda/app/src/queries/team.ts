import { sequelize, models } from '../../../shared/sequelize/models/models';

export const listTeamsForUser = async (userId: number, options?: { raw: boolean }) => {
  return models.team.findAll({
    include: [
      {
        model: models.usersTeam,
        where: { userId },
        required: true,
        attributes: [],
      },
    ],
    attributes: [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      [sequelize.col('usersTeams.role'), 'role'],
      [sequelize.literal('(select count(*) FROM requests WHERE "requests"."team_id"="team"."id")'), 'integrationCount'],
    ],
    ...options,
  });
};

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
