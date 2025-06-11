import type { Sequelize } from 'sequelize';
import { BcscClients as _BcscClients } from '@/sequelize/models/BcscClients';
import type { BcscClientsAttributes, BcscClientsCreationAttributes } from '@/sequelize/models/BcscClients';
import { Events as _Events } from '@/sequelize/models/Events';
import type { EventsAttributes, EventsCreationAttributes } from '@/sequelize/models/Events';
import { RequestQueues as _RequestQueues } from '@/sequelize/models/RequestQueues';
import type { RequestQueuesAttributes, RequestQueuesCreationAttributes } from '@/sequelize/models/RequestQueues';
import { RequestRoles as _RequestRoles } from '@/sequelize/models/RequestRoles';
import type { RequestRolesAttributes, RequestRolesCreationAttributes } from '@/sequelize/models/RequestRoles';
import { Requests as _Requests } from '@/sequelize/models/Requests';
import type { RequestsAttributes, RequestsCreationAttributes } from '@/sequelize/models/Requests';
import { Surveys as _Surveys } from '@/sequelize/models/Surveys';
import type { SurveysAttributes, SurveysCreationAttributes } from '@/sequelize/models/Surveys';
import { Teams as _Teams } from '@/sequelize/models/Teams';
import type { TeamsAttributes, TeamsCreationAttributes } from '@/sequelize/models/Teams';
import { Users as _Users } from '@/sequelize/models/Users';
import type { UsersAttributes, UsersCreationAttributes } from '@/sequelize/models/Users';
import { UsersTeams as _UsersTeams } from '@/sequelize/models/UsersTeams';
import type { UsersTeamsAttributes, UsersTeamsCreationAttributes } from '@/sequelize/models/UsersTeams';
import sequelize from '@/sequelize/config';

export {
  _BcscClients as BcscClients,
  _Events as Events,
  _RequestQueues as RequestQueues,
  _RequestRoles as RequestRoles,
  _Requests as Requests,
  _Surveys as Surveys,
  _Teams as Teams,
  _Users as Users,
  _UsersTeams as UsersTeams,
};

export type {
  BcscClientsAttributes,
  BcscClientsCreationAttributes,
  EventsAttributes,
  EventsCreationAttributes,
  RequestQueuesAttributes,
  RequestQueuesCreationAttributes,
  RequestRolesAttributes,
  RequestRolesCreationAttributes,
  RequestsAttributes,
  RequestsCreationAttributes,
  SurveysAttributes,
  SurveysCreationAttributes,
  TeamsAttributes,
  TeamsCreationAttributes,
  UsersAttributes,
  UsersCreationAttributes,
  UsersTeamsAttributes,
  UsersTeamsCreationAttributes,
};

export function models(sequelize: Sequelize) {
  const BcscClients = _BcscClients.initModel(sequelize);
  const Events = _Events.initModel(sequelize);
  const RequestQueues = _RequestQueues.initModel(sequelize);
  const RequestRoles = _RequestRoles.initModel(sequelize);
  const Requests = _Requests.initModel(sequelize);
  const Surveys = _Surveys.initModel(sequelize);
  const Teams = _Teams.initModel(sequelize);
  const Users = _Users.initModel(sequelize);
  const UsersTeams = _UsersTeams.initModel(sequelize);

  Teams.belongsToMany(Users, { as: 'userIdUsers', through: UsersTeams, foreignKey: 'teamId', otherKey: 'userId' });
  Users.belongsToMany(Teams, { as: 'teamIdTeams', through: UsersTeams, foreignKey: 'userId', otherKey: 'teamId' });
  Events.belongsTo(Requests, { as: 'request', foreignKey: 'requestId' });
  Requests.hasMany(Events, { as: 'events', foreignKey: 'requestId' });
  RequestRoles.belongsTo(Requests, { as: 'request', foreignKey: 'requestId' });
  Requests.hasMany(RequestRoles, { as: 'requestRoles', foreignKey: 'requestId' });
  Requests.belongsTo(Teams, { as: 'team', foreignKey: 'teamId' });
  Teams.hasMany(Requests, { as: 'requests', foreignKey: 'teamId' });
  UsersTeams.belongsTo(Teams, { as: 'team', foreignKey: 'teamId' });
  Teams.hasMany(UsersTeams, { as: 'usersTeams', foreignKey: 'teamId' });
  Requests.belongsTo(Users, { as: 'user', foreignKey: 'userId' });
  Users.hasMany(Requests, { as: 'requests', foreignKey: 'userId' });
  Surveys.belongsTo(Users, { as: 'user', foreignKey: 'userId' });
  Users.hasMany(Surveys, { as: 'surveys', foreignKey: 'userId' });
  UsersTeams.belongsTo(Users, { as: 'user', foreignKey: 'userId' });
  Users.hasMany(UsersTeams, { as: 'usersTeams', foreignKey: 'userId' });

  return {
    bcscClient: BcscClients,
    event: Events,
    requestQueue: RequestQueues,
    requestRole: RequestRoles,
    request: Requests,
    survey: Surveys,
    team: Teams,
    user: Users,
    usersTeam: UsersTeams,
  };
}

export default models(sequelize);
