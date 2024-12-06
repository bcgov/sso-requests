if (process.env.NODE_ENVIRONMENT === 'local') {
  require('dotenv').config();
}
import { models } from '@lambda-shared/sequelize/models/models';
import { keycloakClient } from '@lambda-app/keycloak/integration';
import { updatePlannedIntegration, createEvent } from '@lambda-app/controllers/requests';
import { ACTION_TYPES, EVENTS } from '@lambda-shared/enums';
import axios from 'axios';

const REQUEST_QUEUE_INTERVAL_SECONDS = 60;
export const MAX_ATTEMPTS = 5;

export const sendRcNotification = async (message) => {
  try {
    const headers = { Accept: 'application/json' };
    await axios.post(process.env.RC_WEBHOOK, { projectName: 'request_queue', message }, { headers });
  } catch (err) {
    console.error('Unable to send RC notification', err);
  }
};

export const handler = async () => {
  try {
    const requestQueue = await models.requestQueue.findAll();
    if (requestQueue.length === 0) {
      console.info('Request queue empty, exiting.');
    }

    for (const queuedRequest of requestQueue) {
      if (queuedRequest.attempts >= MAX_ATTEMPTS) {
        console.info(`request ${queuedRequest.request.clientId} at maximum attempts. Skipping.`);
        continue;
      }

      // Only act on queued items more than a minute old to prevent potential duplication.
      const requestQueueSecondsAgo = (new Date().getTime() - new Date(queuedRequest.createdAt).getTime()) / 1000;
      if (requestQueueSecondsAgo < REQUEST_QUEUE_INTERVAL_SECONDS) continue;

      console.info(`processing queued request ${queuedRequest.request.id}`);
      const { existingClientId, ...request } = queuedRequest.request;

      // Handle client update for each env
      const environmentPromises = queuedRequest.request.environments.map((env) =>
        keycloakClient(env, request, existingClientId),
      );
      const envResults = await Promise.all(environmentPromises);

      const allEnvironmentsSucceeded = envResults.every((result) => result);
      const sendEmail = queuedRequest.action !== ACTION_TYPES.DELETE;

      // Update DB, create event and send email based on keycloak results.
      if (allEnvironmentsSucceeded) {
        await models.request.update({ status: 'applied' }, { where: { id: queuedRequest.requestId } });
        await models.requestQueue.destroy({ where: { id: queuedRequest.id } });
        await createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: request.id });
        if (sendEmail) await updatePlannedIntegration(request);
      } else {
        await models.requestQueue.update({ attempts: queuedRequest.attempts + 1 }, { where: { id: queuedRequest.id } });
        await models.request.update({ status: 'applyFailed' }, { where: { id: queuedRequest.requestId } });
        await createEvent({ eventCode: EVENTS.REQUEST_APPLY_FAILURE, requestId: request.id });
      }
      if (queuedRequest.attempts >= MAX_ATTEMPTS - 1) {
        await sendRcNotification(
          `Request ${queuedRequest.request.clientId} has reached maximum retries and requires manual intervention.`,
        );
      }
    }
  } catch (err) {
    console.error(err);
  }
};

if (process.env.NODE_ENVIRONMENT === 'local') {
  handler();
}
