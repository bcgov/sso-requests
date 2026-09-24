import { Sequelize, DataTypes } from 'sequelize';
import configs from '../config/config';
import Event from './Event';
import Request from './Request';
import Team from './Team';
import User from './User';
import Survey from './Survey';
import UserTeam from './UserTeam';
import RequestRole from './RequestRole';
import BcscClient from './BcscClient';
import CustomRequest from './CustomRequest';
import SdxRequest from './SdxRequest';
import EntraClient from './EntraClient';
import RequestWorkflow from './requestWorkflow';
import RequestWorkflowStep from './requestWorkflowStep';
import RequestWorkflowFailures from './requestWorkflowFailure';
import Division from './Division';
import BcgovUnit from './BcgovUnit';
import Organization from './Organization';
import OrganizationMember from './OrganizationMember';
import OrganizationTeam from './OrganizationTeam';
import OrganizationIntegrationOverride from './OrganizationIntegrationOverride';

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

[
  Event,
  Request,
  Team,
  User,
  UserTeam,
  Survey,
  RequestRole,
  BcscClient,
  CustomRequest,
  SdxRequest,
  EntraClient,
  RequestWorkflow,
  RequestWorkflowStep,
  RequestWorkflowFailures,
  BcgovUnit,
  Division,
  Organization,
  OrganizationMember,
  OrganizationTeam,
  OrganizationIntegrationOverride,
].forEach((init) => {
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
