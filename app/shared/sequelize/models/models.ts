import { Sequelize, DataTypes } from 'sequelize';
import configs from '../config/config';
import Event from './Event';
import Request from './Request';
import Team from './Team';
import User from './User';
import Survey from './Survey';
import UserTeam from './UserTeam';
import RequestQueue from './RequestQueue';
import RequestRole from './RequestRole';
import BcscClient from './BcscClient';

const config: any = configs[`${process.env.NODE_ENV || 'development'}`];

export const models: any = {};
export const modelNames: string[] = [];
export let sequelize: Sequelize = {} as Sequelize;

if (config.databaseUrl) {
  sequelize = new Sequelize(config.databaseUrl, config);
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  sequelize = new Sequelize(process.env[config.use_env_variable]!, config);
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

export default { models, modelNames, sequelize };
