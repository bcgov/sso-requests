import axios from 'axios';

export const fetchLogs = async (
  env: string,
  clientId: string,
  unixStartTime: number,
  unixEndTime: number,
  eventType: string,
  logSizeLimit: number,
) => {
  const results = await axios.get(`${process.env.SSO_LOGS_URL}/v1/query_range`, {
    params: {
      query: `{environment="${env}", client_id="${clientId}", event_type="${eventType}"}`,
      start: unixStartTime,
      end: unixEndTime,
      limit: logSizeLimit,
    },
    headers: {
      Authorization: `Bearer ${process.env.GRAFANA_API_TOKEN}`,
    },
  });
  const allLogs = results.data.data.result.reduce((acc, curr) => {
    // Returning just the log, id in first position
    const currentLogs = curr.values.map((val) => val[1]);
    return acc.concat(currentLogs);
  }, []);

  return allLogs;
};
