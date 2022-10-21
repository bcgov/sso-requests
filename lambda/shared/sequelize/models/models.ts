import { Sequelize, DataTypes } from 'sequelize';
import configs from '../config/config';
import Event from './Event';
import Request from './Request';
import Team from './Team';
import User from './User';
import UserTeam from './UserTeam';
const env = process.env.NODE_ENV || 'development';
const config = configs[env];

export const models: any = {};
export const modelNames: string[] = [];
export let sequelize;

if (config.databaseUrl) {
  sequelize = new Sequelize(config.databaseUrl, config);
} else if (config.use_env_variable && process.env[config.use_env_variable]) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

console.log('sequelize initialized', !!sequelize);

[Event, Request, Team, User, UserTeam].forEach((init) => {
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
