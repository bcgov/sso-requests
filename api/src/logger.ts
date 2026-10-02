/**
 * Structured logger (pino).
 *
 * Emits one JSON object per line on stdout, which the platform log pipeline collects as-is, in every environment.
 * Set LOG_FORMAT=pretty for human-readable output while debugging locally.
 *
 * Env:
 *   LOG_LEVEL   trace | debug | info | warn | error | fatal | silent
 *               defaults: debug in development, silent in test, info otherwise
 *   LOG_FORMAT  json | pretty (default: json)
 *
 * Usage:
 *   import { logger } from '@/logger';
 *   const log = logger.child({ module: 'keycloak' });
 *   log.info({ clientId }, 'client created');
 *   log.error({ err }, 'failed to create client');   // always pass errors under `err`
 *
 * Inside a request handled after the `requestLogging` middleware, every line also carries the request's `reqId` (and
 * `apiClientId`/`teamId` once the caller is authenticated) without having to pass them along.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import os from 'node:os';
import pino, { Logger } from 'pino';

export type { Logger } from 'pino';

export type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const defaultLevel = isDev ? 'debug' : isTest ? 'silent' : 'info';

// Any key matching this is censored wherever it appears, at any depth. Values that carry a secret under a neutral key
// (positional query parameters, message strings) can't be caught this way, so never log them.
const SENSITIVE_KEY = /secret|password|token|authorization|cookie|api[-_]?key|private[-_]?key|credential/i;
const CENSOR = '[REDACTED]';
const MAX_DEPTH = 10;

/** Returns a copy of `value` with every sensitive key censored; never mutates the caller's objects. */
const censor = (value: any, depth = 0, seen = new WeakSet<object>()): any => {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Error) return serializeError(value);
  if (typeof value.toJSON === 'function') return censor(value.toJSON(), depth, seen);
  if (seen.has(value)) return '[Circular]';
  if (depth >= MAX_DEPTH) return '[Truncated]';

  seen.add(value);
  const out = Array.isArray(value)
    ? value.map((item) => censor(item, depth + 1, seen))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          SENSITIVE_KEY.test(key) ? CENSOR : censor(item, depth + 1, seen),
        ]),
      );
  // Only true cycles are elided; the same object referenced twice is written out both times.
  seen.delete(value);
  return out;
};

/**
 * pino's default error serializer copies every enumerable property, so trim the error types known to carry secrets
 * before censoring what remains:
 * - AxiosError: `config` (with the Authorization header and request body), the raw socket `request`, and the full
 *   `response`. The URL's query string is dropped too, since it can carry tokens.
 * - Sequelize errors: the model `instance` (the whole row), the bound query `parameters`, and the driver error under
 *   `parent`/`original`, all of which hold column values such as bcsc_clients.client_secret. `sql` is kept; it only has
 *   `$1` placeholders.
 */
const serializeErrorFields = (err: any) => {
  const serialized: any = pino.stdSerializers.err(err);
  if (err.isAxiosError) {
    const { config, request, response, ...rest } = serialized;
    const url = config?.baseURL && !/^https?:/.test(config?.url) ? `${config.baseURL}${config.url}` : config?.url;
    return {
      ...rest,
      http: {
        method: config?.method?.toUpperCase(),
        url: typeof url === 'string' ? url.split('?')[0] : url,
        status: response?.status,
        data: response?.data,
      },
    };
  }
  if (typeof err.name === 'string' && err.name.startsWith('Sequelize')) {
    const { instance, parameters, parent, original, aggregateErrors, errors, ...rest } = serialized;
    if (Array.isArray(errors)) rest.errors = errors.map(({ message, path, type }) => ({ message, path, type }));
    return rest;
  }
  return serialized;
};

const serializeError = (err: any) => {
  if (!err || typeof err !== 'object') return err;
  return censor(serializeErrorFields(err));
};

// `formatters.log` runs before the serializers, so leave errors under `err`/`error` for `serializeError`, which censors
// its own output.
const censorLogObject = (obj: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key,
      SENSITIVE_KEY.test(key)
        ? CENSOR
        : (key === 'err' || key === 'error') && value instanceof Error
        ? value
        : censor(value),
    ]),
  );

const contextStore = new AsyncLocalStorage<LogContext>();

/** pino skips formatters for child bindings, so censor them on the way in. Children inherit this from the root. */
const censorChildBindings = (root: Logger): Logger => {
  const pinoChild = root.child;
  // Assigned loosely: pino's `child` is generic over custom levels, which this passes through untouched.
  (root as any).child = function (this: Logger, bindings: pino.Bindings, options?: pino.ChildLoggerOptions) {
    return Reflect.apply(pinoChild, this, [censor(bindings), options]);
  };
  return root;
};

const createRootLogger = (): Logger => {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || defaultLevel,
    base: {
      service: 'sso-requests-api',
      env: process.env.API_ENV,
      pid: process.pid,
      hostname: os.hostname(),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Emit `"level":"info"` rather than `"level":30` so log queries don't need to know pino's numeric levels.
    formatters: { level: (label) => ({ level: label }), log: censorLogObject },
    serializers: { err: serializeError, error: serializeError },
    // Must return a copy: pino merges each line's fields into the returned object, which would otherwise write them
    // into the request's context and repeat them on every later line.
    mixin: () => ({ ...contextStore.getStore() }),
  };

  if (process.env.LOG_FORMAT === 'pretty') {
    try {
      // A synchronous stream rather than a `transport`, matching the app; transports run in a worker thread.
      // pino-pretty is a devDependency, so only load it here.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pinoPretty = require('pino-pretty');
      return censorChildBindings(
        pino(options, pinoPretty({ sync: true, colorize: true, ignore: 'pid,hostname,service,env' })),
      );
    } catch {
      // pino-pretty not installed (e.g. LOG_FORMAT=pretty set on a production image): fall back to JSON.
    }
  }
  return censorChildBindings(pino(options));
};

export const logger: Logger = createRootLogger();

/** Runs `fn` with `context` merged into every log line emitted inside it, including across awaits. */
export const runWithLogContext = <T>(context: LogContext, fn: () => T): T =>
  contextStore.run({ ...contextStore.getStore(), ...context }, fn);

/** Adds fields (e.g. the authenticated client) to the current request's log context. No-op outside one. */
export const addLogContext = (fields: LogContext) => {
  const current = contextStore.getStore();
  if (current) Object.assign(current, fields);
};

export const getLogContext = (): LogContext => contextStore.getStore() ?? {};
