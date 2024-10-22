import { PostgresStore } from '@acpr/rate-limit-postgresql';
import rateLimit from 'express-rate-limit';

const getClientIp = (req) => {
  const { id } = req.params || {};
  const { env } = req.query || {};
  const clientIp = req.headers['X-Forwarded-For'] ?? req.connection.remoteAddress;
  return `${id}-${env}-${clientIp}`;
};
