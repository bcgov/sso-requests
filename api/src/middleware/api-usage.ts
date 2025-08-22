import models from '@/sequelize/models/models';
import { NextFunction, Request, Response } from 'express';

export const collectApiUsageMetrics = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    if (req.teamId) {
      await models.apiUsageMetrics.create({
        method: req.method,
        endpoint: req.originalUrl.replace(new RegExp(`^/api/${process.env.API_VERSION}`), ''),
        teamId: req.teamId,
        responseTimeMs: duration,
        statusCode: res.statusCode,
      });
    }
  });
  next();
};
