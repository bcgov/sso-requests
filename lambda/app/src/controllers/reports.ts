import { sequelize } from '@lambda-shared/sequelize/models/models';

export const getRawTeamIntegrations = async () => {
  const [results] = await sequelize.query(`
SELECT
  r.id,
  r.client_name,
  r.project_name,
  r.status,
  r.service_type,
  r.team_id,
  u.idir_email,
  u.additional_email,
  ut.user_id,
  r.realm,
  r.environments,
  r.dev_idps,
  r.test_idps,
  r.prod_idps
FROM
  requests as r
INNER JOIN users_teams as ut ON r.team_id=ut.team_id
INNER JOIN users as u ON u.id=ut.user_id
WHERE r.uses_team=TRUE
AND r.archived=FALSE
AND ut.pending=FALSE
ORDER BY r.client_name
`);

  return results;
};

export const getRawUserIntegrations = async () => {
  const [results] = await sequelize.query(`
SELECT
  r.id,
  r.client_name,
  r.project_name,
  r.status,
  r.service_type,
  u.idir_email,
  u.additional_email,
  r.user_id,
  r.realm,
  r.environments,
  r.dev_idps,
  r.test_idps,
  r.prod_idps
FROM
  requests as r
INNER JOIN users as u ON u.id=r.user_id
WHERE r.uses_team=FALSE
AND r.archived=FALSE
ORDER BY r.client_name
`);

  return results;
};

export default { getRawTeamIntegrations, getRawUserIntegrations };
