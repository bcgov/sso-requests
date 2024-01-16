import KcAdminClient from '@keycloak/keycloak-admin-client';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const SQL_FILENAME = 'migrate-roles.sql';

async function removeLastCharacter(filename) {
  const stat = await fs.promises.stat(filename);
  const fileSize = stat.size;
  await fs.promises.truncate(filename, fileSize - 1);
}

const getClientIds = async (kcClient) => {
  return (
    kcClient.clients
      .find({ realm: 'standard' })
      .then((res) => res.filter((client) => client.clientId))
      .then((res) => res.map((client) => ({ id: client.id, clientId: client.clientId })))
      // Ignore default clients with client roles
      .then((res) =>
        res.filter((client) => !['account', 'realm-admin', 'realm-management', 'broker'].includes(client.clientId)),
      )
  );
};

const getRolesByClient = async (kcClient, clientIds) => {
  return Promise.all(
    clientIds.map(({ clientId, id }) =>
      kcClient.clients
        .listRoles({ id, realm: 'standard' })
        .then((roles) => roles.map((role) => ({ ...role, clientId }))),
    ),
  ).then((roles) => roles.reduce((acc, curr) => acc.concat(curr)));
};

const addRolesForEnv = async (env) => {
  console.info(`Adding inserts for environment ${env}...`);
  const url = process.env[`KC_URL_${env}`];
  const clientSecret = process.env[`KC_CLIENT_SECRET_${env}`];

  const authServerUrl = `${url}/auth`;
  const kcAdminClient = new KcAdminClient({
    baseUrl: authServerUrl,
    realmName: 'master',
  });

  await kcAdminClient.auth({
    grantType: 'client_credentials',
    clientId: process.env.KC_CLIENT_ID,
    clientSecret,
  });
  const clientIds = await getClientIds(kcAdminClient);
  const rolesByClient = await getRolesByClient(kcAdminClient, clientIds);
  await buildSql(kcAdminClient, rolesByClient, env.toLowerCase());
};

const main = async () => {
  // Temporary table to track role relationships and insert ids later.
  await fs.promises.writeFile(
    SQL_FILENAME,
    `
BEGIN;
CREATE TEMP TABLE request_roles_temp (
    id serial,
    name text,
    environment text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    request_id integer,
    composite boolean,
    composite_roles text[],
    created_by integer,
    last_updated_by integer
) ON COMMIT DROP;
    `,
  );

  await fs.promises.appendFile(
    SQL_FILENAME,
    'insert into request_roles_temp (name, environment, created_at, updated_at, request_id, composite, composite_roles, created_by, last_updated_by) values',
  );
  await addRolesForEnv('DEV');
  await addRolesForEnv('TEST');
  await addRolesForEnv('PROD');

  // Strip trailing comma and add semicolon
  await removeLastCharacter(SQL_FILENAME);
  await fs.promises.appendFile(
    SQL_FILENAME,
    `;
INSERT INTO request_roles (id, name, environment, created_at, updated_at, request_id, composite, composite_roles, created_by, last_updated_by)
select id, name, environment, created_at, updated_at, request_id, composite, ARRAY(
    select id from request_roles_temp inner_select where inner_select.name = ANY(outer_select.composite_roles) and inner_select.environment = outer_select.environment and inner_select.request_id = outer_select.request_id
), created_by, last_updated_by
from request_roles_temp outer_select;

COMMIT;
    `,
  );
};

const buildSql = async (kcClient, roles, env) => {
  for (let role of roles) {
    let composites = [];
    if (role.composite) {
      const kcComposites = await kcClient.roles.getCompositeRoles({ id: role.id, realm: 'standard' });
      composites = kcComposites.map((role) => role.name);
    }
    // Since we don't know the created or updated time defaulting them to the initial migration time. Since we don't know the creating user defaulting to the requests user_id
    await fs.promises.appendFile(
      SQL_FILENAME,
      `\n('${role.name}', '${env}', NOW(), NOW(), (select id from requests where client_id = '${role.clientId}'), ${
        role.composite
      }, '{${composites.join(', ')}}'::text[], (select user_id from requests where client_id = '${
        role.clientId
      }'), (select user_id from requests where client_id = '${role.clientId}')),`,
    );
  }
};

main();
