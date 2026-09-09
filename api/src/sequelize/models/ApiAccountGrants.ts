import * as Sequelize from 'sequelize';
import { DataTypes, Model } from 'sequelize';

export interface ApiAccountGrantsAttributes {
  id?: number;
  apiAccountId: number;
  teamId?: number | null;
  integrationId?: number | null;
  level: string;
  environment?: string | null;
}

export class ApiAccountGrants extends Model<ApiAccountGrantsAttributes> implements ApiAccountGrantsAttributes {
  id!: number;
  apiAccountId!: number;
  teamId!: number | null;
  integrationId!: number | null;
  level!: string;
  environment!: string | null;

  static initModel(sequelize: Sequelize.Sequelize): typeof ApiAccountGrants {
    return sequelize.define(
      'ApiAccountGrants',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        apiAccountId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'api_account_id',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'team_id',
        },
        integrationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'integration_id',
        },
        level: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        environment: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        tableName: 'api_account_grants',
        schema: 'public',
        underscored: true,
        timestamps: true,
      },
    ) as typeof ApiAccountGrants;
  }
}
