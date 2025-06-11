import nodeCron from 'node-cron';
import * as dotenv from 'dotenv';

dotenv.config();

export default function main() {
  console.log('Processing requests queue for every 5 minutes');
  nodeCron.schedule('*/5 * * * *', async () => {
    fetch(`${process.env.APP_URL}/api/processRequestQueue`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${process.env.API_AUTH_SECRET}`,
      },
    }).catch((error) => {
      console.error(
        `Error calling ${process.env.APP_URL}/api/processRequestQueue`,
        error,
      );
    });
  });

  console.log('List of missing Keycloak clients daily once at 5 am');
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
}

main();
