import axios from 'axios';
import { escapeLiteral } from 'pg';

export const fetchDatasourceUID = async (datasourceName: string) => {
  return axios
    .get(`${process.env.GRAFANA_API_URL}/datasources`, {
      headers: {
        Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then((res) => res.data.find((source: any) => source.name === datasourceName)?.uid);
};

export const queryGrafana = async (query: string, start: number, end: number, limit: number) => {
  const trinoUID = await fetchDatasourceUID('SIEM Trino');
  const response = await axios.post(
    `${process.env.GRAFANA_API_URL}/ds/query`,
    {
      queries: [
        {
          refId: 'logs',
          rawSql: `${query.trim().replace(/;$/, '')} LIMIT ${Number(limit)}`,
          format: 1, // sqlds FormatQueryOption: 1 = table
          datasource: {
            type: 'trino',
            uid: trinoUID,
          },
        },
      ],
      from: String(start),
      to: String(end),
    },
    {
      params: {
        ds_type: 'trino',
      },
      headers: {
        Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data.results.logs.frames.reduce((acc: any, curr: any) => {
    // The query selects a single column (inner_message), so it is the first values array
    return acc.concat(curr.data.values[0] ?? []);
  }, []);
};

export const clientEventsAggregationQuery = async (
  clientId: string,
  environment: string,
  fromDate: string,
  toDate: string,
) => {
  let result = [];

  const aggregatorUID = await fetchDatasourceUID('SSO Aggregator');

  const query = {
    queries: [
      {
        datasource: { type: 'postgres', uid: aggregatorUID },
        rawSql: `select json_build_object('event', event_type, 'count', count) from (select distinct event_type, SUM("count") OVER (PARTITION BY "event_type") as count from client_events_with_idp where client_id = ${escapeLiteral(
          clientId,
        )} and environment = ${escapeLiteral(environment)} and date(date) >= ${escapeLiteral(
          fromDate,
        )} and date(date) <= ${escapeLiteral(toDate)}) client_event_data;`,
        format: 'table',
      },
    ],
  };

  const headers = {
    Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  const res: any = await axios.post(`${process.env.GRAFANA_API_URL}/ds/query`, query, { headers });

  const values = res?.data?.results?.A?.frames?.[0]?.data?.values;

  if (Array.isArray(values) && values.length > 0) {
    result = values[0].map((item: any) => {
      if (typeof item === 'string') return JSON.parse(item);
      else return item;
    });
  }

  return result;
};

const getKeycloakDataSourceByEnv = (kcEnv: string) => {
  let dataSourceName = 'SSO Keycloak Prod';
  if (kcEnv === 'test') dataSourceName = 'SSO Keycloak Test';
  if (kcEnv === 'dev') dataSourceName = 'SSO Keycloak Dev';
  return dataSourceName;
};

// Grafana returns the single JSON column either as a string or an already-parsed object
const parseJsonResult = (res: any): { totalCount: number; data: any[] } => {
  const value = res?.data?.results?.A?.frames?.[0]?.data?.values?.[0]?.[0];
  if (value === undefined || value === null) throw new Error('Unexpected response from Grafana query');
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  return { totalCount: Number(parsed.totalCount) || 0, data: parsed.data || [] };
};

export const fetchKeycloakRoleUsers = async (
  kcEnv: string,
  clientId: string,
  roleName: string,
  searchKey: string = '',
  pageSize: number = 5,
  pageOffset: number = 0,
) => {
  try {
    if (!kcEnv || !clientId || !roleName) throw new Error('Missing required parameters for looking up role users');
    const dataSourceName = getKeycloakDataSourceByEnv(kcEnv);
    const keycloakDatasourceUID = await fetchDatasourceUID(dataSourceName);

    const query = {
      queries: [
        {
          datasource: { type: 'grafana-postgresql-datasource', uid: keycloakDatasourceUID },
          rawSql: `
            WITH params AS (
              SELECT
                ${escapeLiteral(searchKey)}::TEXT AS search_key,
                ${escapeLiteral(String(pageSize))}::INT AS page_size,
                ${escapeLiteral(String(pageOffset))}::INT AS page_offset
            ),
            filtered_users AS (
              SELECT DISTINCT u.ID, u.USERNAME, u.EMAIL, u.FIRST_NAME, u.LAST_NAME
              FROM USER_ROLE_MAPPING urm
              JOIN KEYCLOAK_ROLE kr ON kr.ID = urm.ROLE_ID
              JOIN CLIENT c ON c.ID = kr.CLIENT
              JOIN REALM r ON r.ID = c.REALM_ID
              JOIN USER_ENTITY u ON u.ID = urm.USER_ID
              CROSS JOIN params p
              WHERE kr.NAME = ${escapeLiteral(roleName)}
                AND c.CLIENT_ID = ${escapeLiteral(clientId)}
                AND r.NAME = 'standard'
                AND u.SERVICE_ACCOUNT_CLIENT_LINK IS NULL
                AND (
                  p.search_key IS NULL
                  OR p.search_key = ''
                  OR u.USERNAME ILIKE '%' || p.search_key || '%'
                  OR u.EMAIL ILIKE '%' || p.search_key || '%'
                  OR u.FIRST_NAME ILIKE '%' || p.search_key || '%'
                  OR u.LAST_NAME ILIKE '%' || p.search_key || '%'
                )
            ),
            paginated_users AS (
              SELECT *
              FROM filtered_users
              ORDER BY USERNAME, ID
              LIMIT (SELECT page_size FROM params)
              OFFSET (SELECT page_offset FROM params)
            )
            SELECT JSON_BUILD_OBJECT(
              'totalCount', (SELECT COUNT(*) FROM filtered_users),
              'data', COALESCE(
                (
                  SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', pu.ID,
                      'username', pu.USERNAME,
                      'email', pu.EMAIL,
                      'firstName', pu.FIRST_NAME,
                      'lastName', pu.LAST_NAME,
                      'attributes', COALESCE(
                        (
                          SELECT JSON_OBJECT_AGG(
                              ua.NAME,
                              ua.VALUE
                          )
                          FROM USER_ATTRIBUTE ua
                          WHERE ua.USER_ID = pu.ID
                        ),
                        '{}'::JSON
                      )
                    )
                    ORDER BY pu.USERNAME, pu.ID
                  )
                  FROM paginated_users pu
                ),
                '[]'::JSON
              )
            ) AS result;
          `,
          format: 'table',
        },
      ],
    };

    const headers = {
      Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res: any = await axios.post(`${process.env.GRAFANA_API_URL}/ds/query`, query, { headers });
    return parseJsonResult(res);
  } catch (err) {
    console.error('Failed to fetch Keycloak role users count:', err);
    throw err;
  }
};

export const fetchKeycloakRoleAssignedServiceAccounts = async (kcEnv: string, clientId: string, roleName: string) => {
  try {
    if (!kcEnv || !clientId || !roleName) {
      throw new Error('Missing required parameters');
    }
    const dataSourceName = getKeycloakDataSourceByEnv(kcEnv);
    const keycloakDatasourceUID = await fetchDatasourceUID(dataSourceName);
    const query = {
      queries: [
        {
          refId: 'A',
          datasource: { type: 'grafana-postgresql-datasource', uid: keycloakDatasourceUID },
          rawSql: `
            WITH service_accounts AS (
              SELECT DISTINCT u.ID, u.USERNAME, u.EMAIL, u.FIRST_NAME, u.LAST_NAME
              FROM USER_ROLE_MAPPING urm
              JOIN KEYCLOAK_ROLE kr ON kr.ID = urm.ROLE_ID
              JOIN CLIENT c ON c.ID = kr.CLIENT
              JOIN REALM r ON r.ID = c.REALM_ID
              JOIN USER_ENTITY u ON u.ID = urm.USER_ID
              WHERE kr.NAME = ${escapeLiteral(roleName)}
                AND c.CLIENT_ID = ${escapeLiteral(clientId)}
                AND r.NAME = 'standard'
                AND u.USERNAME LIKE 'service-account-%'
                AND u.SERVICE_ACCOUNT_CLIENT_LINK IS NOT NULL
            )
            SELECT JSON_BUILD_OBJECT(
              'totalCount', (SELECT COUNT(*) FROM service_accounts),
              'data', COALESCE(
                (
                  SELECT JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'id', ID,
                      'username', USERNAME,
                      'email', EMAIL,
                      'firstName', FIRST_NAME,
                      'lastName', LAST_NAME
                    )
                    ORDER BY USERNAME, ID
                  )
                  FROM service_accounts
                ),
                '[]'::JSON
              )
            ) AS result;
          `,
          format: 'table',
        },
      ],
    };
    const headers = {
      Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    const res: any = await axios.post(`${process.env.GRAFANA_API_URL}/ds/query`, query, { headers });
    return parseJsonResult(res);
  } catch (err) {
    console.error('Failed to fetch Keycloak role assigned service accounts:', err);
    throw err;
  }
};
