import * as pg from 'pg';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { db_hostname, db_username, db_password, db_name } = serverRuntimeConfig;

const config = {
  local_development: {
    dialect: 'postgres',
    dialectModule: pg,
    use_env_variable: 'DATABASE_URL',
    host: db_hostname || 'localhost',
    username: db_username || '',
    password: db_password || '',
    database: db_name || '',
  },
  development: {
    dialect: 'postgres',
    dialectModule: pg,
    use_env_variable: 'DATABASE_URL',
    host: db_hostname || 'localhost',
    username: db_username || '',
    password: db_password || '',
    database: db_name || '',
    logging: false,
  },
  test: {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    use_env_variable: 'DATABASE_URL',
    host: db_hostname || 'localhost',
    username: db_username || '',
    password: db_password || '',
    database: db_name || '',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    host: db_hostname || 'localhost',
    username: db_username || '',
    password: db_password || '',
    database: db_name || '',
    dialect: 'postgres',
    dialectModule: pg,
    omitNull: true,
    dialectOptions: {
      ssl: {
        require: true,
        // Ref.: https://github.com/brianc/node-postgres/issues/2009
        rejectUnauthorized: false,
      },
    },
    use_env_variable: 'DATABASE_URL',
    logging: false,
  },
};

export default config;
