import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logger, runWithLogContext } from '@/logger';

const httpLog = logger.child({ module: 'http' });

// Polled by the platform liveness probe; logging every hit would drown out real traffic.
const QUIET_PATHS = [/\/heartbeat$/];

const requestIdFrom = (req: Request) => {
  const header = req.headers['x-request-id'];
  const value = Array.isArray(header) ? header[0] : header;
  // Accept an upstream id (e.g. from the router) only if it looks like one, so callers can't inject log content.
  return value && /^[\w.-]{1,128}$/.test(value) ? value : randomUUID();
};

/**
 * Gives every log line emitted while handling a request a `reqId`, echoes the id back in the `x-request-id` response
 * header, and writes one access-log line per request with status and duration. Register before any route.
 */
export const requestLogging = (req: Request, res: Response, next: NextFunction) => {
  const reqId = requestIdFrom(req);
  const path = req.originalUrl.split('?')[0];
  const start = process.hrtime.bigint();
  res.setHeader('x-request-id', reqId);

  runWithLogContext({ reqId }, () => {
    res.once('finish', () => {
      const status = res.statusCode;
      const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
      if (level === 'info' && QUIET_PATHS.some((p) => p.test(path))) return;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      httpLog[level]({ method: req.method, path, status, durationMs: Math.round(durationMs) }, 'request completed');
    });
    next();
  });
};

/** Logs errors that reach Express unhandled, then defers to its default handler for the response. */
export const errorLogging = (err: any, req: Request, res: Response, next: NextFunction) => {
  httpLog.error({ err, method: req.method, path: req.originalUrl.split('?')[0] }, 'unhandled error');
  next(err);
};
