import fs from 'fs';
import { parse } from 'csv-parse';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import dotenv from 'dotenv';
dotenv.config();

const parseDataToJSON = async () => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream('./data.csv')
      .pipe(parse({ delimiter: ',', from_line: 2 }))
      .on('data', function (row) {
        results.push(row);
      })
      .on('error', function (error) {
        console.log(error.message);
      })
      .on('end', function () {
        resolve(results);
      });
  });
};

const getClientId = async (kcClient, clientId) => {
  return kcClient.clients.find({ realm: 'standard', clientId }).then((res) => res[0].id);
};

const clientHasRole = async (kcClient, clientId, roleName) => {
  return kcClient.clients.listRoles({ id: clientId, realm: 'standard' }).then((roles) =>
    roles.some((role) => {
      return role.name === roleName;
    }),
  );
};

const getKCClients = async () => {
  const devAdminClient = new KcAdminClient({
    baseUrl: process.env.KC_URL_DEV,
    realmName: 'master',
  });
  const testAdminClient = new KcAdminClient({
    baseUrl: process.env.KC_URL_TEST,
    realmName: 'master',
  });
  const prodAdminClient = new KcAdminClient({
    baseUrl: process.env.KC_URL_PROD,
    realmName: 'master',
  });
  await authenticateClients(devAdminClient, testAdminClient, prodAdminClient);
  return { devAdminClient, testAdminClient, prodAdminClient };
};

const authenticateClients = async (devAdminClient, testAdminClient, prodAdminClient) => {
  await devAdminClient.auth({
    grantType: 'password',
    clientId: 'admin-cli',
    username: process.env.KC_DEV_USERNAME,
    password: process.env.KC_DEV_PASS,
  });
  await testAdminClient.auth({
    grantType: 'password',
    clientId: 'admin-cli',
    username: process.env.KC_TEST_USERNAME,
    password: process.env.KC_TEST_PASS,
  });
  await prodAdminClient.auth({
    grantType: 'password',
    clientId: 'admin-cli',
    username: process.env.KC_PROD_USERNAME,
    password: process.env.KC_PROD_PASS,
  });
};

const wait = (timeout) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });

const roleFound = async (devAdminClient, testAdminClient, prodAdminClient, roleData) => {
  const [clientId, roleName, environment] = roleData;
  console.log(`attempting to check client ${clientId} in env ${environment} for role ${roleName}`);
  let client;
  if (environment === 'dev') client = devAdminClient;
  if (environment === 'test') client = testAdminClient;
  if (environment === 'prod') client = prodAdminClient;

  const clientInternalId = await getClientId(client, clientId);
  const roleExists = await clientHasRole(client, clientInternalId, roleName);

  if (!roleExists) {
    console.info(`Role ${roleName} for client ${clientId} in environment ${environment} is not in keycloak :(`);
    return false;
  }
  return true;
};

const main = async () => {
  const potentiallyMissingRoles = await parseDataToJSON();
  const { devAdminClient, testAdminClient, prodAdminClient } = await getKCClients();
  const missingRoles = [];

  for (const roleData of potentiallyMissingRoles) {
    try {
      const found = await roleFound(devAdminClient, testAdminClient, prodAdminClient, roleData).catch(async (err) => {
        if (err.response.status === 401) {
          await authenticateClients(devAdminClient, testAdminClient, prodAdminClient);
          return roleFound(devAdminClient, testAdminClient, prodAdminClient, roleData);
        }
      });
      if (!found) {
        missingRoles.push(roleData);
      }
      await wait(10);
    } catch (err) {
      console.info('ERROR ON ', roleData);
    }
  }
  console.log('ALL MISSING ROLES:', JSON.stringify(missingRoles));
};
main();
