import { sequelize } from '@lambda-shared/sequelize/models/models';

export const getAllStandardIntegrations = async () => {
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
  r.user_id,
  CASE WHEN r.uses_team = FALSE THEN 'Requester'
  ELSE ut.role
  END AS role,
  r.realm,
  r.environments,
  r.dev_idps,
  r.test_idps,
  r.prod_idps
FROM
  requests as r
INNER JOIN users as u ON u.id=r.user_id
LEFT JOIN users_teams as ut ON r.team_id=ut.team_id
AND r.archived=FALSE
AND ut.pending=FALSE
ORDER BY r.client_name
`);

  return results;
};

export default { getAllStandardIntegrations };
