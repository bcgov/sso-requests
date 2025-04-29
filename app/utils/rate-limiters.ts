import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import RedisClient from 'ioredis';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { node_env, redis_host } = serverRuntimeConfig;

const getClientIp = (req: any) => {
  const id = req.params?.id ?? req.params?.integrationId;
  const env = req.query?.env ?? req.params?.environment;
  const clientIp = req.headers['X-Forwarded-For'] ?? req.connection.remoteAddress;
  return `${id}-${env}-${clientIp}`;
};

export const logsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => getClientIp(req),
  message: 'Too many requests, please try again later.',
  store:
    node_env === 'production'
      ? new RedisStore({
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: async (...args: string[]) => new RedisClient({ host: redis_host }).call(...args),
        })
      : undefined,
});
