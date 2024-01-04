import { models } from '../../shared/sequelize/models/models';
import { keycloakClient } from '@lambda-app/keycloak/integration';

export const handler = async () => {
  try {
    const allPromises: Promise<any>[] = [];
    const requestQueue = await models.requestQueue.findAll();

    requestQueue.forEach((queuedRequest) => {
      const environmentCreationPromises = queuedRequest.request.environments.map((env) =>
        keycloakClient(env, queuedRequest.request),
      );

      // Update DB based on request results
      allPromises.push(
        Promise.all(environmentCreationPromises).then((results) => {
          const allEnvironmentsSucceeded = results.every((result) => result);
          if (allEnvironmentsSucceeded) {
            return Promise.all([
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
            ]);
          } else {
            return models.request.update(
              {
                status: 'applyFailed',
              },
              {
                where: {
                  id: queuedRequest.requestId,
                },
              },
            );
          }
        }),
      );
    });
    await Promise.all(allPromises);
  } catch (err) {
    console.error(err);
  }
};
