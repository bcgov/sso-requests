# Logging

The app (`app/`) and the API (`api/`) both log through [pino](https://getpino.io). Every line is a single JSON
object on stdout, which the platform log pipeline collects as-is. Secrets are censored before a line is written.

The decision and the alternatives considered are recorded in
[ADR 0002](adr/0002-structured-logging-with-pino.md).

| Package | Logger                                        | Request wrapper                                                                                                        |
| ------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| app     | [app/utils/logger.ts](../app/utils/logger.ts) | `withApiLogging` in [app/utils/api.ts](../app/utils/api.ts)                                                            |
| api     | [api/src/logger.ts](../api/src/logger.ts)     | `requestLogging` / `errorLogging` in [api/src/middleware/request-logging.ts](../api/src/middleware/request-logging.ts) |

## Usage

```ts
import { logger } from '@app/utils/logger'; // api: '@/logger'

const log = logger.child({ module: 'keycloak' });

log.info({ clientId }, 'client created');
log.error({ err }, 'failed to create client'); // always pass errors under `err`
```

- Create one child logger per module with a `module` binding. Every line it writes carries that field.
- Put data in the first argument (the merge object) and keep the message a fixed string. Fixed messages are easy to
  search for; values interpolated into the message are neither searchable nor censored.
- Pass errors under `err` (or `error`). Only those keys go through the error serializer described in
  [Error serialization](#error-serialization).
- **The app logger is server-only.** It imports `node:async_hooks`, so never import it from a page, a component or
  anything under `services/`, all of which run in the browser.

### Configuration

| Variable     | Values                                                                   | Default                                                          |
| ------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `LOG_LEVEL`  | `trace` \| `debug` \| `info` \| `warn` \| `error` \| `fatal` \| `silent` | `debug` in development, `silent` in test, `info` everywhere else |
| `LOG_FORMAT` | `json` \| `pretty`                                                       | `json`                                                           |

`LOG_FORMAT=pretty` gives colourised, human-readable output for local debugging. It needs `pino-pretty`, which is a
devDependency. If it isn't installed (for example on a production image), the logger falls back to JSON.

### What a line looks like

```json
{
  "level": "info",
  "time": "2026-10-02T22:05:51.123Z",
  "service": "sso-requests",
  "env": "dev",
  "pid": 42,
  "hostname": "sso-requests-app-7d9f",
  "reqId": "6f1c…",
  "userId": "abc123",
  "module": "keycloak",
  "clientId": "my-client",
  "msg": "client created"
}
```

| Field                          | Source                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `level`                        | The level name (`"info"`), not pino's number (`30`), so queries can use names |
| `time`                         | ISO timestamp                                                                 |
| `service`                      | `sso-requests` (app) or `sso-requests-api` (api)                              |
| `env`                          | `NEXT_PUBLIC_APP_ENV` (app) or `API_ENV` (api)                                |
| `pid`, `hostname`              | The process                                                                   |
| `reqId`, `userId`, …           | The current request's log context (see below)                                 |
| `module`, other child bindings | `logger.child(...)`                                                           |
| everything else                | The merge object passed to the log call                                       |

## Request context

Each request gets a log context held in an `AsyncLocalStorage`. Every line written while the request is being handled
carries those fields, including lines written after an `await`, without passing anything along.

| Step                   | app                                                        | api                                                             |
| ---------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Start context, `reqId` | `withApiLogging(handler)` wraps each API route             | `requestLogging` middleware, registered before every route      |
| Add caller identity    | `addLogContext({ userId })` in `app/utils/authenticate.ts` | `addLogContext({ apiClientId, teamId })` in `api/src/routes.ts` |
| Log unhandled errors   | `handleError` logs `request failed`                        | `errorLogging` logs `unhandled error`                           |

The request wrappers also:

- Reuse an upstream `x-request-id` only if it matches `^[\w.-]{1,128}$`, so callers can't inject log content.
  Otherwise they generate a UUID.
- Echo the id back in the `x-request-id` response header. Ask users or callers for it when tracing a problem.
- Write one `request completed` line per request with `method`, `path` (query string stripped), `status` and
  `durationMs`. The level follows the status: 5xx is `error`, 4xx is `warn`, anything else is `info`.
- Skip successful `/heartbeat` requests, so liveness probes don't drown out real traffic.

The context helpers are exported from both loggers:

| Function                     | Behaviour                                                                   |
| ---------------------------- | --------------------------------------------------------------------------- |
| `runWithLogContext(ctx, fn)` | Runs `fn` with `ctx` merged on top of the current context                   |
| `addLogContext(fields)`      | Adds fields to the current context in place. Does nothing outside a request |
| `getLogContext()`            | Returns the current context, or `{}`                                        |

The request workflow (`app/workflow/logger.ts`) builds on the same root logger and adds a `correlationId` binding to
every workflow and step log line.

## Censoring

Every key name is checked against one pattern:

```ts
const SENSITIVE_KEY = /secret|password|token|authorization|cookie|api[-_]?key|private[-_]?key|credential/i;
```

If a key name contains any of these substrings (case-insensitive), its whole value is replaced with `"[REDACTED]"`,
at any depth. Only key names are checked; values are never inspected.

### Where it runs

```
log.error({ err, user: { name, password } }, 'msg')
  │  level check (a disabled level stops here, so censoring costs nothing)
  ├─ mixin: request context { reqId, userId } merged in
  ├─ formatters.log (censorLogObject)
  │     user.password → "[REDACTED]"; an Error under err/error is left for its serializer
  ├─ serializers.err (serializeError)
  │     standard error serializer → type-specific trimming → censor()
  └─ JSON line + base fields + child bindings (censored when the child was created) → stdout
```

1. **`formatters.log`** (`censorLogObject`) censors the merge object on every line, including the fields merged in from
   the request context. Pino calls it before the serializers, so it leaves an `Error` under `err`/`error` for the error
   serializer.
2. **`serializers.err` / `serializers.error`** (`serializeError`) trim known-dangerous error types, then censor what
   remains.
3. **Child bindings.** Pino serializes `logger.child(bindings)` once, at creation time, and never runs `formatters.log`
   on them. `censorChildBindings` replaces the root logger's `child` method with one that censors the bindings first.
   Children are created with `Object.create(parent)`, so grandchildren inherit the patched method.

### The `censor` walker

`censor(value)` returns a censored copy and never mutates the caller's object. In order, it:

1. Returns primitives and `null` unchanged.
2. Sends any `Error` it finds, at any depth, to `serializeError`.
3. Calls `toJSON()` on objects that have it and censors the result. Sequelize model instances become plain rows, so a
   `client_secret` column is redacted; Dates become strings.
4. Replaces a true cycle with `"[Circular]"`. The same object referenced twice is written out twice.
5. Replaces anything nested deeper than 10 levels with `"[Truncated]"`.
6. Maps arrays item by item. For objects, a value under a sensitive key becomes `"[REDACTED]"` and every other value is
   censored recursively.

### Error serialization

Pino's standard error serializer copies every enumerable property of an error. For two error types that includes
secrets, so `serializeErrorFields` trims them before `censor` runs.

**Axios errors** (`err.isAxiosError`)

- `config` (it holds the `Authorization` header and the request body), the raw socket `request` and the full
  `response` are dropped.
- They are replaced with `http: { method, url, status, data }`.
- `url` is `baseURL + url` with the query string removed, because query strings can carry tokens.
- `data` (the response body) is kept and censored by key, so an `access_token` in a token endpoint's error body is
  redacted.

**Sequelize errors** (`err.name` starts with `Sequelize`)

- `instance` (the whole row), `parameters` (bound values), `parent`/`original` (the Postgres driver error, whose
  `detail` can echo column values) and `aggregateErrors` are dropped.
- Validation `errors[]` entries are reduced to `{ message, path, type }`, removing `value` and `instance`.

### What censoring does not catch

Censoring is a safety net, not a licence to log sensitive data. It misses:

- **The message string and positional arguments.** `log.info('token %s', token)` and `` log.info(`secret: ${s}`) `` are
  written as-is.
- **Secrets under neutral keys,** such as `{ value: secret }` or `headers: ['Bearer …']`.
- **String bodies.** If an Axios error's `response.data` is a string (form-encoded or HTML), it is logged verbatim.
- **Query strings outside Axios errors.** Strip them before logging a URL, as the request wrappers do.
- **Some Sequelize fields.** `sql` is kept. Bound queries only contain `$1`-style placeholders, but Sequelize inlines
  escaped literals into `WHERE` clauses and `replacements`, so a query that filters on a sensitive value can expose it
  there. `UniqueConstraintError.fields` (`{ column: value }`) is also kept; a column with a sensitive name is redacted,
  other values are not.

Censoring also errs towards hiding too much: because the pattern matches substrings, harmless keys such as
`tokenEndpoint`, `idTokenLifespan`, `authorizationUrl` and `credentialType` are redacted too. If you need one of these
values in the logs, log it under a different key.

## Maintenance

`app/utils/logger.ts` and `api/src/logger.ts` share the censoring code line for line. Apply any change to both files.
They differ only in:

|                | app                                                              | api                              |
| -------------- | ---------------------------------------------------------------- | -------------------------------- |
| Import path    | `@app/utils/logger`                                              | `@/logger`                       |
| `service`      | `sso-requests`                                                   | `sso-requests-api`               |
| `env` source   | `NEXT_PUBLIC_APP_ENV`                                            | `API_ENV`                        |
| Single logger  | Stored on `globalThis` under `Symbol.for('sso-requests.logger')` | Module-level constant            |
| Context fields | `reqId`, `userId`                                                | `reqId`, `apiClientId`, `teamId` |

The app keeps its logger and context store on `globalThis` because Next can load the module more than once (hot reload
in development, a separate bundle per API route). Without that, a `reqId` set in one copy of the module would be
invisible to code running in another. The api runs as a single Express process and doesn't need this.

`LOG_FORMAT=pretty` uses `pino-pretty` as a synchronous stream rather than a pino `transport`. Transports run in a
worker thread that resolves its target at runtime, which does not survive Next's bundling.
