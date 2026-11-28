/**
 * Calls the app's workflow recovery endpoint and tells ops when it keeps failing. Every workflow retry longer
 * than a minute, including the 10-minute retries during a Keycloak or SDX outage, only runs because this tick
 * does, so a tick that silently fails (a rotated API_AUTH_SECRET answering 401, an app that is down) stalls every
 * one of them.
 */

/** Consecutive failed ticks, one a minute, before ops is alerted. */
const FAILURES_BEFORE_ALERT = Number(
  process.env.RECOVERY_TICK_FAILURES_BEFORE_ALERT || 3,
);

let consecutiveFailures = 0;
let alerted = false;

const endpoint = () => `${process.env.APP_URL}/api/processRequestQueue`;

const alertOps = async (message: string, statusCode: 'ERROR' | '') => {
  const webhook = process.env.RC_SSO_OPS_WEBHOOK;
  if (!webhook) return;
  try {
    await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        projectName: 'request_workflows',
        message,
        statusCode,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error('Error publishing the recovery tick ops alert', error);
  }
};

const recordFailure = async (reason: string) => {
  consecutiveFailures += 1;
  console.error(
    `Recovery tick ${endpoint()} failed (${consecutiveFailures} in a row): ${reason}`,
  );
  if (alerted || consecutiveFailures < FAILURES_BEFORE_ALERT) return;

  alerted = true;
  await alertOps(
    `The request workflow recovery tick against ${endpoint()} has failed ${consecutiveFailures} times in a row: ` +
      `${reason}. Workflow retries and recovery are stalled until it succeeds again.`,
    'ERROR',
  );
};

const recordSuccess = async () => {
  if (alerted) {
    await alertOps(
      `The request workflow recovery tick against ${endpoint()} is succeeding again after ${consecutiveFailures} ` +
        'failures. Stalled workflow retries resume now.',
      '',
    );
  }
  consecutiveFailures = 0;
  alerted = false;
};

export const runRecoveryTick = async () => {
  let response: Response;
  try {
    response = await fetch(endpoint(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${process.env.API_AUTH_SECRET}`,
      },
    });
  } catch (error) {
    await recordFailure(error instanceof Error ? error.message : String(error));
    return;
  }

  // The route gave up waiting on a tick that is still working through a backlog; the app itself answered.
  if (response.status === 504) {
    console.warn(
      `Recovery tick ${endpoint()} outlasted the route timeout and is still running`,
    );
    return;
  }

  if (!response.ok) {
    await recordFailure(
      `HTTP ${response.status} ${response.statusText}`.trim(),
    );
    return;
  }

  await recordSuccess();
};
