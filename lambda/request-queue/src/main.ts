if (process.env.NODE_ENVIRONMENT === 'local') {
  require('dotenv').config();
}
import { models, loadSequelize } from './db';
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

let sequelize = null;

export const handler = async () => {
  try {
    if (!sequelize) {
      sequelize = await loadSequelize();
    } else {
      sequelize.connectionManager.initPools();
    }
    const allPromises: Promise<any>[] = [];
    const requestQueue = await models.requestQueue.findAll();
    if (requestQueue.length === 0) {
      console.info('Request queue empty, exiting.');
    }

    requestQueue.forEach((queuedRequest) => {
      if (queuedRequest.attempts >= MAX_ATTEMPTS) {
        console.info(`request ${queuedRequest.request.clientId} at maximum attempts. Skipping.`);
        return;
      }

      const requestQueueSecondsAgo = (new Date().getTime() - new Date(queuedRequest.createdAt).getTime()) / 1000;
      // Only act on queued items more than a minute old to prevent potential duplication.
      if (requestQueueSecondsAgo < REQUEST_QUEUE_INTERVAL_SECONDS) return;
      console.info(`processing queued request ${queuedRequest.request.id}`);
      const { existingClientId, ...request } = queuedRequest.request;

      // Create/update/delete each environment, based on request data. e.g if archived is true will delete.
      const environmentPromises = queuedRequest.request.environments.map((env) =>
        keycloakClient(env, request, existingClientId),
      );

      // Update DB, create event and send email based on keycloak results.
      allPromises.push(
        Promise.all(environmentPromises).then((results) => {
          const allEnvironmentsSucceeded = results.every((result) => result);
          const sendEmail = queuedRequest.action !== ACTION_TYPES.DELETE;
          if (allEnvironmentsSucceeded) {
            const promises = Promise.all([
              models.requestQueue.destroy({
                where: {
                  id: queuedRequest.id,
                },
              }),
              models.request.update(
                {
                  status: 'applied',
                },
                {
                  where: {
                    id: queuedRequest.requestId,
                  },
                },
              ),
              createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: request.id }),
            ])
              // Must send email after event creation, since event is used to determine update vs create
              .then(() => {
                if (sendEmail) {
                  return updatePlannedIntegration(request);
                }
              });
            return promises as Promise<any>;
          } else {
            const promises = [
              models.requestQueue.update(
                {
                  attempts: queuedRequest.attempts + 1,
                },
                {
                  where: {
                    id: queuedRequest.id,
                  },
                },
              ),
              models.request.update(
                {
                  status: 'applyFailed',
                },
                {
                  where: {
                    id: queuedRequest.requestId,
                  },
                },
              ),
              createEvent({ eventCode: EVENTS.REQUEST_APPLY_FAILURE, requestId: request.id }),
            ];
            if (queuedRequest.attempts >= MAX_ATTEMPTS - 1) {
              promises.push(
                sendRcNotification(
                  `Request ${queuedRequest.request.clientId} has reached maximum retries and requires manual intervention.`,
                ),
              );
            }
            return Promise.all(promises);
          }
        }),
      );
    });
    await Promise.all(allPromises);
  } catch (err) {
    console.error(err);
  } finally {
    // Only close connection pool in lambda runtimes, not local development and testing.
    if (process.env.NODE_ENV !== 'development') await sequelize.connectionManager.close();
  }
};

if (process.env.NODE_ENVIRONMENT === 'local') {
  handler();
}
