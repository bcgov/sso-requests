import { sequelize } from '@lambda-shared/sequelize/models/models';

export const getAllStandardIntegrations = async () => {
  const [results] = await sequelize.query(`
  CREATE TABLE IF NOT EXISTS tempResultsTable AS (
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
    WHEN r.uses_team = TRUE THEN ut.role
    END AS role,
    r.realm,
    ARRAY_TO_STRING(r.environments, ', ') as environments,
    ARRAY_TO_STRING(r.dev_idps, ', ') as dev_idps,
    ARRAY_TO_STRING(r.test_idps, ', ') as test_idps,
    ARRAY_TO_STRING(r.prod_idps, ', ') as prod_idps
  FROM requests as r
    LEFT JOIN users as u ON u.id=r.user_id
    LEFT JOIN users_teams as ut ON r.user_id=ut.user_id AND r.team_id=ut.team_id
    WHERE r.archived=FALSE
    ORDER BY client_name
  );

  UPDATE tempResultsTable
  SET role = 'One off. Fixed summer 2022'
  WHERE idir_email IS NULL AND role IS NOT NULL;

  UPDATE tempResultsTable
  SET role = 'Service Account'
  WHERE idir_email IS NULL AND user_id IS NULL AND role IS NULL AND team_id IS NOT NULL;

  UPDATE tempResultsTable
  SET role = 'Requester left team'
  WHERE idir_email IS NOT NULL AND user_id IS NOT NULL AND team_id IS NOT NULL AND role IS NULL;

  SELECT * FROM tempResultsTable;
  DROP TABLE tempResultsTable;
`);

  return results;
};

export default { getAllStandardIntegrations };
