import axios from 'axios';

const clientEventsAggregationQuery = (clientId: string, environment: string) => {
  return {
    queries: [
      {
        datasource: { type: 'postgres', uid: '23beuGVIz' },
        rawSql: `select json_build_object('event', event_type, 'count', count(1)) from client_events where client_id = '${clientId}' and environment = '${environment}' group by event_type;`,
        format: 'table',
      },
    ],
  };
};

export const getAggregatedDataByClientId = async (clientId: string, environment: string) => {
  try {
    let result = [];
    const query = clientEventsAggregationQuery(clientId, environment);
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
