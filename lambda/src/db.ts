const pg = require('pg');
const rdsEndpoint = process.env.RDS_ENDPOINT;
const name = process.env.DB_USERNAME;
const password = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;

export default async function getClient() {
  const conString = `postgres://${name}:${password}@${rdsEndpoint}/${dbName}`;
  const client = new pg.Client(conString);
  return client;
}
