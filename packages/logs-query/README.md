# @sso/logs-query

Pure helpers for downloading Keycloak logs from Trino, shared by `app` and `api`.

**This package has no dependencies and performs no I/O.** Callers read the schema names
(`TRINO_RETENTION_SCHEMA`, `TRINO_LIVE_SCHEMA`) from their own environment and send the
resulting SQL through Grafana themselves.

- `getLogSourceRanges(start, end, now, schemas)` splits a time range between the retention schema
  (older, lagging) and the live schema (recent). The boundary is `now - LIVE_SCHEMA_CUTOFF_HOURS`,
  rounded down to the UTC hour, and never earlier than the live schema's retention floor.
- `buildLogsQuery(env, ranges, clientId, deploymentEnvironment)` builds one Trino query, joining both parts with `UNION ALL` when the range crosses the boundary. It uses the `e4ca1d` namespace outside production and `eb75ad` in production.

```bash
make logs_query_install
make logs_query_test
```
