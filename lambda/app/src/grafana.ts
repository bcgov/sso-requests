import axios from 'axios';

export const fetchDatasourceUID = async (datasourceName: string) => {
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
        rawSql: `select json_build_object('event', event_type, 'count', count) from (select distinct event_type, SUM(\"count\") OVER (PARTITION BY \"event_type\") as count from client_events where client_id = '${clientId}' and environment = '${environment}' and date(date) >= '${fromDate}' and date(date) <= '${toDate}') client_event_data;`,
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
    result = values[0].map((item) => JSON.parse(item));
  }

  return result;
};
