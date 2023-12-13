import axios from 'axios';

export const fetchDatasourceUID = async (datasourceName) => {
  return axios
    .get(`${process.env.GRAFANA_API_URL}/datasources`, {
      headers: {
        Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
    .then((res) => res.data.find((source) => source.name === datasourceName)?.uid);
};

export const queryGrafana = async (query: string, start: number, end: number, limit: number) => {
  const lokiUID = await fetchDatasourceUID('SSO Loki');
  const response = await axios.post(
    `${process.env.GRAFANA_API_URL}/ds/query`,
    {
      queries: [
        {
          refId: 'logs',
          expr: query,
          queryType: 'range',
          datasource: {
            type: 'loki',
            uid: lokiUID,
          },
          maxLines: limit,
        },
      ],
      from: String(start),
      to: String(end),
    },
    {
      params: {
        ds_type: 'loki',
      },
      headers: {
        Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data.results.logs.frames.reduce((acc, curr) => {
    // Raw logs are in third array position. First entries are filenames and IDs
    return acc.concat(curr.data.values[2]);
  }, []);
};

export const clientEventsAggregationQuery = (
  clientId: string,
  environment: string,
  fromDate: string,
  toDate: string,
) => {
  return {
    queries: [
      {
        datasource: { type: 'postgres', uid: process.env.GRAFANA_AGGREGATOR_DS_UID },
        rawSql: `select json_build_object('event', event_type, 'count', count) from (select distinct event_type, SUM(\"count\") OVER (PARTITION BY \"event_type\") as count from client_events where client_id = '${clientId}' and environment = '${environment}' and date >= '${fromDate}' and date <= '${toDate}') client_event_data;`,
        format: 'table',
      },
    ],
  };
}; //23beuGVIz
