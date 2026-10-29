# Audit events

The `events` table is the long-term audit record: who changed what, through which path, and how it ended.
It is retained indefinitely and queried from Grafana. Request-level debugging (which route was hit, by
whom, with what status) lives in the Loki request logs, which are kept for two weeks; the `req_id` column
joins an event to its request's log lines.

Every row is written through `@sso/audit` (`packages/audit`), by the app and the API alike, so the same
change produces the same row whichever path it came through. Rows are never updated or deleted.

## Reading a row

| Column                                     | Meaning                                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `event_code`                               | The **action**, e.g. `role-assign`. See the tables below.                                                                                                                                            |
| `outcome`                                  | `requested`, `success`, `failure` or `superseded`.                                                                                                                                                   |
| `operation_id`                             | Links a `requested` row to its outcome. For workflow-backed actions it is the workflow's `correlation_id`, which also appears in workflow log lines and ops alerts.                                  |
| `parent_operation_id`                      | Set on each change in a batch (a multi-role update, a replicate, a bulk role create), pointing at the batch's own operation.                                                                         |
| `request_id`, `team_id`, `organization_id` | The resources the event is about. None of them has a foreign key, so they keep naming a resource after it is deleted.                                                                                |
| `workflow_id`                              | The workflow that carried a workflow-backed action.                                                                                                                                                  |
| `target_type`, `target_id`                 | What the action was done to: `user` / `service-account` (a Keycloak username, lowercased), `app-user` (a `users` row id), `role` (a role name), `team`, `integration` (a client id), `organization`. |
| `environment`                              | `dev`, `test` or `prod`, for actions that happen in one Keycloak environment.                                                                                                                        |
| `actor_type`, `actor_id`                   | Who did it: `user` (an IDIR user id), `service-account` (an API account's client id) or `system` (`workflow-engine`, `sdx-callback`, `stale-user-cleanup`, `user-record-deduplication`).             |
| `idir_userid`, `idir_user_display_name`    | Kept for existing panels; filled only when the actor is a user.                                                                                                                                      |
| `details`                                  | Action-specific context, typed per action in `packages/audit/src/details.ts`. A failure adds `error: { message, status? }`.                                                                          |

### Outcomes

- A change that only touches the database writes one `success` row, in the same transaction as the change.
- A change that calls Keycloak or SDX writes `requested` first, then exactly one of `success` or `failure`
  under the same `operation_id`. If the `requested` row cannot be written, the outside call is never made.
- A workflow-backed change writes `requested` in the transaction that saves the integration and enqueues
  the workflow; the workflow engine (actor `system: workflow-engine`) writes the outcome. A workflow that a
  newer one took over ends `superseded`, with `supersededByOperationId` in `details`.
- `failure` with `details.stage = 'local-sync'` means the outside call succeeded but the database write
  that mirrors it did not: Keycloak and the database disagree and need a look.
- Requests rejected before anything changes (400, 403, 404, 409) are not audited; the request log has them. The
  exception is the daily request limit (`request-limit-reached`), recorded as a sign of abusive usage.

## Actions

### Integrations (workflow-backed)

| Action                  | Meaning                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request-create`        | The first submission of an integration. `requested` is the submission; the outcome is the Keycloak apply.                                                                                 |
| `request-update`        | A later submission or resubmit. The `requested` row carries `details.changes` (and an admin's `comment`).                                                                                 |
| `request-delete`        | Deleting an integration. A draft, which never reached Keycloak, is deleted with a single `success` row.                                                                                   |
| `request-restore`       | Restoring an archived integration.                                                                                                                                                        |
| `request-plan`          | A step inside one of the above (planning), under the same `operation_id`. Never the operation's outcome.                                                                                  |
| `request-limit-reached` | A user hit the daily limit on new integrations and was refused (429). One `success` row recording that it happened, with `details.limit` and `details.count`; targets the user's app row. |
| `request-status-update` | An admin set an integration's status directly from the dashboard, outside any workflow; `details.before` / `details.after`.                                                               |
| `api-account-create`    | Creating a team or organization API account. Any later apply on the same account is also recorded as `api-account-create`.                                                                |
| `api-account-delete`    | Deleting an API account. One that never reached Keycloak is deleted with a single `success` row.                                                                                          |
| `api-account-restore`   | Restoring an API account.                                                                                                                                                                 |

A failure records `details.failedStep` and `details.reason`; the workflow is also dead-lettered and ops is alerted.

### Roles and role assignments

| Action                  | Meaning                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `role-create`           | A client role was created, targeting the role by name.                                                        |
| `role-update`           | A role was changed (API only); `details.newRoleName` when it was renamed.                                     |
| `role-delete`           | A role was deleted.                                                                                           |
| `role-composite-update` | A role's composites changed; `details.add` / `details.remove` list them.                                      |
| `role-assign`           | A role was granted to a user or service account. From a replicate, `details.replicatedFrom` is the IDIR user. |
| `role-unassign`         | A role was revoked.                                                                                           |
| `role-bulk-create`      | Parent of a bulk role creation (more than one role or environment).                                           |
| `role-bulk-update`      | Parent of a role-assignment request with more than one change. A single change has no parent.                 |
| `role-replicate`        | Parent of an IDIR → Azure IDIR role replication; one `role-assign` child per user still to replicate.         |

A batch parent ends `success` only if every child did, with `details.total`, `succeeded` and `failed`.

### Secrets, credentials and logs

| Action             | Meaning                                                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `secret-rotate`    | A client secret was rotated (an integration's, or an API account's).                                                                                                   |
| `credentials-view` | Installation JSON or API-account credentials were viewed. Written before they are returned, or not returned.                                                           |
| `logs-download`    | Client logs were downloaded: `requested`, then the Loki query, then `success` (with the line `count`) or `failure`. Logs are returned only once `success` is recorded. |

### SDX

| Action                      | Meaning                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `sdx-request-create`        | An access request was submitted to SDX; the success row carries its `submissionId`.           |
| `sdx-access-request-update` | SDX called back with an approval and the client scopes were updated (`system: sdx-callback`). |

### Teams

| Action                    | Meaning                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `team-create`             | A team was created.                                                 |
| `team-update`             | A team's name changed; `details.before` / `details.after`.          |
| `team-delete`             | A team was deleted.                                                 |
| `team-member-add`         | A user joined a team, with `details.role`.                          |
| `team-member-remove`      | A user left a team; `details.reason = 'user-deleted'` from cleanup. |
| `team-member-role-update` | A member's team role changed; `details.before` / `details.after`.   |

### Users

| Action                  | Meaning                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user-create`           | A user's app row was created at first sign-in.                                                                                                                                                                                                     |
| `user-update`           | A user's IDIR details changed at sign-in; `details.changes` maps each field to its `before` and `after`.                                                                                                                                           |
| `user-delete`           | A user row was deleted: by stale-user cleanup, or merged into another by deduplication (`details.mergedIntoUserId`).                                                                                                                               |
| `user-profile-update`   | A user changed their own profile.                                                                                                                                                                                                                  |
| `transfer-of-ownership` | An integration owned by a deleted user was handed to the SSO team (`details.fromUserId`, `toUserId`). A `failure` (best effort, with the error) means the handover's transaction rolled back and the integration still points at the deleted user. |

### Organizations

| Action                            | Meaning                                               |
| --------------------------------- | ----------------------------------------------------- |
| `organization-create`             | An organization was created.                          |
| `organization-update`             | An organization was renamed.                          |
| `organization-delete`             | An organization was deleted.                          |
| `organization-member-add`         | A user joined an organization.                        |
| `organization-member-remove`      | A user left an organization.                          |
| `organization-member-role-update` | A member's organization role changed.                 |
| `organization-team-invite`        | A team was invited, with the permissions on offer.    |
| `organization-team-join`          | A team accepted, consenting to `details.permissions`. |
| `organization-team-decline`       | A team declined an invitation.                        |
| `organization-team-leave`         | A team left, or was removed; `details.removedBy`.     |
| `organization-consent-update`     | A team changed the permissions it consents to.        |
| `organization-overrides-update`   | A team changed its per-integration overrides.         |

### Email

| Action             | Meaning                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `email-submission` | An email about an integration failed to send (`failure` only, with `details.code`). |

## Rows from before the action/outcome model

The 2026-10-21 migration split every `-success` / `-failure` suffix into `outcome` and copied what older
`details` held directly into the new columns; `details` itself was left as it was. Older rows therefore
keep older `details` shapes, and the actor of a row with no IDIR user is `system` with no id. Codes whose
name changed are listed in `LEGACY_AUDIT_ACTIONS` and are still offered as filters in the admin panel.

| Code as stored                                                   | Meaning, and what records it now                                                                                                                            |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request-apply`                                                  | The Keycloak apply of an integration. Now the engine's outcome on `request-create` / `request-update`. Cannot be split into create and update mechanically. |
| `request-create`, `request-update` with no `workflow_id`         | The submission itself, recorded `success` at submit time. Now the `requested` row of the same action.                                                       |
| `request-delete` with no `workflow_id`                           | A delete recorded at submit time. Now `requested`, answered by the engine.                                                                                  |
| `request-pr`                                                     | A step of the retired pull-request pipeline.                                                                                                                |
| `team-admin-removal`                                             | An admin removed from a team. Now `team-member-remove` or `team-member-role-update`; see below.                                                             |
| `organization-member-added`, `-removed`, `-role-updated`         | Now `organization-member-add`, `-remove`, `-role-update`.                                                                                                   |
| `organization-team-invited`, `-joined`, `-declined`, `-left`     | Now `organization-team-invite`, `-join`, `-decline`, `-leave`.                                                                                              |
| `organization-consent-updated`, `organization-overrides-updated` | Now `organization-consent-update`, `organization-overrides-update`.                                                                                         |
| `email-submission` with `outcome = 'failure'`                    | Unchanged in meaning; older rows have `details.emailCode` and a plain `error` string.                                                                       |

### Finding admins removed from a team

`team-admin-removal` is no longer written. Admins removed from, or demoted within, a team are found with:

```sql
SELECT *
FROM events
WHERE (event_code IN ('team-member-remove', 'team-member-role-update')
       AND (details->>'role' = 'admin' OR details->>'before' = 'admin'))
   OR event_code = 'team-admin-removal' -- rows written before the change
ORDER BY created_at DESC;
```

## Keeping it complete

The integration tests (app `jest-api`, and the api's suite) enforce this page:

- **Route coverage.** Every write route is listed in a manifest (`app/jest-api/audit-coverage-manifest.ts`,
  `api/src/tests/audit-coverage-manifest.ts`) with the actions it must record, or a reason it records none.
  A test that runs last fails on a write route with no entry, a stale entry, an audited route no test saw
  record its action, or a GET route seen writing without an entry.
- **Invariants.** Before every wipe of the test database, `packages/audit/test-support/invariants.ts` checks
  that each `requested` row has exactly one outcome, every row has an actor, workflow-backed operations
  name their workflow, every parent operation exists, and no row was ever updated.
- **App and api agree.** Both suites run the same role scenario through their own routes and assert the
  same normalized rows (`packages/audit/test-support/matching.ts`).

## Alerts

The alerts built on these rows are in [audit-alerts.md](audit-alerts.md).
