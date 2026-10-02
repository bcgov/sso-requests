import { randomUUID } from 'node:crypto';
import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { isString } from 'lodash';
import { logger, runWithLogContext } from '@app/utils/logger';
import { tryJSON } from '@app/utils/helpers';

const httpLog = logger.child({ module: 'http' });

// Polled by the platform liveness probe; logging every hit would drown out real traffic.
const QUIET_PATHS = [/\/api\/heartbeat(\?|$)/];

const requestIdFrom = (req: NextApiRequest) => {
  const header = req.headers['x-request-id'];
  const value = Array.isArray(header) ? header[0] : header;
  // Accept an upstream id (e.g. from the router) only if it looks like one, so callers can't inject log content.
  return value && /^[\w.-]{1,128}$/.test(value) ? value : randomUUID();
};

/**
 * Wraps a Pages Router API handler so that every log line it emits carries a `reqId`, the id is echoed back in the
 * `x-request-id` response header, and one access-log line is written per request with status and duration.
 */
export const withApiLogging =
  (handler: NextApiHandler): NextApiHandler =>
  (req, res) => {
    const reqId = requestIdFrom(req);
    const path = req.url?.split('?')[0];
    const start = process.hrtime.bigint();
    res.setHeader('x-request-id', reqId);

    return runWithLogContext({ reqId }, () => {
      res.once('finish', () => {
        const status = res.statusCode;
        const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
        if (level === 'info' && QUIET_PATHS.some((p) => p.test(req.url || ''))) return;
        const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
        httpLog[level]({ method: req.method, path, status, durationMs: Math.round(durationMs) }, 'request completed');
      });
      return handler(req, res);
    });
  };

export const handleError = (res: NextApiResponse, err: any) => {
  let message = err?.message || err;
  if (isString(message)) {
    message = tryJSON(message);
  }
  const status = err?.status || 422;
  const log = status >= 500 ? httpLog.error.bind(httpLog) : httpLog.warn.bind(httpLog);
  log({ err, status }, 'request failed');
  return res.status(status).json({ success: false, message });
};
