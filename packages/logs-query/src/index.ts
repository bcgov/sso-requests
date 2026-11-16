export const LIVE_SCHEMA_CUTOFF_HOURS = 24;
// The live schema keeps data back to UTC midnight of the current day minus this many days.
export const LIVE_SCHEMA_RETENTION_DAYS = 7;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface LogSchemas {
  // Long-term storage; lags real time.
  retention: string;
  // Recent logs only.
  live: string;
}

export interface LogSourceRange {
  table: string;
  from: number;
  to: number;
  inclusiveEnd: boolean;
}

// Logs older than the returned time are read from the retention schema, newer from the live schema.
// The cutoff is pending confirmation of the exact cutover cadence.
export const getLiveSchemaBoundary = (nowMs: number) => {
  const cutoff = Math.floor((nowMs - LIVE_SCHEMA_CUTOFF_HOURS * HOUR_MS) / HOUR_MS) * HOUR_MS;
  const retentionFloor = Math.floor(nowMs / DAY_MS) * DAY_MS - LIVE_SCHEMA_RETENTION_DAYS * DAY_MS;
  return Math.max(cutoff, retentionFloor);
};

export const getLogSourceRanges = (
  startMs: number,
  endMs: number,
  nowMs: number,
  { retention, live }: LogSchemas,
): LogSourceRange[] => {
  const boundary = getLiveSchemaBoundary(nowMs);
  if (endMs < boundary) return [{ table: retention, from: startMs, to: endMs, inclusiveEnd: true }];
  if (startMs >= boundary) return [{ table: live, from: startMs, to: endMs, inclusiveEnd: true }];
  return [
    { table: retention, from: startMs, to: boundary, inclusiveEnd: false },
    { table: live, from: boundary, to: endMs, inclusiveEnd: true },
  ];
};

const toTrinoTimestamp = (ms: number) => `from_iso8601_timestamp('${new Date(ms).toISOString()}')`;

// Escapes a value for use inside a single-quoted LIKE pattern using a backslash escape character.
const escapeLikeLiteral = (value: string) => value.replace(/[\\%_]/g, '\\$&').replace(/'/g, "''");

export const buildLogsQuery = (
  env: string,
  ranges: LogSourceRange[],
  clientId: string,
  deploymentEnvironment: string = 'development',
) => {
  const namespacePrefix = deploymentEnvironment === 'production' ? 'eb75ad' : 'e4ca1d';
  const selects = ranges.map(
    ({ table, from, to, inclusiveEnd }) =>
      `SELECT json_extract_scalar(message, '$.message') AS inner_message, timestamp FROM ${table} WHERE ELEMENT_AT(container.labels, 'namespace') = '${namespacePrefix}-${env}' AND container.name = 'sso-keycloak' AND message LIKE '%realmId=standard,%' AND message LIKE '%clientId=${escapeLikeLiteral(
        clientId,
      )},%' ESCAPE '\\' AND timestamp >= ${toTrinoTimestamp(from)} AND timestamp ${
        inclusiveEnd ? '<=' : '<'
      } ${toTrinoTimestamp(to)}`,
  );
  return `SELECT inner_message AS log_line FROM (${selects.join(' UNION ALL ')}) order by timestamp desc`;
};
