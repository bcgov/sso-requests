import { models } from '../../shared/sequelize/models/models';
import { keycloakClient } from '@lambda-app/keycloak/integration';
import { updatePlannedIntegration, createEvent } from '@lambda-app/controllers/requests';
import { ACTION_TYPES, EVENTS } from '@lambda-shared/enums';

export const handler = async () => {
  try {
    const allPromises: Promise<any>[] = [];
    const requestQueue = await models.requestQueue.findAll();
    if (requestQueue.length === 0) {
      console.info('Request queue empty, exiting.');
    }

    requestQueue.forEach((queuedRequest) => {
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
            return Promise.all([
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
            ]);
          }
        }),
      );
    });
    await Promise.all(allPromises);
  } catch (err) {
    console.error(err);
  }
};
