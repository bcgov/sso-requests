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
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { node_env } = serverRuntimeConfig as { node_env: keyof typeof configs };

const config = configs[node_env];

export const models: any = {};
export const modelNames: string[] = [];

export const sequelize = new Sequelize(config?.database, config.username, config.password, config as any);

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
