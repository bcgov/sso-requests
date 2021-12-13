module.exports = {
  development: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
  },
  test: {
    dialect: 'postgres',
    use_env_variable: 'DATABASE_URL',
    logging: false,
  },
  production: {
    host: process.env.DB_HOSTNAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    omitNull: true,
    dialectOptions: {
      ssl: {
        require: true,
        // Ref.: https://github.com/brianc/node-postgres/issues/2009
        rejectUnauthorized: false,
      },
    },
    use_env_variable: 'DATABASE_URL',
  },
};
