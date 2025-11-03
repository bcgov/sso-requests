import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface BcscClientsAttributes {
  id: number;
  clientId: string;
  clientSecret: string;
  registrationAccessToken: string;
  environment: string;
  clientName: string;
  archived: boolean;
  requestId: number;
  createdAt: Date;
  updatedAt: Date;
}

export type BcscClientsPk = 'id';
export type BcscClientsId = BcscClients[BcscClientsPk];
export type BcscClientsOptionalAttributes = 'id' | 'createdAt' | 'updatedAt';
export type BcscClientsCreationAttributes = Optional<BcscClientsAttributes, BcscClientsOptionalAttributes>;

export class BcscClients
  extends Model<BcscClientsAttributes, BcscClientsCreationAttributes>
  implements BcscClientsAttributes
{
  id!: number;
  clientId!: string;
  clientSecret!: string;
  registrationAccessToken!: string;
  environment!: string;
  clientName!: string;
  archived!: boolean;
  requestId!: number;
  createdAt!: Date;
  updatedAt!: Date;

  static initModel(sequelize: Sequelize.Sequelize): typeof BcscClients {
    return sequelize.define(
      'BcscClients',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        clientId: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'client_id',
        },
        clientSecret: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'client_secret',
        },
        registrationAccessToken: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'registration_access_token',
        },
        environment: {
          type: DataTypes.TEXT,
          allowNull: false,
          unique: 'bcsc_clients_request_id_environment_uk',
        },
        clientName: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'client_name',
        },
        archived: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          unique: 'bcsc_clients_request_id_environment_uk',
          field: 'request_id',
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
        tableName: 'bcsc_clients',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'bcsc_clients_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
          {
            name: 'bcsc_clients_request_id_environment_uk',
            unique: true,
            fields: [{ name: 'request_id' }, { name: 'environment' }],
          },
        ],
      },
    ) as typeof BcscClients;
  }
}
