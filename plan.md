# Audit Coverage — Plan

## Overview

There are two audit sources:

- **OpenShift logs (Loki)**: retained for 2 weeks and used for application debugging. They record which routes were hit, when, and by whom, e.g. `{"module":"http","reqId":"…","userId":"id","method":"GET","path":"/api/teams","status":200,…}`. They are not a long-term audit record.
- **The `events` table**: persisted in the DB, queryable in Grafana, retained indefinitely. It records resource changes with context (who, what, which resource, outcome).

The events table stays the long-term audit record. Something like pgaudit would cover every write, but it can't record the IDIR user or service account behind a request without app changes anyway. This plan makes the events table complete, consistent and reliable.

Goals:

1. Full auditing of created resources and CRUD operations, with the gaps closed.
2. Stability: atomic commits wherever possible, and failures of third-party calls tracked and alertable.
3. One query model: the same change produces the same event shape whether it came from the app, the API or a batch operation (e.g. role assignments).

The current branch (`ssoteam-3038`) already did most of the coverage work, but its event plumbing (lifecycle row rewrites, triple codes, foreign keys on the new columns, actor defaults, duplicated writers, browser-side role fan-out) is replaced by the design below. The migration `2026.10.21T16.00.00.add-audit-event-context` hasn't been released, so it is **edited in place** rather than followed by a second migration.

---

## Design decisions

### Event model

1. **Strict writes.** For DB changes, the event is written in the same transaction as the change: both are saved or neither is. For calls to an outside system (Keycloak, SDX), the `requested` event must be stored before the call is made; if it can't be written, the request fails before anything changes outside the app. Only the outcome event written _after_ a successful outside call is best-effort (logged as `audit_event_write_failed` and alerted), because the unanswered `requested` row already shows the gap.
2. **Append-only.** Event rows are never updated or deleted by the application. A `requested` row and its outcome row are separate rows linked by `operation_id` (UUID). A child operation within a batch has its own `operation_id`, plus `parent_operation_id` pointing at the batch's parent row.
3. **Action code + outcome.** `event_code` holds the action (`role-assign`, `team-create`, …) and a new `outcome` column holds `requested | success | failure | superseded`. Actions that only change the DB write one `success` row. Actions with an outside call write `requested` and then a terminal outcome.
4. **Plain resource columns with no foreign keys.** `request_id`, `team_id`, `organization_id` and `workflow_id` are plain indexed columns, so history survives deletes. Every event fills in its resource column directly, including delete events (e.g. `team-delete` carries `team_id`). Copies like `details.teamId` are no longer written.
5. **Target columns + typed details.** New indexed columns `target_type` (`user | service-account | role | team | integration | organization | …`), `target_id` (a stable string id; for Keycloak users, the normalized username) and `environment` (`dev | test | prod` or null). Each action has a typed `details` schema in `@sso/audit`, enforced on **new writes only**. Readers must still handle the older `details` shapes.
6. **Mechanical backfill only.** The migration splits existing codes on their suffix (`-success`/`-failure`; codes without a suffix map to `success`) and fills the new columns only where an old `details` field gives the value directly (`details.teamId`, `details.userId`, `details.username`, `details.workflowId`). `details` is never rewritten. Old `request-apply-*` rows keep `request-apply` as a legacy action, because they can't be split into create versus update mechanically.
7. **Append-only by convention.** The shared writer exposes no update or delete. The invariant tests (see Tests) check it. There is no DB trigger.

### Actor

8. **A required, typed actor resolved once per request.**
   ```ts
   type Actor =
     | { type: 'user'; id: string /* idir_userid */; displayName: string }
     | { type: 'service-account'; id: string /* client id */; teamId?: number }
     | { type: 'system'; id: SystemActorId }; // 'stale-user-cleanup' | 'user-record-deduplication' | 'sdx-callback' | 'workflow-engine' | …
   ```
   - Request-wide context (`actor`, `reqId`) is kept in `AsyncLocalStorage`. App API routes set it after `authenticate` (inside `withApiLogging`, which already generates `reqId`). The Express API sets it in middleware after auth. Cron jobs and callbacks wrap their work in `withActor(systemActor('…'), fn)`.
   - `createEvent` reads the actor with `currentActor()`. If there is no actor, the write **fails**: no silent `system` fallback.
   - Everything the event is _about_ (action, outcome, resource ids, target, details, operation ids) is **always passed explicitly**, never taken from context.
   - `idir_userid` / `idir_user_display_name` are still filled when `actor.type === 'user'`, for the existing panels.
9. **The workflow engine is its own actor.** The engine always runs (first run, background run, retry, replay) under `withActor(systemActor('workflow-engine'))`. The human who asked for the change is the actor on the linked `requested` row (same `operation_id`).

### Shared package

10. **`packages/audit` (`@sso/audit`)**, alongside `@sso/authz`:
    - _Pure layer_ (no dependencies): the action enum, the `Outcome` type, `Actor`/`SystemActorId`, typed `details` schemas for each action, username normalization (one function used by both the app and the API so the same person always resolves to the same `target_id`), and the AsyncLocalStorage context (`withActor`, `currentActor`, `currentReqId`).
    - _Writer layer_: `createAuditWriter(eventModel)` returns `createEvent(event, transaction?)`, `runAuditedOperation(...)` and the batch variants. The app and the API each pass in their own Sequelize `event` model.
    - The duplicate helpers in `app/queries/event.ts` and `api/src/utils.ts` are replaced, and the API's import of `../../../app/shared/enums` for events goes away. Both Event models are checked against the package's column definition.

### Role assignments (goal 3)

11. **One row per change.** Every grant or revoke (target user or service account, role, environment, add or remove) is a `role-assign` / `role-unassign` operation (`requested` + outcome), on **every** path: app, API single, API bulk and replicate. Batches (more than one change in a call, API bulk add, replicate) also write a parent operation (`role-bulk-update`, `role-replicate`) holding batch-level context; children reference it with `parent_operation_id`. A call with a single change writes no parent, so a single change from the app and one from the API look identical.
12. **One call carrying the changes themselves.** The UI sends `PUT keycloak/user-roles { environment, integrationId, username, add: string[], remove: string[] }`, one request per UI action, including the "clear" button. The server applies exactly those changes, with no reconciliation against current roles. It returns the user's resulting roles plus any per-role failures, so the UI can still show partial failure. Removed: `updateUserRoleMappings` (reconcile), the body-shape check in `pages/api/keycloak/user-roles.ts`, and `applyRoleChanges`/`resolveRoles` from `app/helpers/roles.ts` (`diffRoles` stays in the UI). This applies to both `UserRoles.tsx` and `ServiceAccountRoles.tsx`.
13. **Audit only accepted attempts.** Events start once authorization and validation have passed, including Keycloak existence checks (role exists, user exists, mappings exist). 400/403/404 responses stay in the Loki request logs. In `api/src/services/user-role-mapping-service.ts`, the validation lookups move **out of** the audited operation.

### Outside calls (goal 2)

14. **Inline pattern** for roles, role assignments, replicate, secret rotation and SDX (not the workflow engine). There is no automatic resolver; a hanging-operation alert covers the gap, and a resolver cron can be added later if the alert proves noisy.
15. **Inline operation sequence**, the same on every app and API path:
    ```
    1. validate + authorize (no events)
    2. tx { createEvent({ action, outcome: 'requested', operationId, ... }) }   // strict
    3. outside call (Keycloak / SDX), outside any tx
    4. success: tx { DB mirror write(s); createEvent({ outcome: 'success', operationId }) }
       outside call failed: createEvent({ outcome: 'failure', operationId, details: { error } })        // best-effort + alert
       step-4 tx failed:    createEvent({ outcome: 'failure', operationId,
                                          details: { stage: 'local-sync', keycloakApplied: true } })    // best-effort + alert
    ```
    This fixes the current ordering bugs: app `createClientRole` inserts `requestRole` **before** Keycloak, while API `createRole`, both deletes and composite updates write to the DB **after** success has already been recorded. Provided as `runAuditedOperation(requested, call, { onSuccess: (tx) => mirror(tx) })` in `@sso/audit`.
16. **Workflow-backed operations: the controller enqueues, the engine owns the outcomes.** This applies to `updateRequest`, `deleteRequest`, `restoreRequest`, team `requestServiceAccount` / `deleteServiceAccount` / `restoreTeamServiceAccount`, and org `createOrganizationApiAccount` / `deleteOrganizationApiAccount`:
    ```ts
    const operationId = randomUUID();
    const enqueueResult = await sequelize.transaction(async (transaction) => {
      const saved = await <row create/save>(..., { transaction });
      const enqueueResult = await enqueueIntegrationWorkflow(saved, { ...opts, correlationId: operationId }, transaction);
      await createEvent({ action, outcome: 'requested', operationId, requestId: saved.id,
                          workflowId: enqueueResult.workflowId, ... }, transaction);
      return enqueueResult;
    });
    const workflow = await runIntegrationWorkflow(enqueueResult, opts); // Keycloak, after commit, sync or background
    assertWorkflowCompleted(workflow); // sync callers only
    ```
    - `app/workflow/store.ts`: `createWorkflow` and `supersedeActiveWorkflows` accept an outside transaction.
    - `app/workflow/request-workflow.ts`: `enqueueRequestWorkflow` becomes a pure DB write (type resolution, supersede, create in the given transaction). A new `executeEnqueuedWorkflow` runs `runToCompletion` or fires background execution, and is only called after the commit.
    - `app/controllers/requests.ts`: `processIntegrationRequest` is split into `enqueueIntegrationWorkflow(integration, opts, transaction)` and `runIntegrationWorkflow(enqueueResult, opts)`.
    - Controller catch blocks **never** write events: a failure before the commit leaves nothing behind, and a failure after the commit is the engine's to record. `completeLifecycleEvent` and compensating events are removed.
    - `requestServiceAccount`'s separate writes (create, conditional destroy when the team literal doesn't resolve, save) all move inside the transaction.
    - `restoreRequest` gets its first event.
    - **`operation_id` is the workflow's `correlation_id`.** The controller generates the `operationId` and passes it to `enqueueRequestWorkflow` as `options.correlationId` (already supported, but no controller passes it today). The engine writes outcomes with `workflow.correlationId`. Workflow logs and `alertOps` messages already include the correlation id, so alerts, Loki lines and audit rows share one id. Do **not** use `workflow.id` as the operation id: a queued row is reused by later submissions (see 18), so one `workflow.id` can span several operations.
    - **Adoption race inside the caller's transaction.** When two pods insert the first workflow at the same moment, the losing pod gets a `UniqueConstraintError` and uses the winner's workflow instead. Inside the controller's transaction, that error leaves the transaction unusable in Postgres, so the insert in `createWorkflow` runs in a savepoint (a Sequelize nested transaction). The losing pod still writes its own `requested` row (its own `operation_id`), plus a `superseded` outcome pointing at the winner's correlation id.
17. **One action per operation, for both the requested row and the engine's outcomes.** Actions: `request-create`, `request-update`, `request-delete`, `request-restore`, `api-account-create`, `api-account-delete`, `api-account-restore`. No new workflow columns: a single pure `auditActionFor(workflow)` in the engine works the action out from existing columns: `type` (`INTEGRATION_APPLY | INTEGRATION_DELETE | INTEGRATION_RESTORE`), `action` (`create | update | delete`, from `resolveAction`) and `payload.apiServiceAccount`. The controller uses the same function (on the enqueue result) for its `requested` row, and every engine outcome write uses it, replacing the separate `isRestore`/`type` checks in `failWorkflow` and `steps/integration.ts`. `request-plan` stays a step-level action under the same `operation_id`, and doesn't count as the terminal outcome. `emitWorkflowEventOnce` removes duplicates on `(operation_id, event_code, outcome)`.
18. **`superseded` terminal outcome.** When a workflow is superseded or abandoned, the engine writes `outcome: 'superseded'` for its operation (`correlation_id`) in the same transaction as the state change, with `details: { supersededByWorkflowId, supersededByOperationId }`. Paths:

    - `supersedeActiveWorkflows` (a delete supersedes in-flight workflows).
    - The not-claimable branch of `runNextStep` and the superseded branch of `failWorkflow`.
    - **Overwriting a queued row in `createWorkflow`** (`queued.update(fields)`, "only the newest submission is worth running"). The update replaces `correlation_id`, so the old correlation id is marked `superseded` by the new one before it is overwritten. Otherwise the earlier submission's `requested` row hangs forever.
    - The adoption race (see 16).

    Inline operations only ever end in `success`/`failure`.

19. **A synchronous workflow that fails after the commit** (API accounts, `awaitCompletion: true`): the controller throws 422 including `workflowId`/`operationId`. The row stays `applyFailed`/`planFailed` (already shown as an error in `TeamInfoTabs`; teams are limited to one API account, so failed ones can't pile up), the engine has already written the failure outcome, dead-lettered the workflow and called `alertOps`. Controllers do no cleanup.
    - **Recovery is delete and recreate**, not resubmit: integration access (`authorizeIntegration`, `accessibleIntegrationsWhere`) excludes API-account rows, so resubmit and every other integration route return 404 for them. Deleting a failed account archives the row, which frees the one-account slot (the limit counts unarchived rows only). An `applyFailed` account counts as applied, so its delete runs a delete workflow that sweeps any client the failed create left behind (`api-account-delete` operation). A `planFailed` account never reached Keycloak, so its delete is a DB-only change (one `api-account-delete` `success` row). The new account is a new row with its own `api-account-create` operation.
    - Every apply on an API account is therefore its creation, and `auditActionFor` records it as `api-account-create` even when the engine's `action` is `update`. There is no `api-account-update` action.

### Coverage gaps closed

20. **Secrets.**
    - `secret-rotate` (inline pattern), with one action for both `app/controllers/installation.ts` `changeSecret` (integration secret, **currently not audited at all**) and `team.ts` `updateServiceAccountSecret`. `target_type: 'integration' | 'service-account'`, plus `environment`.
    - `credentials-view` (one `success` row, strict: the secret is not returned if the row can't be written), with one action for both `installation.ts` `getInstallation` and `team.ts` `getServiceAccountCredentials`.
21. **Drop `team-admin-removal`.** It's covered by `team-member-remove` / `team-member-role-update`. Old rows keep the code as a legacy action. The replacement query goes in `docs/events.md` and the alerts doc:
    ```sql
    event_code IN ('team-member-remove', 'team-member-role-update')
      AND (details->>'role' = 'admin' OR details->>'before' = 'admin')
    ```
22. **Other call sites** already covered on the branch (team, org, user, profile, stale-user cleanup, SDX, replicate) are moved to the new writer and the new action/outcome model:
    - SDX create uses the inline pattern; the SDX callback runs as `system: sdx-callback`.
    - Replicate writes a `role-replicate` parent plus `role-assign` children, one per user (replacing `details.assignments[]`). A crash midway leaves exactly the unfinished children visible, and rerunning replicate is safe.
    - Stale-user cleanup runs as `system: stale-user-cleanup`; user deduplication in `findOrCreateUser` runs as `system: user-record-deduplication`.
    - The SDX-removal cleanup bug stays a separate ticket.

### Out of scope

- Retention and personal data policy for `events` (stays retained indefinitely).
- Auditing of rejected attempts (400/403/404), including a dedicated `access-denied` action.
- Automatic resolution of hanging inline operations.
- Grafana alert configuration (lives in a separate repo; this change only documents it).

---

## Schema (edit `db/src/migrations/2026.10.21T16.00.00.add-audit-event-context.ts` in place)

Columns on `events` (all nullable unless noted, no foreign keys):

| Column                | Type                                     | Notes                                                                |
| --------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `outcome`             | `VARCHAR(16) NOT NULL DEFAULT 'success'` | CHECK in (`requested`,`success`,`failure`,`superseded`)              |
| `operation_id`        | `UUID`                                   | indexed                                                              |
| `parent_operation_id` | `UUID`                                   | indexed                                                              |
| `team_id`             | `INTEGER`                                | indexed, **no FK** (drop the FK/`SET NULL` from the current version) |
| `workflow_id`         | `UUID`                                   | indexed, **no FK**                                                   |
| `target_type`         | `VARCHAR(32)`                            |                                                                      |
| `target_id`           | `VARCHAR(255)`                           | composite index `(target_type, target_id)`                           |
| `environment`         | `VARCHAR(16)`                            |                                                                      |
| `actor_type`          | `VARCHAR(32) NOT NULL DEFAULT 'user'`    | CHECK in (`user`,`service-account`,`system`)                         |
| `actor_id`            | `VARCHAR(255)`                           |                                                                      |
| `req_id`              | `VARCHAR(64)`                            | joins to Loki `reqId`                                                |

Also:

- Drop the existing foreign keys on `events.request_id` and `events.organization_id` if present, keeping or adding their indexes.
- Add an index on `(outcome, created_at)` for the hanging-operation and failure queries.

Backfill (mechanical only, `details` untouched):

- `event_code` / `outcome`: strip a trailing `-success` / `-failure` into `outcome`; codes without a suffix keep `outcome = 'success'`. Legacy actions (`request-apply`, `workflow-delete`, `team-admin-removal`, …) keep their action name.
- `actor_id ← idir_userid` where `actor_type = 'user'` (existing); rows with no `idir_userid` get `actor_type = 'system'`.
- `workflow_id ← details->>'workflowId'` (existing), `team_id ← details->>'teamId'`, and `target_type`/`target_id` from `details.username` / `details.userId` where present.

Update `app/shared/sequelize/models/Event.ts`, `api/src/sequelize/models/Events.ts` and `app/interfaces/Event.ts` to match. `request_workflows` needs **no schema change**: `operation_id` = `correlation_id`, and the audit action comes from `auditActionFor(workflow)`.

Backfill addition: for existing workflow events with `workflow_id` set, `operation_id ← request_workflows.correlation_id`.

---

## Delivery: 6 commits on this branch, in order

1. **`@sso/audit` package.** `packages/audit` with the pure layer (actions, `Outcome`, `Actor`, `SystemActorId`, typed `details` schemas for each action, username normalization, AsyncLocalStorage context) and the writer factory (`createEvent`, `runAuditedOperation` with an `onSuccess(tx)` mirror hook, batch parent/child helpers). Unit tests. No call sites change yet.
2. **Migration + actor middleware.** Edit the unreleased migration as above, update both Event models and the interface. Add the `withActor` wrapping to the app API route wrapper (`withApiLogging`/`authenticate`), the Express API auth middleware and cron entry points. Point `app/queries/event.ts` and `api/src/utils.ts` at the shared writer.
3. **Workflow engine + the 8 call sites.** Outside transaction support in `store.ts` (plus a savepoint around the insert for the adoption race); the enqueue/run split; the controller passes `operationId` as `correlationId`; `auditActionFor(workflow)`; engine outcomes under `system: workflow-engine`, keyed by `correlation_id`; the `superseded` outcome (including when a queued row is overwritten); `emitWorkflowEventOnce` removes duplicates on `operation_id`. Then convert `updateRequest`, `deleteRequest`, `restoreRequest`, the team API-account create/delete/restore and the org API-account create/delete to the transactional enqueue shape, and remove their compensating events.
4. **Inline operations, app and API together.**
   - Roles create/update/delete/composite in `app/controllers/roles.ts` and `api/src/services/role-service.ts`, with mirror writes moved into the success transaction.
   - Role assignments in `app/controllers/user.ts` and `api/src/services/user-role-mapping-service.ts`: the new `add`/`remove` endpoint, a parent row only for batches, validation moved out of the audited operation.
   - Revert the UI fan-out in `UserRoles.tsx` / `ServiceAccountRoles.tsx` to a single `add`/`remove` call, and trim `app/helpers/roles.ts`.
   - Replicate as a parent plus per-user children.
   - `secret-rotate` and `credentials-view` in `installation.ts` and `team.ts`.
   - SDX create/callback.
5. **Remaining call sites + readers + docs.**
   - Teams, orgs, users, profile, stale-user cleanup and deduplication moved to the new action/outcome writer; drop `team-admin-removal`.
   - `AdminEventPanel.tsx`, `UserEventPanel.tsx` and `EventContent.tsx` show `actor_type`/`actor_id`, `outcome` and the target, falling back to old `details` shapes when the new columns are null.
   - Rewrite `docs/events.md` for the action/outcome model, with a legacy code mapping and the `team-admin-removal` replacement query.
   - Add `docs/audit-alerts.md` (see below).
6. **Tests + coverage enforcement** (written alongside commits 3–5; enforcement switched on last):
   - **Route coverage:** every app API route and API controller handling a write method is run with its happy-path fixture in the jest-api harness, and must write at least one accepted-outcome event with the expected action. Deliberately unaudited routes (e.g. draft autosave, survey) go in an explicit allowlist, each with a reason. A new write route without an event or an allowlist entry fails CI.
   - **App-vs-API matching:** for every operation exposed by both (role create/delete/composite, role assign/unassign, API accounts), run both paths and assert the event rows match, apart from the actor, ids and timestamps.
   - **Invariants** (jest `afterAll` over the test DB): every `requested` has exactly one terminal outcome; every row has an actor; workflow-backed actions have `workflow_id`; every `parent_operation_id` exists; no event row has `updated_at` later than `created_at`, i.e. rows are append-only.
   - Update the existing jest/jest-api tests (`02`, `03`, `11`, `13`, `17`, `21`, `35`, `event.test.ts`, `roleChanges.test.ts`, `roleReplicationEvents.test.ts`, the `assignUsersToRoles`/`assignServiceAccountsToRoles` UI tests) to the new shapes.

---

## Required alerts (documented in `docs/audit-alerts.md`; configured in the separate Grafana repo)

| Alert                      | Source | Condition                                                                                                            | Severity |
| -------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- | -------- |
| Audit write failed         | Loki   | `count_over_time({service="sso-requests"} \|= "audit_event_write_failed" [5m]) > 0` (also the API service)           | page     |
| Hanging inline operation   | SQL    | `outcome = 'requested'`, older than 15 min, no terminal row with the same `operation_id`, action not workflow-backed | alert    |
| Hanging workflow operation | SQL    | as above, workflow-backed actions, older than 60 min                                                                 | alert    |
| Local sync failed          | SQL    | `outcome = 'failure' AND details->>'stage' = 'local-sync'` (Keycloak and DB disagree)                                | alert    |
| Inline failure rate        | SQL    | `outcome = 'failure'` per inline action over 1h above a threshold                                                    | warn     |

Workflow failures keep the existing `alertOps` call in `orchestrator.ts` `failWorkflow`. The doc also lists the `team-admin-removal` replacement query for any existing panel that uses it.
