import * as pg from 'pg';

const config = {
  local_development: {
    dialect: 'postgres',
    dialectModule: pg,
    use_env_variable: 'DATABASE_URL',
  },
  development: {
    dialect: 'postgres',
    dialectModule: pg,
    use_env_variable: 'DATABASE_URL',
    host: process.env.DB_HOSTNAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    logging: false,
  },
  test: {
    dialect: 'postgres',
    dialectModule: pg,
    logging: false,
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/ssorequests_test',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  production: {
    host: process.env.DB_HOSTNAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
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
