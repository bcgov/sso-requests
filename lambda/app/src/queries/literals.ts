import { castArray } from 'lodash';
import format = require('pg-format');

export const getMyTeamsLiteral = (userId: number, roles: string[] = ['user', 'admin']) => {
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
