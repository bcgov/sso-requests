import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Requests, RequestsId } from './Requests';
import type { Users, UsersId } from './Users';
import type { UsersTeams, UsersTeamsId } from './UsersTeams';

export interface TeamsAttributes {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TeamsPk = 'id';
export type TeamsId = Teams[TeamsPk];
export type TeamsOptionalAttributes = 'id' | 'createdAt' | 'updatedAt';
export type TeamsCreationAttributes = Optional<TeamsAttributes, TeamsOptionalAttributes>;

export class Teams extends Model<TeamsAttributes, TeamsCreationAttributes> implements TeamsAttributes {
  id!: number;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;

  // Teams hasMany Requests via teamId
  requests!: Requests[];
  getRequests!: Sequelize.HasManyGetAssociationsMixin<Requests>;
  setRequests!: Sequelize.HasManySetAssociationsMixin<Requests, RequestsId>;
  addRequest!: Sequelize.HasManyAddAssociationMixin<Requests, RequestsId>;
  addRequests!: Sequelize.HasManyAddAssociationsMixin<Requests, RequestsId>;
  createRequest!: Sequelize.HasManyCreateAssociationMixin<Requests>;
  removeRequest!: Sequelize.HasManyRemoveAssociationMixin<Requests, RequestsId>;
  removeRequests!: Sequelize.HasManyRemoveAssociationsMixin<Requests, RequestsId>;
  hasRequest!: Sequelize.HasManyHasAssociationMixin<Requests, RequestsId>;
  hasRequests!: Sequelize.HasManyHasAssociationsMixin<Requests, RequestsId>;
  countRequests!: Sequelize.HasManyCountAssociationsMixin;
  // Teams belongsToMany Users via teamId and userId
  userIdUsers!: Users[];
  getUserIdUsers!: Sequelize.BelongsToManyGetAssociationsMixin<Users>;
  setUserIdUsers!: Sequelize.BelongsToManySetAssociationsMixin<Users, UsersId>;
  addUserIdUser!: Sequelize.BelongsToManyAddAssociationMixin<Users, UsersId>;
  addUserIdUsers!: Sequelize.BelongsToManyAddAssociationsMixin<Users, UsersId>;
  createUserIdUser!: Sequelize.BelongsToManyCreateAssociationMixin<Users>;
  removeUserIdUser!: Sequelize.BelongsToManyRemoveAssociationMixin<Users, UsersId>;
  removeUserIdUsers!: Sequelize.BelongsToManyRemoveAssociationsMixin<Users, UsersId>;
  hasUserIdUser!: Sequelize.BelongsToManyHasAssociationMixin<Users, UsersId>;
  hasUserIdUsers!: Sequelize.BelongsToManyHasAssociationsMixin<Users, UsersId>;
  countUserIdUsers!: Sequelize.BelongsToManyCountAssociationsMixin;
  // Teams hasMany UsersTeams via teamId
  usersTeams!: UsersTeams[];
  getUsersTeams!: Sequelize.HasManyGetAssociationsMixin<UsersTeams>;
  setUsersTeams!: Sequelize.HasManySetAssociationsMixin<UsersTeams, UsersTeamsId>;
  addUsersTeam!: Sequelize.HasManyAddAssociationMixin<UsersTeams, UsersTeamsId>;
  addUsersTeams!: Sequelize.HasManyAddAssociationsMixin<UsersTeams, UsersTeamsId>;
  createUsersTeam!: Sequelize.HasManyCreateAssociationMixin<UsersTeams>;
  removeUsersTeam!: Sequelize.HasManyRemoveAssociationMixin<UsersTeams, UsersTeamsId>;
  removeUsersTeams!: Sequelize.HasManyRemoveAssociationsMixin<UsersTeams, UsersTeamsId>;
  hasUsersTeam!: Sequelize.HasManyHasAssociationMixin<UsersTeams, UsersTeamsId>;
  hasUsersTeams!: Sequelize.HasManyHasAssociationsMixin<UsersTeams, UsersTeamsId>;
  countUsersTeams!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof Teams {
    return sequelize.define(
      'Teams',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'updated_at',
          defaultValue: Sequelize.fn('now'),
        },
      },
      {
        tableName: 'teams',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'teams_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof Teams;
  }
}
