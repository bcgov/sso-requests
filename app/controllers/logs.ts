import { getAllowedRequest } from '@app/queries/request';
import { Session } from '@app/shared/interfaces';
import { clientEventsAggregationQuery, queryGrafana } from '@app/utils/grafana';
import { createEvent } from './requests';
import { EVENTS } from '@app/shared/enums';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

// Loki limit lower in sandbox.
const LOG_SIZE_LIMIT = app_env === 'production' ? 25000 : 5000;
const MAX_DAYS = 3;

const allowedEnvs = ['dev', 'test', 'prod'];

export const fetchLogs = async (
  env: string,
  clientId: string,
  requestId: string,
  start: string,
  end: string,
  userId?: string,
) => {
  const hasRequiredParams = start && end && env;

  if (!hasRequiredParams) {
    return { status: 400, message: 'Not all parameters sent. Please include start, end and env.' };
  }
  if (!allowedEnvs.includes(env)) {
    return { status: 400, message: `The env parameter must be one of ${allowedEnvs.join(', ')}.` };
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

  if (unixEndTime - unixStartTime > MAX_DAYS * 60 * 60 * 24 * 1000) {
    return { status: 400, message: `Date range must be less ${MAX_DAYS} days.` };
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
    const allLogs = await queryGrafana(query, unixStartTime, unixEndTime, LOG_SIZE_LIMIT);
    let message = 'All logs retrieved';
    if (allLogs.length === LOG_SIZE_LIMIT)
      message = 'Log limit reached. There may be more logs available, try a more restricted date range.';
    const parsedLogs = allLogs.map((log: any) => JSON.parse(log));
    await createEvent({
      eventCode: EVENTS.LOGS_DOWNLOADED_SUCCESS,
      ...eventMeta,
    });
    return { status: 200, message, data: parsedLogs };
  } catch (err) {
    console.info(`Error while fetching logs from loki: ${err}`);
    await createEvent({
      eventCode: EVENTS.LOGS_DOWNLOADED_FAILURE,
      ...eventMeta,
    });
    return { status: 500, message: 'Unexpected error fetching logs.' };
  }
};

export const fetchMetrics = async (
  session: Session,
  id: number,
  environment: string,
  fromDate: string,
  toDate: string,
) => {
  try {
    let result = [];
    // Check user owns requested logs
    const userRequest = await getAllowedRequest(session, id);
    if (!userRequest) return { status: 401, message: "You are not authorized to view this integration's metrics" };

    const { clientId } = userRequest;

    if (!allowedEnvs.includes(environment)) {
      return { status: 400, message: `The env query param must be one of ${allowedEnvs.join(', ')}.` };
    }

    const startDate = Date.parse(fromDate);
    const endDate = Date.parse(toDate);

    if (isNaN(startDate) || isNaN(endDate)) {
      return { status: 400, message: 'Include parsable dates for the start and end dates, e.g YYYY-MM-DD.' };
    }

    if (startDate > endDate) {
      return { status: 400, message: 'Start date cannot be greater than end date.' };
    } else if (endDate > new Date().getTime()) {
      return { status: 400, message: 'End date cannot be a future date.' };
    }

    result = await clientEventsAggregationQuery(clientId, environment, fromDate, toDate);

    return { status: 200, message: null, data: result };
  } catch (err) {
    console.error(err);
    return { status: 500, message: 'Unable to fetch metrics at this moment!', data: null };
  }
};
