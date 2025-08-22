import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface ApiUsageMetricsAttributes {
  id?: number;
  timestamp: Date;
  method: string;
  endpoint: string;
  teamId: number;
  statusCode: number;
  responseTimeMs: number;
}

export class ApiUsageMetrics extends Model<ApiUsageMetricsAttributes> implements ApiUsageMetricsAttributes {
  id!: number;
  timestamp!: Date;
  method!: string;
  endpoint!: string;
  teamId!: number;
  statusCode!: number;
  responseTimeMs!: number;

  static initModel(sequelize: Sequelize.Sequelize): typeof ApiUsageMetrics {
    return sequelize.define(
      'ApiUsageMetrics',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        timestamp: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
        method: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        endpoint: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'team_id',
        },
        statusCode: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'status_code',
        },
        responseTimeMs: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'response_time_ms',
        },
      },
      {
        tableName: 'api_usage_metrics',
        schema: 'public',
        timestamps: false,
        indexes: [
          {
            name: 'api_usage_metrics_endpoint',
            fields: [{ name: 'endpoint' }],
          },
          {
            name: 'api_usage_metrics_method',
            fields: [{ name: 'method' }],
          },
          {
            name: 'api_usage_metrics_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
          {
            name: 'api_usage_metrics_response_time_ms',
            fields: [{ name: 'response_time_ms' }],
          },
          {
            name: 'api_usage_metrics_status_code',
            fields: [{ name: 'status_code' }],
          },
          {
            name: 'api_usage_metrics_team_id',
            fields: [{ name: 'team_id' }],
          },
          {
            name: 'api_usage_metrics_timestamp',
            fields: [{ name: 'timestamp' }],
          },
        ],
      },
    ) as typeof ApiUsageMetrics;
  }
}
