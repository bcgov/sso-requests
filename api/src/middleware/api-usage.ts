import models from '@/sequelize/models/models';
import { NextFunction, Request, Response } from 'express';

export const collectApiUsageMetrics = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    // Organization accounts have no owning team, so the client id is what
    // identifies the caller; team accounts still record both. req.authz is
    // the authoritative, DB-resolved source for teamId (correctly null for
    // organization accounts) - it must not be overridden by req.teamId,
    // which comes from the legacy, unvalidated "team" JWT claim.
    if (req.apiClientId || req.teamId) {
      await models.apiUsageMetrics.create({
        method: req.method,
        endpoint: req.originalUrl.replace(new RegExp(`^/api/${process.env.API_VERSION}`), ''),
        teamId: req.authz ? req.authz.teamId : req.teamId ?? null,
        apiClientId: req.apiClientId ?? null,
        responseTimeMs: duration,
        statusCode: res.statusCode,
      });
    }
  });
  next();
};
