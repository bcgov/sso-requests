# Audit alerts

The alerts that keep the audit record trustworthy. They are configured in the Grafana repository, not
here; this page is their specification. Event columns and outcomes are described in [events.md](events.md).

| Alert                      | Source | Severity |
| -------------------------- | ------ | -------- |
| Audit write failed         | Loki   | page     |
| Hanging inline operation   | SQL    | alert    |
| Hanging workflow operation | SQL    | alert    |
| Local sync failed          | SQL    | alert    |
| Inline failure rate        | SQL    | warn     |

Workflow failures are not alerted from here: the engine's `failWorkflow` already posts to the ops channel
(`alertOps` in `app/workflow/orchestrator.ts`) when it dead-letters a workflow.

## Audit write failed

An event could not be written. A strict write fails the change it describes, so the user saw an error; a
best-effort outcome write (after Keycloak or SDX already changed) leaves its operation unanswered. Either
way the audit record is missing something until someone looks.

```logql
sum(count_over_time({service="sso-requests"} |= "audit_event_write_failed" [5m])) > 0
```

Add the same rule for the API's service label. The log line carries `eventCode`, `outcome`,
`operationId`, `requestId`, `teamId` and `organizationId`.

## Hanging inline operation

A Keycloak or SDX call was recorded as `requested` and never answered: the pod died mid-call, or the
outcome write failed (which also raises the alert above). The change may or may not have happened; check
Keycloak.

```sql
SELECT r.*
FROM events r
WHERE r.outcome = 'requested'
  AND r.created_at < now() - interval '15 minutes'
  AND r.event_code NOT IN ('request-create', 'request-update', 'request-delete', 'request-restore',
                           'api-account-create', 'api-account-delete', 'api-account-restore')
  AND NOT EXISTS (
    SELECT 1 FROM events o
    WHERE o.operation_id = r.operation_id
      AND o.event_code = r.event_code
      AND o.outcome IN ('success', 'failure', 'superseded')
  );
```

The workflow-backed actions excluded here are `WORKFLOW_ACTIONS` in `packages/audit/src/vocabulary.ts`.

## Hanging workflow operation

A workflow-backed operation with no outcome after an hour: the workflow is stuck (retrying, or claimed by
a pod that died and not yet recovered). The same query with the opposite action filter and a longer
threshold:

```sql
SELECT r.*
FROM events r
WHERE r.outcome = 'requested'
  AND r.created_at < now() - interval '60 minutes'
  AND r.event_code IN ('request-create', 'request-update', 'request-delete', 'request-restore',
                       'api-account-create', 'api-account-delete', 'api-account-restore')
  AND NOT EXISTS (
    SELECT 1 FROM events o
    WHERE o.operation_id = r.operation_id
      AND o.event_code = r.event_code
      AND o.outcome IN ('success', 'failure', 'superseded')
  );
```

`operation_id` is the workflow's `correlation_id`, so `request_workflows` and its step rows show where it
stopped.

## Local sync failed

Keycloak (or SDX) made the change, but the database write that mirrors it did not commit, so the two now
disagree — for example a role that exists in Keycloak with no `request_roles` row.

```sql
SELECT *
FROM events
WHERE outcome = 'failure'
  AND details->>'stage' = 'local-sync'
  AND created_at > now() - interval '1 hour';
```

## Inline failure rate

Failures per inline action over the last hour, to catch a Keycloak or SDX problem that is failing calls
without any single one being remarkable.

```sql
SELECT event_code, count(*) AS failures
FROM events
WHERE outcome = 'failure'
  AND created_at > now() - interval '1 hour'
  AND event_code NOT IN ('request-create', 'request-update', 'request-delete', 'request-restore',
                         'api-account-create', 'api-account-delete', 'api-account-restore', 'email-submission')
GROUP BY event_code
HAVING count(*) > 5;
```

The threshold of 5 is a starting point. Replication records a `role-assign` failure for each IDIR user
with no Azure IDIR account, which is a normal outcome; exclude rows with `details->>'replicatedFrom'` set
if they make this noisy.

## Rows that used to alert

`team-admin-removal` is no longer written. A panel or alert built on it should use the replacement query in
[events.md](events.md#finding-admins-removed-from-a-team).
