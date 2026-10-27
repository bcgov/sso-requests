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

  const values = res?.data?.results?.A?.frames[0]?.data?.values;

  if (values.length > 0) {
    result = values[0].map((item: any) => JSON.parse(item));
  }

  return result;
};

export const fetchKeycloakRoleUsersCount = async (clientId: string, roleName: string) => {
  try {
    const keycloakDatasourceUID = await fetchDatasourceUID('SSO Keycloak Dev');

    const query = {
      queries: [
        {
          datasource: { type: 'grafana-postgresql-datasource', uid: keycloakDatasourceUID },
          rawSql: `SELECT COUNT(DISTINCT urm.USER_ID) AS user_count\nFROM USER_ROLE_MAPPING urm\nJOIN KEYCLOAK_ROLE kr\n    ON kr.ID = urm.ROLE_ID\nJOIN CLIENT c\n    ON c.ID = kr.CLIENT\nJOIN REALM r\n    ON r.ID = c.REALM_ID\nWHERE kr.NAME = ${escapeLiteral(
            roleName,
          )}\n  AND c.CLIENT_ID = ${escapeLiteral(clientId)}\n  AND r.NAME = 'standard'`,
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
    const values = res?.data?.results?.A?.frames[0]?.data?.values;
    if (values && values.length > 0) {
      return Number(values[0][0]);
    }
    return 0;
  } catch (err) {
    console.error('Failed to fetch Keycloak role users count:', err);
    return 0;
  }
};
