import { getAdminClient } from '@lambda-app/keycloak/adminClient';
import { sequelize } from '@lambda-shared/sequelize/models/models';
import difference from 'lodash.difference';
import filter from 'lodash.filter';
import map from 'lodash.map';
import partition from 'lodash.partition';
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
  if (table == 'Requests') {
    const [results] = await sequelize.query(`
    SELECT
    id,
    idir_userid,
    project_name,
    client_name,
    realm,
    public_access,
    ARRAY_TO_STRING(dev_valid_redirect_uris, ', ') AS dev_valid_redirect_uris,
    ARRAY_TO_STRING(test_valid_redirect_uris, ', ') AS test_valid_redirect_uris,
    ARRAY_TO_STRING(prod_valid_redirect_uris, ', ') AS prod_valid_redirect_uris,
    ARRAY_TO_STRING(environments, ', ') AS environments,
    pr_number,
    action_number,
    created_at,
    updated_at,
    project_lead,
    preferred_email,
    new_to_sso,
    agree_with_terms,
    bceid_approved,
    status,
    archived,
    idir_user_display_name,
    additional_emails,
    has_unread_notifications,
    browser_flow_override,
    team_id,
    uses_team,
    requester,
    user_id,
    service_type,
    ARRAY_TO_STRING(dev_idps, ', ') AS dev_idps,
    ARRAY_TO_STRING(test_idps, ', ') AS test_idps,
    ARRAY_TO_STRING(prod_idps, ', ') AS prod_idps,
    ARRAY_TO_STRING(dev_roles, ', ') AS dev_roles,
    ARRAY_TO_STRING(test_roles, ', ') AS test_roles,
    ARRAY_TO_STRING(prod_roles, ', ') AS prod_roles,
    dev_access_token_lifespan,
    dev_offline_session_idle_timeout,
    dev_offline_session_max_lifespan,
    dev_session_idle_timeout,
    dev_session_max_lifespan,
    test_access_token_lifespan,
    test_offline_session_idle_timeout,
    test_offline_session_max_lifespan,
    test_session_idle_timeout,
    test_session_max_lifespan,
    prod_access_token_lifespan,
    prod_offline_session_idle_timeout,
    prod_offline_session_max_lifespan,
    prod_session_idle_timeout,
    prod_session_max_lifespan,
    client_id,
    provisioned,
    provisioned_at,
    dev_login_title,
    test_login_title,
    prod_login_title,
    service_account_enabled,
    api_service_account,
    auth_type
    FROM ${table} ORDER BY ${orderBy};
    `);
    return results;
  } else if (table == 'Events') {
    const [results] = await sequelize.query(`
    SELECT id, created_at, updated_at, request_id, event_code, idir_userid, details::text, idir_user_display_name FROM ${table} ORDER BY created_at desc, ${orderBy} limit 5000;
    `);
    return results;
  } else {
    const [results] = await sequelize.query(`
    SELECT * FROM ${table} ORDER BY ${orderBy};
    `);
    return results;
  }
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

export const getDataIntegrityReport = async () => {
  let report = {};
  const [results] = await sequelize.query(`
    SELECT id, status, environments, client_id, api_service_account FROM requests WHERE archived=FALSE;
    `);

  const integrationByAccountType = partition(results, function (o) {
    return o.api_service_account === true;
  });

  for (let environment of ['dev', 'test', 'prod']) {
    const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
    const stdClients = await kcAdminClient.clients.find({ realm: 'standard' });
    report[environment] = {};

    // populate all the integrations with null client ids
    report[environment]['null-client-ids'] = integrationByAccountType[1]
      .filter((c) => c.environments.includes(environment) && !c.client_id)
      .map((c) => {
        return {
          id: c.id,
          status: c.status,
        };
      });

    // remove null client ids for further analysis
    const cssClientIds = integrationByAccountType[1]
      .filter((c) => c.environments.includes(environment) && !!c.client_id)
      .map((c) => c.client_id);

    // all API accounts are found only in prod environment with prefix `service-account-`
    if (environment === 'prod') {
      integrationByAccountType[0].map((c) => {
        cssClientIds.push(c.client_id);
      });
    }

    const stdClientsByDesc = partition(stdClients, function (c) {
      return c.description === 'CSS App Created';
    });

    // collect all the integrations created manually in keycloak
    report[environment]['manually-created-in-keycloak'] = stdClientsByDesc[1].map((c) => {
      return {
        client: c.clientId,
        enabled: c.enabled,
      };
    });

    // list of keycloak clients missing from CSS database
    const kcClients = difference(
      stdClientsByDesc[0].map((c) => c.clientId),
      cssClientIds,
    );
    report[environment]['missing-or-archived-in-css'] = map(kcClients, function (c) {
      const cssClient = stdClientsByDesc[0].find((kc) => kc.clientId === c);
      return {
        client: c,
        enabled: cssClient?.enabled,
      };
    });

    // list of active CSS clients missing from Keycloak
    const cssClients = difference(
      cssClientIds,
      stdClientsByDesc[0].map((c) => c.clientId),
    );
    report[environment]['missing-from-keycloak'] = map(cssClients, function (c) {
      const kcClient = results.find((kc) => kc.client_id === c);
      return {
        client: c,
        status: kcClient?.status,
        id: kcClient?.id,
      };
    });
  }

  return report;
};
