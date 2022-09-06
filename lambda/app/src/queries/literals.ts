import castArray from 'lodash.castarray';
import format = require('pg-format');

export const getMyTeamsLiteral = (userId: number, roles: string[] = ['member', 'admin']) => {
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

export const getMyTeamLiteral = (userId: number, teamId: number, roles: string[] = ['member', 'admin']) => {
  return format(
    `
  select team_id
  from users_teams
  where team_id=%L and user_id=%L and pending=false and role in (%L)
  `,
    teamId,
    userId,
    castArray(roles),
  );
};

export const getTeamIdLiteralOutOfRange = (userId: number, teamId: number, roles: string[] = ['member', 'admin']) => {
  // if the team is not allowed for the user return the integer out of range
  return format(
    `
  select (case when count(*) = 0 then 2147483648 else ${teamId} end)
  from users_teams
  where team_id=%L and user_id=%L and pending=false and role in (%L)
  `,
    teamId,
    userId,
    castArray(roles),
  );
};
