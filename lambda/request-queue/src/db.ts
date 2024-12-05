import { Sequelize, DataTypes } from 'sequelize';
import configs from '@lambda-shared/sequelize/config/config';
import Event from '@lambda-shared/sequelize/models/Event';
import Request from '@lambda-shared/sequelize/models/Request';
import Team from '@lambda-shared/sequelize/models/Team';
import User from '@lambda-shared/sequelize/models/User';
import Survey from '@lambda-shared/sequelize/models/Survey';
import UserTeam from '@lambda-shared/sequelize/models/UserTeam';
import RequestQueue from '@lambda-shared/sequelize/models/RequestQueue';
import RequestRole from '@lambda-shared/sequelize/models/RequestRole';
import BcscClient from '@lambda-shared/sequelize/models/BcscClient';

const env = process.env.NODE_ENV || 'development';

// See https://sequelize.org/docs/v6/other-topics/aws-lambda/#tldr
const config = {
  ...configs[env],
  pool: {
    max: 2,
    min: 0,
    idle: 0,
    acquire: 3000,
    // Should match timeout in the lambda configuration. See terraform/lambda-request-queue.tf.
    evict: 45,
  },
};

export const models: any = {};
export const modelNames: string[] = [];
export let sequelize = null;

export const loadSequelize = async () => {
  // Use the shared sequelize env for local development and testing. Use custom configuration in lambda runtimes.
  if (env === 'development') {
    ({ sequelize } = await import('@lambda-shared/sequelize/models/models'));
  } else if (config.databaseUrl) {
    sequelize = new Sequelize(config.databaseUrl, config);
  } else if (config.use_env_variable && process.env[config.use_env_variable]) {
    sequelize = new Sequelize(process.env[config.use_env_variable], config);
  } else {
    sequelize = new Sequelize(config.database, config.username, config.password, config);
  }

  console.log('sequelize initialized', !!sequelize);

  [Event, Request, Team, User, UserTeam, Survey, RequestQueue, RequestRole, BcscClient].forEach((init) => {
    const model = init(sequelize, DataTypes);
    models[model.name] = model;
    modelNames.push(model.name);
  });

  Object.keys(models).forEach((modelName) => {
    if (models[modelName]?.options.associate) {
      models[modelName].options.associate(models);
    }
  });

  await sequelize.authenticate();
  return sequelize;
};
