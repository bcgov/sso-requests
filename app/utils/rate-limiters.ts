import rateLimit from 'express-rate-limit';
import { NextApiRequest, NextApiResponse } from 'next';
import { RequestHandler } from 'next/dist/server/next';

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
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req),
    message: 'Too many requests, please try again later.',
  }),
);
