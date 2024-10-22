import { PostgresStore } from '@acpr/rate-limit-postgresql';
import rateLimit from 'express-rate-limit';

const getClientIp = (req) => {
  const { id } = req.params || {};
  const { env } = req.query || {};
  const xForwardedFor = req.headers['x-forwarded-for'];
  const clientIp = xForwardedFor ? xForwardedFor.split(',')[0] : req.connection.remoteAddress;
  return `${id}-${env}-${clientIp}`;
};

export const logsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 1,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  store: new PostgresStore(
    {
      connectionString: process.env.DATABASE_URL,
    },
    'rate_limit_logs',
  ),
  skipFailedRequests: true,
  message: 'Too many requests, please try again later.',
});
