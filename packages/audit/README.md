# @sso/audit

The audit event vocabulary, the actor context and the event writer, shared by
`app` and `api` so the same change produces the same `events` row whichever
path it came through.

**No dependencies.** It comes in two entry points:

- `src/index.ts` is pure and browser-safe: actions, outcomes, target types,
  actors, the typed `details` for each action, username normalization and the
  row builder. UI code can import it.
- `src/server.ts` adds the Node-only half: the `AsyncLocalStorage` audit context
  (`withActor`, `currentActor`, `currentReqId`) and `createAuditWriter`, which
  each consumer calls with its own Sequelize `event` model.

## The event model

`event_code` holds an action (`role-assign`, `team-create`, …) and `outcome`
holds `requested | success | failure | superseded`. A change that only touches
the database writes one `success` row. A change that calls an outside system
(Keycloak, SDX) writes `requested` first and a terminal outcome after, as
separate rows sharing an `operation_id`. Rows are never updated or deleted; the
writer has no way to.

Resource ids (`request_id`, `team_id`, `organization_id`, `workflow_id`) and the
target (`target_type`, `target_id`, `environment`) are columns, not `details`
fields. `details` is typed per action for new writes only; rows written before
this package carry older shapes, and readers must treat stored `details` as
unknown. `LEGACY_AUDIT_ACTIONS` names the released codes that are no longer
written.

## Actor

The actor is resolved once, at the edge — after authentication in an API route,
around a cron job or callback — and carried in context. `createEvent` reads it
from there and **fails** when there is none: no silent `system` fallback.
Everything the event is _about_ is passed explicitly at the call site.

In the app, `withApiLogging` opens the context with the request's `reqId` and
`authenticate` sets the user with `setCurrentActor`. In the api, the
`requestLogging` middleware opens it and the auth middleware runs the rest of
the request under the API account with `withActor`. Routes called by cron or by
SDX wrap their work in `withActor(systemActor(...))`.

## Writing

- `createEvent(event, tx?)` is strict: a failed write is logged as
  `audit_event_write_failed` and rethrown, so the change it describes fails too.
  Pass the transaction the change is written in.
- `runAuditedOperation(operation, call, { onSuccess })` is the inline pattern
  for outside calls. `requested` is stored before `call` runs, `onSuccess`'s
  mirror writes commit with the `success` row, and a failed call or mirror write
  gets a best-effort `failure` row (`stage: 'local-sync'` for the latter).
- `runAuditedBatch(parent, items)` writes a parent operation and one child per
  item, linked by `parent_operation_id`. All `requested` rows are stored before
  any call. A single item writes no parent unless `{ parent: 'always' }`.
- `tryCreateEvent` is the best-effort write, only for an outcome that follows an
  outside call that has already happened.

## Usernames

`roleMappingTarget(username, clientId)` is the one place a Keycloak username
becomes a `target_id`: lowercased, with a client id resolved to its
`service-account-<client id>` user, so the app and the API record the same
person the same way.
