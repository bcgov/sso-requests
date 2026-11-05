import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';
import RedisStore from 'rate-limit-redis';
import RedisClient from 'ioredis';
import { positiveInt } from '@app/utils/chat-proxy';

let redisClient: RedisClient | null = null;

if (process.env.REDIS_HOST) {
  redisClient = new RedisClient({
    role: 'master',
    name: 'mymaster',
    sentinels: [{ host: process.env.REDIS_HOST, port: 26379 }],
  });
}

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

export const logsRateLimiter = initMiddleware(
  rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: parseInt(process.env.REDIS_RATE_LIMITER_LIMIT || '20'),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: any) => getClientIp(req),
    message: 'Too many requests, please try again later.',
    store: redisClient
      ? new RedisStore({
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: async (...args: string[]) => redisClient.call(...args),
        })
      : undefined,
  }),
);

export const chatRateLimitWindowMs = () => positiveInt(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);

export const CHAT_RATE_LIMIT_MESSAGE = 'You have reached the message limit for the assistant. Please try again later.';

// Set by the chat route to the signed-in user's id before it runs the limiter.
const CHAT_USER_KEY = Symbol('chatRateLimitUser');

// Every message costs model tokens, so each signed-in user gets a limited number per window.
const chatRateLimitMiddleware = initMiddleware(
  rateLimit({
    windowMs: chatRateLimitWindowMs(),
    // Read per request rather than at import, so tests can change it.
    limit: () => positiveInt(process.env.CHATBOT_RATE_LIMIT, 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req: any) => `user:${req[CHAT_USER_KEY]}`,
    message: { message: CHAT_RATE_LIMIT_MESSAGE },
    // Respond and still call next, so the awaited middleware promise settles; the route then checks headersSent.
    handler: (req: any, res: any, next: () => void, options: any) => {
      res.status(options.statusCode).json(options.message);
      next();
    },
    // Keyed on the user, not the address, so express's IP and proxy checks (req.ip is unset in Next.js) don't apply.
    validate: {
      ip: false,
      trustProxy: false,
      xForwardedForHeader: false,
      forwardedHeader: false,
      keyGeneratorIpFallback: false,
    },
    store: redisClient
      ? new RedisStore({
          prefix: 'rl-chat:',
          // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
          sendCommand: (...args: string[]) => redisClient.call(...args),
        })
      : undefined,
  }),
);

/** Limits CSS Assistant messages per signed-in user (`userId`: the token's sub). Responds 429 when over the limit. */
export const chatRateLimiter = (req: NextApiRequest, res: NextApiResponse, userId: string) => {
  (req as any)[CHAT_USER_KEY] = userId;
  return chatRateLimitMiddleware(req, res);
};
