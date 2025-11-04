import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Teams, TeamsId } from './Teams';
import type { Users, UsersId } from './Users';

export interface UsersTeamsAttributes {
  role: string;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  teamId: number;
  pending: boolean;
}

export type UsersTeamsPk = 'userId' | 'teamId';
export type UsersTeamsId = UsersTeams[UsersTeamsPk];
export type UsersTeamsOptionalAttributes = 'createdAt' | 'updatedAt' | 'pending';
export type UsersTeamsCreationAttributes = Optional<UsersTeamsAttributes, UsersTeamsOptionalAttributes>;

export class UsersTeams
  extends Model<UsersTeamsAttributes, UsersTeamsCreationAttributes>
  implements UsersTeamsAttributes
{
  role!: string;
  createdAt!: Date;
  updatedAt!: Date;
  userId!: number;
  teamId!: number;
  pending!: boolean;

  // UsersTeams belongsTo Teams via teamId
  team!: Teams;
  getTeam!: Sequelize.BelongsToGetAssociationMixin<Teams>;
  setTeam!: Sequelize.BelongsToSetAssociationMixin<Teams, TeamsId>;
  createTeam!: Sequelize.BelongsToCreateAssociationMixin<Teams>;
  // UsersTeams belongsTo Users via userId
  user!: Users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<Users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<Users, UsersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<Users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof UsersTeams {
    return sequelize.define(
      'UsersTeams',
      {
        role: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'users',
            key: 'id',
          },
          field: 'user_id',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'teams',
            key: 'id',
          },
          field: 'team_id',
        },
        pending: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
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
        tableName: 'users_teams',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'users_teams_pkey',
            unique: true,
            fields: [{ name: 'user_id' }, { name: 'team_id' }],
          },
        ],
      },
    ) as typeof UsersTeams;
  }
}
