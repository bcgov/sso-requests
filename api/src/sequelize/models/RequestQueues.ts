import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface RequestQueuesAttributes {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  action: string;
  requestId?: number;
  request?: object;
  attempts: number;
}

export type RequestQueuesPk = 'id';
export type RequestQueuesId = RequestQueues[RequestQueuesPk];
export type RequestQueuesOptionalAttributes = 'id' | 'createdAt' | 'updatedAt' | 'requestId' | 'request' | 'attempts';
export type RequestQueuesCreationAttributes = Optional<RequestQueuesAttributes, RequestQueuesOptionalAttributes>;

export class RequestQueues
  extends Model<RequestQueuesAttributes, RequestQueuesCreationAttributes>
  implements RequestQueuesAttributes
{
  id!: number;
  createdAt!: Date;
  updatedAt!: Date;
  type!: string;
  action!: string;
  requestId?: number;
  request?: object;
  attempts!: number;

  static initModel(sequelize: Sequelize.Sequelize): typeof RequestQueues {
    return sequelize.define(
      'RequestQueues',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        type: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        action: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'request_id',
        },
        request: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        attempts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
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
        tableName: 'request_queues',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'request_queues_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof RequestQueues;
  }
}
