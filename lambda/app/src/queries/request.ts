import { Op } from 'sequelize';
import { castArray } from 'lodash';
import format = require('pg-format');
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { isAdmin } from '../utils/helpers';

const getMyTeamsLiteral = (userId: number, roles: string[] = ['user', 'admin']) => {
  return format(
    `
  select team_id
  from users_teams
  where user_id=%L and pending=false and role in (%L)
  `,
    userId,
    castArray(roles),
  );
};

export const getMyOrTeamRequest = async (session: Session, requestId: number, roles: string[] = ['user', 'admin']) => {
  const { idir_userid: idirUserid, user } = session;
  const where: any = { id: requestId };

  const teamIdsLiteral = getMyTeamsLiteral(user.id, roles);

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

export const listIntegrationsForTeam = async (session: Session, teamId: number, options?: { raw: boolean }) => {
  if (isAdmin(session)) {
    return models.request.findAll({
      where: { teamId, archived: false },
      ...options,
    });
  }

  const { user } = session;
  const where: any = { archived: false };

  const teamIdsLiteral = getMyTeamsLiteral(user.id);

  where[Op.and] = [
    {
      teamId,
    },
    {
      teamId: { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) },
    },
  ];

  return models.request.findAll({
    where,
    ...options,
  });
};
