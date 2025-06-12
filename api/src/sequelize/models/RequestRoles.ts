import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Requests, RequestsId } from './Requests';

export interface RequestRolesAttributes {
  id: number;
  name: string;
  environment: string;
  createdAt: Date;
  updatedAt: Date;
  requestId: number;
  composite: boolean;
  compositeRoles: number[];
  createdBy?: number;
  lastUpdatedBy?: number;
}

export type RequestRolesPk = 'id';
export type RequestRolesId = RequestRoles[RequestRolesPk];
export type RequestRolesOptionalAttributes =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'compositeRoles'
  | 'createdBy'
  | 'lastUpdatedBy';
export type RequestRolesCreationAttributes = Optional<RequestRolesAttributes, RequestRolesOptionalAttributes>;

export class RequestRoles
  extends Model<RequestRolesAttributes, RequestRolesCreationAttributes>
  implements RequestRolesAttributes
{
  id!: number;
  name!: string;
  environment!: string;
  createdAt!: Date;
  updatedAt!: Date;
  requestId!: number;
  composite!: boolean;
  compositeRoles!: number[];
  createdBy?: number;
  lastUpdatedBy?: number;

  // RequestRoles belongsTo Requests via requestId
  request!: Requests;
  getRequest!: Sequelize.BelongsToGetAssociationMixin<Requests>;
  setRequest!: Sequelize.BelongsToSetAssociationMixin<Requests, RequestsId>;
  createRequest!: Sequelize.BelongsToCreateAssociationMixin<Requests>;

  static initModel(sequelize: Sequelize.Sequelize): typeof RequestRoles {
    return sequelize.define(
      'RequestRoles',
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
        environment: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'requests',
            key: 'id',
          },
          field: 'request_id',
        },
        composite: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        compositeRoles: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: false,
          defaultValue: [],
          field: 'composite_roles',
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'created_by',
        },
        lastUpdatedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'last_updated_by',
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
        tableName: 'request_roles',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'request_roles_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
          {
            name: 'unique_name_env_requestid',
            unique: true,
            fields: [{ name: 'name' }, { name: 'environment' }, { name: 'request_id' }],
          },
        ],
      },
    ) as typeof RequestRoles;
  }
}
