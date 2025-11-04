import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Users, UsersId } from './Users';

export interface SurveysAttributes {
  id: number;
  userId: number;
  triggerEvent: string;
  message?: string;
  rating: number;
  createdAt: Date;
}

export type SurveysPk = 'id';
export type SurveysId = Surveys[SurveysPk];
export type SurveysOptionalAttributes = 'id' | 'message' | 'createdAt';
export type SurveysCreationAttributes = Optional<SurveysAttributes, SurveysOptionalAttributes>;

export class Surveys extends Model<SurveysAttributes, SurveysCreationAttributes> implements SurveysAttributes {
  id!: number;
  userId!: number;
  triggerEvent!: string;
  message?: string;
  rating!: number;
  createdAt!: Date;

  // Surveys belongsTo Users via userId
  user!: Users;
  getUser!: Sequelize.BelongsToGetAssociationMixin<Users>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<Users, UsersId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<Users>;

  static initModel(sequelize: Sequelize.Sequelize): typeof Surveys {
    return sequelize.define(
      'Surveys',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          field: 'user_id',
        },
        triggerEvent: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'trigger_event',
        },
        message: {
          type: DataTypes.STRING(700),
          allowNull: true,
        },
        rating: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'created_at',
          defaultValue: Sequelize.fn('now'),
        },
      },
      {
        tableName: 'surveys',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'surveys_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof Surveys;
  }
}
