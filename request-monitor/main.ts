import { Client } from 'pg';
import { getKeycloakClientsByEnv } from './keycloak';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as utils from 'utils';

dotenv.config();

export const getPgConnection = () => {
  return new Client({
    host: process.env.DB_HOSTNAME || 'localhost',
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'ssorequests_test',
  });
};

export const handler = async () => {
  let client: Client;
  try {
    let data = '';
    client = getPgConnection();
    await client.connect();
    const listOfDiscrepencies = {
      dev: [],
      test: [],
      prod: [],
    };

    for (const env of ['dev', 'test', 'prod']) {
      const cssRequests = await getActiveRequests(client, env);
      const kcClients = await getKeycloakClientsByEnv(env);

      for (const cssRqst of cssRequests) {
        const matchingKcClient = kcClients.find(
          (kcClient) => kcClient.clientId === cssRqst.client_id && kcClient.enabled,
        );
        if (!matchingKcClient) {
          listOfDiscrepencies[env].push(cssRqst.client_id);
        }
      }
    }

    if (
      listOfDiscrepencies.dev.length > 0 ||
      listOfDiscrepencies.test.length > 0 ||
      listOfDiscrepencies.prod.length > 0
    ) {
      const header = `**${
        process.env.APP_ENV === 'production' ? '' : '[SANDBOX] '
      }List of discrepancies by environment:** \n\n`;

      if (listOfDiscrepencies.dev.length > 0) data = data + `**dev:** \n${listOfDiscrepencies.dev.join(', ')}\n\n`;
      if (listOfDiscrepencies.test.length > 0) data = data + `**test:** \n${listOfDiscrepencies.test.join(', ')}\n\n`;
      if (listOfDiscrepencies.prod.length > 0) data = data + `**prod:** \n${listOfDiscrepencies.prod.join(', ')}\n\n`;
      await utils.sendRcNotification(header + data, null);
    }
    return data;
  } catch (err) {
    console.error('could not get discrepancies', err);
    await utils.sendRcNotification('**Failed to get discrepancies**\n\n', err);
  } finally {
    await client.end();
  }
};

const getActiveRequests = async (client: Client, environment: string) => {
  try {
    const text =
      "SELECT id, project_name, environments, client_id, api_service_account FROM requests WHERE $1 = ANY(environments) and status = 'applied' and archived = false";
    const values = [environment];
    const result = await client.query(text, values);
    return result?.rows || [];
  } catch (err) {
    console.error('could not get active requests', err);
    return [];
  }
};

handler();
