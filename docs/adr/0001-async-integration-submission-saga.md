# ADR 0001: Asynchronous integration submission via a Postgres-backed saga

- **Status:** Accepted
- **Date:** 2026-09-15
- **Supersedes:** the synchronous `standardClients` / `request_queues` pipeline

## Context

When a user submitted an integration, `updateRequest` called `processIntegrationRequest` →
`standardClients` **inside the HTTP request/response cycle**. That function inserted a
`request_queues` row, then awaited `keycloakClient(env, ...)` for every environment, then updated
the request status and sent email — all before the browser got a response.

Problems with that design:

1. **The user waited.** A submission touching three environments performs dozens of Keycloak admin
   calls (client create/update, IdP, client scopes, protocol mappers, roles, plus BCSC and Entra
   provisioning). Slow or degraded Keycloak meant a spinning browser tab and, eventually, a gateway
   timeout even though the work was still running server-side.
2. **Failure state was coarse.** All environments were applied with `Promise.all`; a single failure
   collapsed to `status = 'applyFailed'` with no record of _which_ environment or _which_ operation
   failed.
3. **Recovery was blunt.** `retryFailedRequests` (cron, every 5 min) re-ran **every** environment
   for a queued item, re-doing work that had already succeeded, with a flat retry counter and no
   backoff.
4. **No isolation between pods.** Nothing prevented two pods (or the cron and a live request) from
   processing the same queue item concurrently.
5. **No user-visible progress.** The dashboard showed an indefinite spinner until the row flipped to
   `applied`.

## Decision

Submission is handed to a **saga orchestrator** whose state lives in Postgres. The HTTP handler
persists the workflow and returns immediately; execution happens in the background and the user
watches it on the dashboard.

We deliberately chose a **forward-only saga**: there are no compensating actions. When a step fails
it is retried _from that step_; work that already succeeded is left in place.

### Flow

```mermaid
flowchart LR
  A["PUT /api/requests?submit=true"] --> B["persist saga + step plan<br/>(single transaction)"]
  B --> C["HTTP 200 returns immediately"]
  B -. "fire & forget" .-> D{{orchestrator}}
  E["cron tick<br/>GET /api/processRequestQueue"] -. "recovery" .-> D
  D --> F[PLAN]
  F --> G[APPLY_DEV]
  G --> H[APPLY_TEST]
  H --> I[APPLY_PROD]
  I --> J["RESTORE_ROLES<br/>(restore sagas only)"]
  J --> K[FINALIZE]
  K --> L[NOTIFY]
  L --> M([COMPLETED])
  I -- "transient failure" --> N["backoff + jitter<br/>release claim"]
  N -. "retry from this step" .-> I
  I -- "retries exhausted /<br/>permanent error" --> O([FAILED])
  O --> P["dead letter row<br/>+ Rocket.Chat alert"]
```

### Saga lifecycle

```mermaid
stateDiagram-v2
  [*] --> PENDING: enqueueIntegrationSaga()
  PENDING --> RUNNING: claimed by a worker
  RUNNING --> RUNNING: step completed
  RUNNING --> COMPLETED: all steps completed
  RUNNING --> FAILED: retries exhausted or permanent error
  PENDING --> SUPERSEDED: a delete saga takes over
  RUNNING --> SUPERSEDED: a delete saga takes over
  COMPLETED --> [*]
  FAILED --> [*]
  SUPERSEDED --> [*]
```

### Claiming and recovery across pods

```mermaid
sequenceDiagram
  participant P1 as Pod A (accepted the submit)
  participant DB as Postgres
  participant P2 as Pod B (cron tick)

  P1->>DB: INSERT saga (PENDING) + steps
  P1-->>P1: HTTP 200 to the user
  P1->>DB: claim (FOR UPDATE SKIP LOCKED) + set lease
  P1->>DB: step PLAN -> COMPLETED
  P1->>DB: step APPLY_DEV -> COMPLETED
  Note over P1: pod crashes mid APPLY_TEST
  P2->>DB: claim where lease expired
  DB-->>P2: saga (APPLY_DEV already COMPLETED)
  P2->>DB: step APPLY_TEST -> COMPLETED
  P2->>DB: saga -> COMPLETED
```

## Design rules

### 1. Idempotency and de-duplication

- Each saga carries a `sagaId` (UUID primary key) and a `correlationId`.
- **Step rows are the idempotency ledger.** `integration_saga_steps` has a unique
  `(saga_id, name)` constraint; a step already in `COMPLETED` is skipped on replay, so re-delivering
  the same command is a safe no-op.
- A **partial unique index** allows only one active saga per integration:
  `CREATE UNIQUE INDEX ... ON integration_sagas (request_id) WHERE state IN ('PENDING','RUNNING',...)`.
  A double-click or a retried HTTP request gets the existing saga back instead of a second workflow.
- Audit events are written through `emitSagaEventOnce`, which stamps `details.sagaId` and checks for
  an existing row first, so a crash between the event insert and the step commit cannot duplicate
  the change history.
- `keycloakClient` was already a converge-to-desired-state operation (find-or-create for the client,
  roles, scopes and mappers), which is what makes re-running a partially applied step safe.

### 2. Explicit state persistence

- Nothing executes until the saga **and its full step plan** are committed in one transaction.
- The step plan is rebuilt deterministically from the persisted `payload` + `context`
  (`buildIntegrationSagaSteps`), so a pod can resume a workflow another pod started.
- Every transition (`PENDING → RUNNING`, step `RUNNING → COMPLETED`, retry scheduling, terminal
  state) is written **before** the corresponding side effect is attempted.

### 3. Forward-only failure handling (no rollback)

Compensating actions were evaluated and rejected. Rolling back an integration update means deleting
or reverting Keycloak clients that may already be serving live logins; the blast radius of a bad
rollback is worse than the partial state it repairs. Instead:

- A failed step is retried from exactly that step. Completed steps are never re-run or undone.
- After `MAX_STEP_ATTEMPTS` (or a `PermanentStepError`) the saga moves to the terminal `FAILED`
  state — it is never parked in an intermediate state — and the request becomes `applyFailed`
  (`planFailed` if the `PLAN` step failed).
- Operators re-drive a failed workflow by resubmitting, which is de-duplicated and resumes from the
  failed step.

### 4. Resiliency and fault tolerance

- **Exponential backoff with full jitter** (`backoffDelayMs`), persisted as the saga's `run_after`.
  Jitter prevents every pod that failed against the same Keycloak outage from retrying in lockstep.
- **`SELECT ... FOR UPDATE SKIP LOCKED`** claims plus a **lease** (`claimed_by` / `claimed_at`)
  guarantee a single owner per saga and make a saga abandoned by a crashed pod claimable again once
  the lease expires. A heartbeat refreshes the lease during long steps so it is not stolen mid-flight.
- Retries shorter than `IN_PROCESS_RETRY_CEILING_MS` are re-armed with an in-process timer; anything
  longer (and anything lost to a restart) is picked up by the cron tick.
- Exhausted or permanently failed sagas are written to `integration_saga_dead_letters` and raise a
  Rocket.Chat ops alert.

### 5. Code quality and observability

- No nested try/catch: the orchestrator is an explicit loop over a persisted step plan
  (`runNextStep` / `execute`), with step bodies declared as data in `steps/integration.ts`.
- Structured JSON logging (`app/saga/logger.ts`) with the `correlationId` propagated across every
  async boundary, plus duration metrics per step and per saga.
- The `correlationId` is surfaced to the user on failure so support can join the UI report to the
  server logs.

## Consequences

### Data model

Three new tables (`db/src/migrations/2026.09.15T10.00.00.create-integration-saga-tables.ts`):

| Table                           | Purpose                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| `integration_sagas`             | One row per workflow: state, payload snapshot, context, claim/lease, `run_after`, `correlation_id` |
| `integration_saga_steps`        | The persisted plan and the idempotency ledger; unique on `(saga_id, name)`                         |
| `integration_saga_dead_letters` | Unrecoverable workflows awaiting manual intervention                                               |

Other migrations:

- `2026.09.15T10.05.00.add-saga-request-statuses` — adds `processing` to the `requests.status` enum.
  It also adds a `compensating` label; rollback was removed after this migration shipped, so that
  label (and the `compensation_attempts` column) is inert and no code writes it.
- `2026.09.15T10.10.00.drop-request-queues-table` — drops `request_queues`. The `RequestQueue`
  sequelize models were deleted from both `app/` and `api/`.

### Request status transitions

`submitted → planned → processing → applied`, or `→ planFailed` / `→ applyFailed` on terminal
failure. `getStatusDisplayName` maps the new `processing` value to the existing "Submitted" display
name, so nothing downstream had to change; `hasAnyPendingStatus` includes it so the dashboard keeps
polling.

### Code layout

| Path                            | Responsibility                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| `app/saga/types.ts`             | `SagaState`, `StepState`, `SagaContext`, `PermanentStepError` / `TransientStepError` |
| `app/saga/backoff.ts`           | Retry limits, lease window, exponential backoff with jitter                          |
| `app/saga/logger.ts`            | Structured logging with correlation-id propagation                                   |
| `app/saga/store.ts`             | Persistence, `SKIP LOCKED` claiming, leases, dead letters                            |
| `app/saga/steps/integration.ts` | The step definitions (`PLAN`, `APPLY_<ENV>`, `RESTORE_ROLES`, `FINALIZE`, `NOTIFY`)  |
| `app/saga/orchestrator.ts`      | The state machine: `runSaga(id)`, `drainSagas()`                                     |
| `app/saga/integration-saga.ts`  | `enqueueIntegrationSaga()`, `getIntegrationProgress()`                               |
| `app/saga/effects.ts`           | Side effects moved out of the controller: notifications, role restoration            |

`updatePlannedIntegration` moved from `app/controllers/requests.ts` to `app/saga/effects.ts`, and
`createEvent` moved to `app/queries/event.ts`. Controllers import `createEvent` from
`app/queries/event` **directly** — re-exporting it from `controllers/requests.ts` breaks the test
suites that spread `jest.requireActual('@app/controllers/requests')`, because the re-export getter
is evaluated while the module graph is mid-cycle.

### Flows that changed

| Flow                                                  | Behaviour                                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Submit / update integration                           | Asynchronous                                                                                                                  |
| Delete integration                                    | Asynchronous; supersedes any in-flight saga for that integration                                                              |
| Restore integration                                   | Asynchronous; role re-creation and the restore email became saga steps so they only run once the Keycloak clients exist again |
| Resubmit                                              | Now means "retry the workflow"; accepts in-flight and failed statuses and re-drives the existing saga                         |
| Team API service accounts (`app/controllers/team.ts`) | Still synchronous via `{ awaitCompletion: true }`, because the caller reads the client credentials immediately afterwards     |

### User interface

- New endpoint `GET /api/requests/[id]/progress`, authorized with the same rules as the integration
  itself, returning the saga projection (`app/interfaces/SagaProgress.ts`).
- `app/components/SubmittedStatusIndicator.tsx` renders the live step list — progress bar, per-step
  spinner/check/cross, and on failure the failed step plus contact-the-SSO-team guidance quoting the
  correlation id. There is no retry button by design.
- `IntegrationInfoTabs` polls every 3 seconds. **While the saga is active the progress tab is the
  only tab** (nothing is configured yet, so Technical Details would be misleading). Once the saga
  completes the tab disappears; if it failed, the tab stays alongside the other tabs.

### Operations

- `GET /api/processRequestQueue` now calls `drainSagas()` — the recovery tick that re-claims sagas
  waiting on backoff, never started, or abandoned by a crashed pod. The cron schedule moved from
  every 5 minutes to every minute.
- Tuning knobs (all optional):

  | Variable                           | Default      | Meaning                                               |
  | ---------------------------------- | ------------ | ----------------------------------------------------- |
  | `SAGA_MAX_STEP_ATTEMPTS`           | `5`          | Attempts per step before dead-lettering               |
  | `SAGA_CLAIM_LEASE_SECONDS`         | `300`        | Lease window before a claim is considered abandoned   |
  | `SAGA_RETRY_BASE_DELAY_MS`         | `2000`       | Backoff base                                          |
  | `SAGA_RETRY_MAX_DELAY_MS`          | `120000`     | Backoff ceiling                                       |
  | `SAGA_IN_PROCESS_RETRY_CEILING_MS` | `60000`      | Above this, retries wait for the cron tick            |
  | `SAGA_EXECUTION_MODE`              | `background` | `background` \| `synchronous` \| `manual` (see below) |

### Testing

`SAGA_EXECUTION_MODE` makes execution explicit rather than inferred from `NODE_ENV` (which the API
suite sets to `development`):

- `background` — production. Kick off in-process, cron recovers.
- `synchronous` — run to completion before returning. Set in `app/jest-api/jest.setup.js` so the
  pre-existing API specs still observe the final outcome within the request call.
- `manual` — persist only; the caller drives execution. Used by
  `app/jest-api/17.integration-saga.test.ts`, which covers the happy path, de-duplication,
  idempotent replay, resumption from a failed step, backoff retries, and dead-lettering.

`app/jest/submissionProgressTab.test.tsx` covers the tab behaviour.

## Alternatives considered

| Option                                                        | Why not                                                                                                                                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep `request_queues`, just move execution to the cron        | Progress would be delayed by the tick interval, retries would still re-run every environment, and there would still be no per-step visibility.                                                                  |
| Compensating transactions (classic saga rollback)             | Deleting or reverting Keycloak clients that may be serving live logins is more dangerous than the partial state it repairs. Rejected in favour of forward-only retry.                                           |
| A dedicated worker service or external queue (Redis/RabbitMQ) | New infrastructure and deployment surface for a workload that Postgres row-level locking handles comfortably at this volume.                                                                                    |
| Decomposing `keycloakClient` into per-resource steps          | Much richer progress, but a significant rewrite of `app/keycloak/integration.ts` with real regression risk. Per-environment granularity was enough for the UI. Revisit if per-resource recovery is ever needed. |
