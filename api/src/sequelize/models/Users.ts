import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Requests, RequestsId } from './Requests';
import type { Surveys, SurveysId } from './Surveys';
import type { Teams, TeamsId } from './Teams';
import type { UsersTeams, UsersTeamsId } from './UsersTeams';

export interface UsersAttributes {
  id: number;
  idirUserid?: string;
  idirEmail: string;
  createdAt: Date;
  updatedAt: Date;
  additionalEmail?: string;
  displayName?: string;
  hasReadGoldNotification: boolean;
  surveySubmissions?: object;
}

export type UsersPk = 'id';
export type UsersId = Users[UsersPk];
export type UsersOptionalAttributes =
  | 'id'
  | 'idirUserid'
  | 'createdAt'
  | 'updatedAt'
  | 'additionalEmail'
  | 'displayName'
  | 'surveySubmissions';
export type UsersCreationAttributes = Optional<UsersAttributes, UsersOptionalAttributes>;

export class Users extends Model<UsersAttributes, UsersCreationAttributes> implements UsersAttributes {
  id!: number;
  idirUserid?: string;
  idirEmail!: string;
  createdAt!: Date;
  updatedAt!: Date;
  additionalEmail?: string;
  displayName?: string;
  hasReadGoldNotification!: boolean;
  surveySubmissions?: object;

  // Users hasMany Requests via userId
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
  // Users hasMany Surveys via userId
  surveys!: Surveys[];
  getSurveys!: Sequelize.HasManyGetAssociationsMixin<Surveys>;
  setSurveys!: Sequelize.HasManySetAssociationsMixin<Surveys, SurveysId>;
  addSurvey!: Sequelize.HasManyAddAssociationMixin<Surveys, SurveysId>;
  addSurveys!: Sequelize.HasManyAddAssociationsMixin<Surveys, SurveysId>;
  createSurvey!: Sequelize.HasManyCreateAssociationMixin<Surveys>;
  removeSurvey!: Sequelize.HasManyRemoveAssociationMixin<Surveys, SurveysId>;
  removeSurveys!: Sequelize.HasManyRemoveAssociationsMixin<Surveys, SurveysId>;
  hasSurvey!: Sequelize.HasManyHasAssociationMixin<Surveys, SurveysId>;
  hasSurveys!: Sequelize.HasManyHasAssociationsMixin<Surveys, SurveysId>;
  countSurveys!: Sequelize.HasManyCountAssociationsMixin;
  // Users belongsToMany Teams via userId and teamId
  teamIdTeams!: Teams[];
  getTeamIdTeams!: Sequelize.BelongsToManyGetAssociationsMixin<Teams>;
  setTeamIdTeams!: Sequelize.BelongsToManySetAssociationsMixin<Teams, TeamsId>;
  addTeamIdTeam!: Sequelize.BelongsToManyAddAssociationMixin<Teams, TeamsId>;
  addTeamIdTeams!: Sequelize.BelongsToManyAddAssociationsMixin<Teams, TeamsId>;
  createTeamIdTeam!: Sequelize.BelongsToManyCreateAssociationMixin<Teams>;
  removeTeamIdTeam!: Sequelize.BelongsToManyRemoveAssociationMixin<Teams, TeamsId>;
  removeTeamIdTeams!: Sequelize.BelongsToManyRemoveAssociationsMixin<Teams, TeamsId>;
  hasTeamIdTeam!: Sequelize.BelongsToManyHasAssociationMixin<Teams, TeamsId>;
  hasTeamIdTeams!: Sequelize.BelongsToManyHasAssociationsMixin<Teams, TeamsId>;
  countTeamIdTeams!: Sequelize.BelongsToManyCountAssociationsMixin;
  // Users hasMany UsersTeams via userId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof Users {
    return sequelize.define(
      'Users',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        idirUserid: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_userid',
        },
        idirEmail: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: 'users_idir_email_key',
          field: 'idir_email',
        },
        additionalEmail: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'additional_email',
        },
        displayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'display_name',
        },
        hasReadGoldNotification: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: 'has_read_gold_notification',
        },
        surveySubmissions: {
          type: DataTypes.JSONB,
          allowNull: true,
          field: 'survey_submissions',
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
        tableName: 'users',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'users_idir_email_key',
            unique: true,
            fields: [{ name: 'idir_email' }],
          },
          {
            name: 'users_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof Users;
  }
}
