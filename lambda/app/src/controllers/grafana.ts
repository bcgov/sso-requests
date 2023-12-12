import axios from 'axios';

const clientEventsAggregationQuery = (clientId: string, environment: string, fromDate: string, toDate: string) => {
  console.log(fromDate);
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

export const getAggregatedDataByClientId = async (
  clientId: string,
  environment: string,
  fromDate: string,
  toDate: string,
) => {
  try {
    let result = [];
    const query = clientEventsAggregationQuery(clientId, environment, fromDate, toDate);
    const headers = {
      Authorization: `Bearer ${process.env.GRAFANA_SA_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    const res: any = await axios.post(`${process.env.GRAFANA_API_URL}/ds/query`, query, { headers });

    const values = res?.data?.results?.A?.frames[0]?.data?.values;

    if (values.length > 0) {
      result = values[0].map((item) => JSON.parse(item));
    }

    return [result, null];
  } catch (err) {
    console.error(err);
    return [null, err];
  }
};
