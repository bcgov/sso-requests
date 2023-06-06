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
    CASE
      WHEN (u.idir_email IS NULL OR u.idir_email = '') AND r.user_id IS NULL AND (ut.role IS NULL OR ut.role = '') AND r.team_id IS NOT NULL THEN 'Service Account'
      WHEN (u.idir_email IS NOT NULL OR u.idir_email != '') AND r.user_id IS NOT NULL AND r.team_id IS NOT NULL AND (ut.role IS NULL OR ut.role = '') THEN 'Requester left team'
      WHEN r.uses_team = FALSE THEN
        CASE WHEN (u.idir_email IS NULL OR u.idir_email = '') THEN 'One off. Fixed summer 2022' ELSE 'Requester' END
      WHEN r.uses_team = TRUE THEN
        CASE WHEN (ut.role IS NOT NULL OR ut.role != '') THEN
          CASE WHEN (u.idir_email IS NULL OR u.idir_email = '') THEN 'One off. Fixed summer 2022' ELSE ut.role END
        END
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
    ORDER BY client_name;
`);

  return results;
};

export const getDatabaseTable = async (table: string, orderBy: string) => {
  const [results] = await sequelize.query(`
  SELECT * FROM ${table} ORDER BY ${orderBy};
`);
  return results;
};

export const getBceidApprovedRequestsAndEvents = async () => {
  const [results] = await sequelize.query(`
  SELECT
    e.details::text,
    e.updated_at,
    r.id,
    r.project_name,
    r.status,
    r.service_type,
    r.team_id,
    u.idir_email,
    u.additional_email,
    r.user_id,
    CASE
      WHEN (u.idir_email IS NULL OR u.idir_email = '') AND r.user_id IS NULL AND (ut.role IS NULL OR ut.role = '') AND r.team_id IS NOT NULL THEN 'Service Account'
      WHEN (u.idir_email IS NOT NULL OR u.idir_email != '') AND r.user_id IS NOT NULL AND r.team_id IS NOT NULL AND (ut.role IS NULL OR ut.role = '') THEN 'Requester left team'
      WHEN r.uses_team = FALSE THEN
        CASE WHEN (u.idir_email IS NULL OR u.idir_email = '') THEN 'One off. Fixed summer 2022' ELSE 'Requester' END
      WHEN r.uses_team = TRUE THEN
        CASE WHEN (ut.role IS NOT NULL OR ut.role != '') THEN
          CASE WHEN (u.idir_email IS NULL OR u.idir_email = '') THEN 'One off. Fixed summer 2022' ELSE ut.role END
        END
    END AS role,
    r.realm,
    ARRAY_TO_STRING(r.environments, ', ') as environments,
    ARRAY_TO_STRING(r.dev_idps, ', ') as dev_idps,
    ARRAY_TO_STRING(r.test_idps, ', ') as test_idps,
    ARRAY_TO_STRING(r.prod_idps, ', ') as prod_idps
  FROM requests as r
    LEFT JOIN users as u ON u.id=r.user_id
    LEFT JOIN users_teams as ut ON r.user_id=ut.user_id AND r.team_id=ut.team_id
    INNER JOIN events as e ON e.request_id=r.id
    WHERE r.archived=FALSE
    AND r.bceid_approved=TRUE
    AND r.status!='draft'
    ORDER BY id;
`);

  return results;
};
