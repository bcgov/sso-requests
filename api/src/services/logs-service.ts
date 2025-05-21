import { queryGrafana } from '@/modules/grafana';
import { createEvent } from '@/utils';
import { injectable } from 'tsyringe';

@injectable()
export class LogsService {
  // Loki limit lower in sandbox.
  private LOG_SIZE_LIMIT = process.env.API_ENV === 'production' ? 25000 : 5000;
  private MAX_DAYS = 3;
  private allowedEnvs = ['dev', 'test', 'prod'];

  public async fetchLogs(
    env: string,
    clientId: string,
    requestId: string,
    start: string,
    end: string,
    userId?: string,
  ) {
    const hasRequiredParams = start && end && env;

    if (!hasRequiredParams) {
      return { status: 400, message: 'Not all parameters sent. Please include start, end and env.' };
    }
    if (!this.allowedEnvs.includes(env)) {
      return { status: 400, message: `The env parameter must be one of ${this.allowedEnvs.join(', ')}.` };
    }

    const unixStartTime = new Date(start).getTime();
    const unixEndTime = new Date(end).getTime();

    const validTime = (time: number) => !Number.isNaN(time) && time > 0;

    if (!validTime(unixStartTime) || !validTime(unixEndTime)) {
      return {
        status: 400,
        message: 'Include parsable dates for the start and end parameters, e.g YYYY-MM-DD.',
      };
    }

    if (unixStartTime > unixEndTime) {
      return { status: 400, message: `End date must be later than start date.` };
    }

    if (unixEndTime - unixStartTime > this.MAX_DAYS * 60 * 60 * 24 * 1000) {
      return { status: 400, message: `Date range must be less ${this.MAX_DAYS} days.` };
    }

    const eventMeta = {
      requestId,
      idirUserid: userId,
      details: {
        environment: env,
        clientId,
      },
    };

    try {
      const query = `{environment="${env}"}  |= \`clientId=${clientId}\` |= \`realmId=standard\``;
      const allLogs = await queryGrafana(query, unixStartTime, unixEndTime, this.LOG_SIZE_LIMIT);
      let message = 'All logs retrieved';
      if (allLogs.length === this.LOG_SIZE_LIMIT)
        message = 'Log limit reached. There may be more logs available, try a more restricted date range.';
      const parsedLogs = allLogs.map((log: any) => JSON.parse(log));
      await createEvent({
        eventCode: 'logs-download-success',
        ...eventMeta,
      });
      return { status: 200, message, data: parsedLogs };
    } catch (err) {
      console.info(`Error while fetching logs from loki: ${err}`);
      await createEvent({
        eventCode: 'logs-download-failure',
        ...eventMeta,
      });
      return { status: 500, message: 'Unexpected error fetching logs.' };
    }
  }
}
