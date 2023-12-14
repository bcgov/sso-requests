import { getAllowedRequest } from '@lambda-app/queries/request';
import { Session } from '@lambda-shared/interfaces';
import { clientEventsAggregationQuery, queryGrafana } from '@lambda-app/grafana';
import axios from 'axios';

const LOG_SIZE_LIMIT = 2000;

const allowedEnvs = ['dev', 'test', 'prod'];

export const fetchLogs = async (
  session: Session,
  env: string,
  id: number,
  start: string,
  end: string,
  eventType: string,
) => {
  // Check user owns requested logs
  const userRequest = await getAllowedRequest(session, id);
  if (!userRequest) return { status: 401, message: "You are not authorized to view this integration's logs" };

  const { clientId } = userRequest;
  // Validate user supplied inputs
  const hasRequiredQueryParams = start && end && env && eventType;

  const allowedEvents = ['LOGIN', 'CODE_TO_TOKEN', 'REFRESH_TOKEN'];

  if (!hasRequiredQueryParams) {
    return { status: 400, message: 'Not all query params sent. Please include start, end, env, and eventType.' };
  }
  if (!allowedEnvs.includes(env)) {
    return { status: 400, message: `The env query param must be one of ${allowedEnvs.join(', ')}.` };
  }
  if (!allowedEvents.includes(eventType)) {
    return { status: 400, message: "The eventType query param must be one of ${allowedEvents.join(', ')}" };
  }

  const unixStartTime = new Date(start).getTime();
  const unixEndTime = new Date(end).getTime();

  const validTime = (time) => !Number.isNaN(time) && time > 0;

  if (!validTime(unixStartTime) || !validTime(unixEndTime)) {
    return { status: 400, message: 'Include parsable dates for the start and end parameters, e.g YYYY-MM-DD.' };
  }

  try {
    const query = `{environment="${env}", client_id="${clientId}", event_type="${eventType}"}`;
    const allLogs = await queryGrafana(query, unixStartTime, unixEndTime, LOG_SIZE_LIMIT);
    let message = 'All logs retrieved';
    if (allLogs.length === LOG_SIZE_LIMIT)
      message = 'Log limit reached. There may be more logs available, try a more restricted date range.';
    return { status: 200, message, data: allLogs };
  } catch (err) {
    console.info(`Error while fetching logs from loki: ${err}`);
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

    result = await clientEventsAggregationQuery(clientId, environment, fromDate, toDate);

    return { status: 200, message: null, data: result };
  } catch (err) {
    console.error(err);
    return { status: 500, message: 'Unable to fetch metrics at this moment!', data: null };
  }
};
