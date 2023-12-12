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
