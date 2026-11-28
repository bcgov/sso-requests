import nodeCron from 'node-cron';
import * as dotenv from 'dotenv';
import { runRecoveryTick } from './recovery-tick';

dotenv.config();

export default function main() {
  console.info(
    'Task 1: Request workflow recovery tick every minute (picks up workflows abandoned by a crashed pod or waiting on a retry backoff)',
  );
  nodeCron.schedule('*/1 * * * *', () => {
    // Not awaited: a tick working through a backlog must not hold back the next one.
    runRecoveryTick().catch((error) =>
      console.error('Recovery tick failed unexpectedly', error),
    );
  });

  console.info('Task 2: List of missing Keycloak clients daily once at 5 am');
  nodeCron.schedule('0 5 * * *', async () => {
    fetch(`${process.env.APP_URL}/api/missingKeycloakClients`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${process.env.API_AUTH_SECRET}`,
      },
    }).catch((error) => {
      console.error(
        `Error calling ${process.env.APP_URL}/api/missingKeycloakClients`,
        error,
      );
    });
  });

  console.info('Task 3: Cleanup CSS API Usage old data daily once at 4 am');
  nodeCron.schedule('0 4 * * *', async () => {
    fetch(`${process.env.APP_URL}/api/cleanupCssApiUsage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${process.env.API_AUTH_SECRET}`,
      },
    }).catch((error) => {
      console.error(
        `Error calling ${process.env.APP_URL}/api/cleanupCssApiUsage`,
        error,
      );
    });
  });

  console.info(
    'Task 4: Rotate entra app registration key credentials every six months',
  );
  nodeCron.schedule('0 6 1 1,7 *', async () => {
    fetch(
      `${process.env.APP_URL}/api/ms-graph/refreshApplicationKeyCredentials`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `${process.env.API_AUTH_SECRET}`,
        },
      },
    ).catch((error) => {
      console.error(
        `Error calling ${process.env.APP_URL}/api/ms-graph/refreshApplicationKeyCredentials`,
        error,
      );
    });
  });
}

main();
