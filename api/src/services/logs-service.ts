import { queryGrafana } from '@/modules/grafana';
import { audit } from '@/utils';
import type { Environment } from '@sso/audit';
import { ParsedQs } from 'qs';
import { injectable } from 'tsyringe';
import { logger } from '@/logger';
import { buildLogsQuery, getLogSourceRanges, LogSchemas } from '@sso/logs-query';

const log = logger.child({ module: 'services/logs' });

const getLogSchemas = (): LogSchemas => {
  const retention = process.env.TRINO_RETENTION_SCHEMA;
  const live = process.env.TRINO_LIVE_SCHEMA;
  if (!retention || !live) throw new Error('TRINO_RETENTION_SCHEMA and TRINO_LIVE_SCHEMA must be set');
  return { retention, live };
};

@injectable()
export class LogsService {
  // Log limit lower in sandbox.
  private LOG_SIZE_LIMIT = process.env.API_ENV === 'production' ? 25000 : 5000;
  private MAX_DAYS = 3;
  private allowedEnvs = ['dev', 'test', 'prod'];

  public async fetchLogs(
    env: string,
    clientId: string,
    requestId: string,
    start: string | ParsedQs | (string | ParsedQs)[],
    end: string | ParsedQs | (string | ParsedQs)[],
  ) {
    const hasRequiredParams = start && end && env;

    if (!hasRequiredParams) {
      return { status: 400, message: 'Not all parameters sent. Please include start and end.', data: null };
    }
    if (!this.allowedEnvs.includes(env)) {
      return { status: 400, message: `The env parameter must be one of ${this.allowedEnvs.join(', ')}.`, data: null };
    }
    if (!clientId) {
      return { status: 400, message: 'This integration does not have a client ID yet.', data: null };
    }

    const unparseableDateResponse = {
      status: 400,
      message: 'Include parsable dates for the start and end parameters, e.g YYYY-MM-DD.',
      data: null,
    };

    if (typeof start !== 'string' || typeof end !== 'string') {
      return unparseableDateResponse;
    }

    const unixStartTime = new Date(start).getTime();
    const unixEndTime = new Date(end).getTime();

    const validTime = (time: number) => !Number.isNaN(time) && time > 0;

    if (!validTime(unixStartTime) || !validTime(unixEndTime)) {
      return unparseableDateResponse;
    }

    if (unixStartTime > unixEndTime) {
      return { status: 400, message: `End date must be later than start date.`, data: null };
    }

    if (unixEndTime - unixStartTime > this.MAX_DAYS * 60 * 60 * 24 * 1000) {
      return { status: 400, message: `Date range must be less ${this.MAX_DAYS} days.`, data: null };
    }

    try {
      const query = buildLogsQuery(
        env,
        getLogSourceRanges(unixStartTime, unixEndTime, Date.now(), getLogSchemas()),
        clientId,
        process.env.API_ENV,
      );

      const allLogs = await audit.runAuditedOperation(
        {
          action: 'logs-download',
          requestId: Number(requestId),
          environment: env as Environment,
          target: { type: 'integration', id: clientId },
          details: { start, end },
        },
        () => queryGrafana(query, unixStartTime, unixEndTime, this.LOG_SIZE_LIMIT),
        { successDetails: (logs: any[]) => ({ count: logs.length }) },
      );
      let message = 'All logs retrieved';
      if (allLogs.length === this.LOG_SIZE_LIMIT)
        message = 'Log limit reached. There may be more logs available, try a more restricted date range.';
      const parsedLogs = allLogs.map((log: any) => JSON.parse(log));
      return { status: 200, message, data: parsedLogs };
    } catch (err) {
      log.error({ err, environment: env, clientId }, 'Error while fetching logs from loki');
      return { status: 500, message: 'Unexpected error fetching logs.', data: null };
    }
  }
}
