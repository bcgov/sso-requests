import { Op } from 'sequelize';
import { castArray } from 'lodash';
import format = require('pg-format');
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { isAdmin } from '../utils/helpers';

export const getMyOrTeamRequest = async (session: Session, requestId: number, roles: string[] = ['user', 'admin']) => {
  const { idir_userid: idirUserid, user } = session;
  const where: any = { id: requestId };

  const teamIdsLiteral = format(
    `
  select team_id
  from users_teams
  where user_id=%L and pending=false and role in (%L)
  `,
    user.id,
    castArray(roles),
  );

  where[Op.or] = [
    {
      usesTeam: true,
      teamId: {
        [Op.in]: sequelize.literal(`(${teamIdsLiteral})`),
      },
    },
    {
      idirUserid,
    },
  ];

  return models.request.findOne({
    where,
    include: [
      {
        model: models.team,
        required: false,
      },
    ],
  });
};

export const getAllowedRequest = async (session: Session, requestId: number, roles?: string[]) => {
  if (isAdmin(session)) {
    return models.request.findOne({
      where: { id: requestId },
      include: [
        {
          model: models.team,
          required: false,
        },
      ],
    });
  }

  return getMyOrTeamRequest(session, requestId, roles);
};
