import { sequelize } from '@lambda-shared/sequelize/models/models';

export const downloadTeamIntegrationsReport = async () => {
  const [results] = await sequelize.query(`
SELECT
  r.id,
  r.client_name,
  r.service_type,
  r.team_id,
  r.realm,
  r.environments,
  r.dev_idps,
  r.test_idps,
  r.prod_idps,
  ut.user_id,
  u.idir_email,
  u.additional_email
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

export const downloadUserIntegrationsReport = async () => {
  const [results] = await sequelize.query(`
SELECT
  r.id,
  r.client_name,
  r.user_id,
  r.service_type,
  r.realm,
  r.environments,
  r.dev_idps,
  r.test_idps,
  r.prod_idps,
  u.idir_email,
  u.additional_email
FROM
  requests as r
INNER JOIN users as u ON u.id=r.user_id
WHERE r.uses_team=FALSE
AND r.archived=FALSE
ORDER BY r.client_name
`);

  return results;
};

export default { downloadTeamIntegrationsReport, downloadUserIntegrationsReport };
