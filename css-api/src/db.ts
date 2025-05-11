import postgres from 'postgres';

export const sql = postgres({
  host: process.env.DB_HOSTNAME,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
});
