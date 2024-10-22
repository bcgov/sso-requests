// import { PostgresStore } from '@acpr/rate-limit-postgresql';
// import rateLimit from 'express-rate-limit';

// const getClientIp = (req) => {
//   const { id } = req.params || {};
//   const { env } = req.query || {};
//   const clientIp = req.headers['X-Forwarded-For'] ?? req.connection.remoteAddress;
//   return `${id}-${env}-${clientIp}`;
// };

// export const logsRateLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   limit: 10,
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   keyGenerator: (req) => getClientIp(req),
//   store: new PostgresStore(
//     {
//       user: process.env.DB_USERNAME || '',
//       password: process.env.DB_PASSWORD || '',
//       host: process.env.DB_HOSTNAME || '',
//       database: process.env.DB_NAME || '',
//       port: 5432,
//       ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
//     },
//     'rate_limit_logs',
//   ),
//   skipFailedRequests: true,
//   message: 'Too many requests, please try again later.',
// });
