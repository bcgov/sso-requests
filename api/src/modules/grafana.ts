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
  return response.data.results.logs.frames.reduce((acc, curr) => {
    // The query selects a single column (log_line), so it is the first values array
    return acc.concat(curr.data.values[0] ?? []);
  }, []);
};
