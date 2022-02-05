import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';

export const getAllowedRequest = async (session: Session, user: User, requestId: number, teamRole: string = '') => {
  const where: any = { id: requestId };

  const whereRole = teamRole ? `and role='${teamRole}'` : '';

  where[Op.or] = [
    {
      usesTeam: true,
      teamId: {
        [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}'${whereRole})`),
      },
    },
    {
      idirUserid: session.idir_userid,
    },
  ];

  return models.request.findOne({ where, raw: true });
};
