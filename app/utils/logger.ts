/**
 * Server-side structured logger (pino).
 *
 * Server code only: it pulls in `node:async_hooks`, so never import it from a page, component or anything under
 * `services/` (those run in the browser). Emits one JSON object per line on stdout, which the platform log
 * pipeline collects as-is, in every environment. Set LOG_FORMAT=pretty for human-readable output while debugging locally.
 *
 * Env:
 *   LOG_LEVEL   trace | debug | info | warn | error | fatal | silent
 *               defaults: debug in development, silent in test, info otherwise
 *   LOG_FORMAT  json | pretty (default: json)
 *
 * Usage:
 *   import { logger } from '@app/utils/logger';
 *   const log = logger.child({ module: 'keycloak' });
 *   log.info({ clientId }, 'client created');
 *   log.error({ err }, 'failed to create client');   // always pass errors under `err`
 *
 * Inside an API route wrapped with `withApiLogging`, every line also carries the request's `reqId` (and `userId`
 * once the caller is authenticated) without having to pass them along.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import os from 'node:os';
import pino, { Logger } from 'pino';

export type { Logger } from 'pino';

export type LogContext = Record<string, unknown>;

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const defaultLevel = isDev ? 'debug' : isTest ? 'silent' : 'info';

// Applied after serializers. fast-redact wildcards match a single level, so nested secrets need their own path.
const REDACT_PATHS = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
  'bearerToken',
  'clientSecret',
  'client_secret',
  'access_token',
  'refresh_token',
  'id_token',
  '*.authorization',
  '*.Authorization',
  '*.cookie',
  '*.password',
  '*.secret',
  '*.token',
  '*.bearerToken',
  '*.clientSecret',
  '*.client_secret',
  '*.access_token',
  '*.refresh_token',
  '*.id_token',
  'req.headers.authorization',
  'req.headers.cookie',
  'err.http.data.access_token',
  'err.http.data.refresh_token',
  'err.http.data.id_token',
];

/**
 * pino's default error serializer copies every enumerable property. On an AxiosError that includes `config` (with the
 * Authorization header), the raw socket `request`, and the full `response`, so keep just the parts worth reading.
 */
const serializeError = (err: any) => {
  if (!err || typeof err !== 'object') return err;
  const serialized: any = pino.stdSerializers.err(err);
  if (err.isAxiosError) {
    const { config, request, response, ...rest } = serialized;
    return {
      ...rest,
      http: {
        method: config?.method?.toUpperCase(),
        url: config?.baseURL && !/^https?:/.test(config?.url) ? `${config.baseURL}${config.url}` : config?.url,
        status: response?.status,
        data: response?.data,
      },
    };
  }
  return serialized;
};

const createRootLogger = (store: AsyncLocalStorage<LogContext>): Logger => {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL || defaultLevel,
    base: {
      service: 'sso-requests',
      env: process.env.NEXT_PUBLIC_APP_ENV,
      pid: process.pid,
      hostname: os.hostname(),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    // Emit `"level":"info"` rather than `"level":30` so log queries don't need to know pino's numeric levels.
    formatters: { level: (label) => ({ level: label }) },
    serializers: { err: serializeError, error: serializeError },
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    // Must return a copy: pino merges each line's fields into the returned object, which would otherwise write them
    // into the request's context and repeat them on every later line.
    mixin: () => ({ ...store.getStore() }),
  };

  if (process.env.LOG_FORMAT === 'pretty') {
    try {
      // A synchronous stream rather than a `transport`: transports run in a worker thread that resolves its target
      // at runtime, which does not survive Next's bundling. pino-pretty is a devDependency, so only load it here.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pinoPretty = require('pino-pretty');
      return pino(options, pinoPretty({ sync: true, colorize: true, ignore: 'pid,hostname,service,env' }));
    } catch {
      // pino-pretty not installed (e.g. LOG_FORMAT=pretty set on a production image): fall back to JSON.
    }
  }
  return pino(options);
};

// Next may load this module more than once (HMR in dev, separate bundles per API route), so keep a single logger and
// context store per process. Otherwise a reqId set in one module copy would be invisible to another.
const GLOBAL_KEY = Symbol.for('sso-requests.logger');
type LoggerGlobal = { logger: Logger; store: AsyncLocalStorage<LogContext> };
const g = globalThis as unknown as Record<symbol, LoggerGlobal | undefined>;

if (!g[GLOBAL_KEY]) {
  const store = new AsyncLocalStorage<LogContext>();
  g[GLOBAL_KEY] = { store, logger: createRootLogger(store) };
}

const { logger: rootLogger, store: contextStore } = g[GLOBAL_KEY]!;

export const logger: Logger = rootLogger;

/** Runs `fn` with `context` merged into every log line emitted inside it, including across awaits. */
export const runWithLogContext = <T>(context: LogContext, fn: () => T): T =>
  contextStore.run({ ...contextStore.getStore(), ...context }, fn);

/** Adds fields (e.g. the authenticated user) to the current request's log context. No-op outside one. */
export const addLogContext = (fields: LogContext) => {
  const current = contextStore.getStore();
  if (current) Object.assign(current, fields);
};

export const getLogContext = (): LogContext => contextStore.getStore() ?? {};
