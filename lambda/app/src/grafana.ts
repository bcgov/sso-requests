import axios from 'axios';

export const queryGrafana = async (query: string, start: number, end: number, limit: number) => {
  const results = await axios.get(`${process.env.SSO_LOGS_URL}/v1/query_range`, {
    params: {
      query,
      start,
      end,
      limit,
    },
    headers: {
      Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
    },
  });
  return results.data.data.result.reduce((acc, curr) => {
    // Returning just the log, id in first position
    const currentLogs = curr.values.map((val) => val[1]);
    return acc.concat(currentLogs);
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
