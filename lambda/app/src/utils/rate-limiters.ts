import { PostgresStore } from '@acpr/rate-limit-postgresql';
import rateLimit from 'express-rate-limit';

const getClientIp = (req) => {
  const { id } = req.params || {};
  const { env } = req.query || {};
  const clientIp = req.headers['X-Forwarded-For'] ?? req.connection.remoteAddress;
  return `${id}-${env}-${clientIp}`;
};

export const logsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
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
