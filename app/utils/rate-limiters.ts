import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';
// import { RequestHandler } from 'next/dist/server/next';
import RedisStore from 'rate-limit-redis';
import RedisClient from 'ioredis';

const getClientIp = (req: any) => {
  const id = req.query?.id ?? req.query?.integrationId;
  const env = req.query?.env ?? req.query?.environment;
  const clientIp = req.headers['X-Forwarded-For'] ?? req.connection.remoteAddress;
  return `${id}-${env}-${clientIp}`;
};

function initMiddleware(
  middleware: (req: NextApiRequest, res: NextApiResponse, callback: (err?: any) => void) => void,
) {
  return (req: NextApiRequest, res: NextApiResponse) =>
    new Promise<void>((resolve, reject) => {
      middleware(req as any, res as any, (result: any) => {
        if (result instanceof Error) return reject(result);
        return resolve(result);
      });
    });
}

// export const logsRateLimiter = initMiddleware(
//   rateLimit({
//     windowMs: 60 * 60 * 1000, // 1 hour
//     limit: 10,
//     standardHeaders: 'draft-7',
//     legacyHeaders: false,
//     keyGenerator: (req) => getClientIp(req),
//     message: 'Too many requests, please try again later.',
//   }),
// );
export const logsRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: any) => getClientIp(req),
  message: 'Too many requests, please try again later.',
  store:
    process.env.NODE_ENV === 'production'
      ? new RedisStore({
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: async (...args: string[]) => new RedisClient({ host: process.env.REDIS_HOST }).call(...args),
        })
      : undefined,
});
