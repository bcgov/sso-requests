# ADR 0002: Structured logging with pino and key-based secret censoring

- **Status:** Accepted
- **Date:** 2026-10-02
- **Supersedes:** `console.*` logging in `app/` and winston / express-winston in `api/`

## Context

Before this change the two services logged differently:

- `app/` used `console.log` / `console.error` with interpolated strings, for example
  `` console.error(`Error fetching privacy zones: ${err}`) ``.
- `api/` used winston with express-winston for access logs.

Problems with that setup:

1. **Unstructured output.** Values were interpolated into message strings, so logs could not be filtered by field
   (`clientId`, `status`, `teamId`) in the log pipeline.
2. **No request correlation.** Nothing tied together the lines written while handling one request, so tracing a
   single failure across Keycloak calls, database queries and the response meant guessing by timestamp.
3. **Secrets in error logs.** Logging an `AxiosError` wrote out its `config`, including the `Authorization` header and
   the request body. Logging a Sequelize error wrote out the model instance and bound parameters, which can include
   columns such as `bcsc_clients.client_secret`.
4. **Two formats.** The services produced differently shaped lines, so every query had to be written twice.

## Decision

Both services log through **pino**, configured identically, writing one JSON object per line to stdout in every
environment. How to use it and how it works in detail is in the [logging guide](../logging.md).

### 1. One structured format

- Every line carries `level` (as a name, not pino's number), an ISO `time`, `service`, `env`, `pid` and `hostname`.
- Modules log through `logger.child({ module })` and pass data as fields: `log.info({ clientId }, 'client created')`.
- Errors are always passed under `err`.
- `LOG_LEVEL` and `LOG_FORMAT` (`json` | `pretty`) are the only configuration.

### 2. Request context through `AsyncLocalStorage`

- A request wrapper (`withApiLogging` in the app, the `requestLogging` middleware in the API) starts a log context with
  a `reqId` and echoes it in the `x-request-id` response header. An upstream id is reused only if it matches
  `^[\w.-]{1,128}$`, so callers can't inject log content.
- Authentication adds the caller's identity to the context (`userId` in the app, `apiClientId` and `teamId` in the API).
- A pino `mixin` merges the context into every line, including lines written after an `await`.
- The wrapper writes one `request completed` line per request with status and duration, logged at `error` for 5xx and
  `warn` for 4xx. Successful `/heartbeat` probes are not logged.

### 3. Censoring by key name, at any depth

Any key whose name matches

```ts
/secret|password|token|authorization|cookie|api[-_]?key|private[-_]?key|credential/i;
```

has its value replaced with `"[REDACTED]"`, at any depth. It is applied in three places:

- `formatters.log`, for the merge object and request context on every line;
- the `err` / `error` serializers, after trimming;
- child bindings, by wrapping the root logger's `child` method, because pino never runs `formatters.log` on them.

The walker copies rather than mutates, follows `toJSON()` (so Sequelize instances are censored as plain rows), replaces
cycles with `"[Circular]"` and stops at depth 10.

### 4. Error-type-aware trimming

Before censoring, the error serializer removes the parts of known error types that carry secrets:

- **AxiosError:** drops `config`, `request` and `response` and keeps `http: { method, url, status, data }`, with the
  query string removed from `url`.
- **Sequelize errors:** drops `instance`, `parameters`, `parent`, `original` and `aggregateErrors`, and reduces
  validation `errors[]` to `{ message, path, type }`.

## Consequences

### Positive

- Logs from both services can be queried with the same fields and joined by `reqId`. Users and API callers can quote
  the `x-request-id` header when reporting a problem.
- Request workflow logs (`app/workflow/logger.ts`, see [ADR 0001](0001-async-integration-submission-saga.md)) use the
  same root logger and add a `correlationId`.
- New sensitive fields are censored automatically as long as their names follow the usual naming, with no list to keep
  up to date.
- Censoring runs only for enabled levels, so `debug` lines cost nothing in production.

### Negative

- **Over-redaction.** Substring matching also hides harmless keys such as `tokenEndpoint`, `idTokenLifespan`,
  `authorizationUrl` and `credentialType`. To see one of these, log it under a different key.
- **Values are never inspected.** Secrets in the message string, in positional arguments, under neutral keys, in string
  response bodies or in URL query strings are not caught. Code review has to keep these out of log calls.
- **Sequelize `sql` is kept.** It is useful for debugging, but Sequelize inlines escaped literals into `WHERE` clauses
  and `replacements`, so a query that filters on a sensitive value can expose it there.
- **Duplicated code.** `app/utils/logger.ts` and `api/src/logger.ts` share the censoring code line for line and must be
  changed together. The app also keeps its logger on `globalThis`, because Next can load the module more than once
  and a second copy would not see the first copy's request context.
- **The app logger is server-only.** It imports `node:async_hooks` and must not be imported from browser code.

## Alternatives considered

| Option                                                              | Why not                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep winston in the API and adopt it in the app                     | Slower than pino, and winston's request context and redaction both need extra packages or custom formats. Pino gives JSON output, child loggers, a `mixin` hook for request context and serializers out of the box.                                       |
| pino's built-in `redact` with a list of paths                       | This was the first implementation. fast-redact wildcards match a single level, so every nesting depth needed its own path (`*.token`, `err.http.data.access_token`, …), and any secret at an unlisted path or under an unlisted key name slipped through. |
| Inspect values as well as keys (pattern-match JWTs, bearer strings) | Costly on every line and prone to false positives and misses. Keeping secrets out of messages and values is enforced in code review instead.                                                                                                              |
| pino `transport` for pretty output                                  | Transports run in a worker thread that resolves its target at runtime, which does not survive Next's bundling. A synchronous `pino-pretty` stream is used instead.                                                                                        |
| A shared logging package used by both services                      | Would remove the duplication, but `app/` and `api/` have no shared package today. Revisit if a shared package is introduced.                                                                                                                              |
