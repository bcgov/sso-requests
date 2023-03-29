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
    END AS role,
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
  UNION
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
    CASE WHEN r.uses_team = TRUE THEN ut.role
    END AS role,
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
  ORDER BY client_name;
`);

  return results;
};

export default { getAllStandardIntegrations };
