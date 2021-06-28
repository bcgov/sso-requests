const pg = require('pg');
const rdsEndpoint = process.env['rds_endpoint'];
const name = process.env['db_username'];
const password = process.env['db_password'];
const dbName = process.env['db_name'];

export default async function getClient() {
  const conString = `postgres://${name}:${password}@${rdsEndpoint}/${dbName}`;
  const client = new pg.Client(conString);
  return client;
}
