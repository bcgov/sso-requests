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
