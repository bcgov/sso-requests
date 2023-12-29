// Need to connect based on env (can make these shell inputs). script-cli should do as a user
// Need to make sure to grab composite roles
// Just inserting into the one table
// Need to test connecting to rds from local, not sure if this is possible
// If not possible, then???? Maybe make a sql file, probably easier then running as a lambda function

import dotenv from 'dotenv';
dotenv.config();
import PGP from 'pg-promise';
const pgp = PGP();

const db = pgp({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
  ssl: true,
});

console.log(db);

const main = async () => {
  console.log('connecting...');
  const res = await db.query('SELECT 1');
  console.log(res); // Hello world!
  await pgp.end();
};

main();
