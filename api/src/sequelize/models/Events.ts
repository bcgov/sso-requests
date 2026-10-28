import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Requests, RequestsId } from './Requests';

export interface EventsAttributes {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  requestId?: number;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  eventCode: string;
  idirUserid?: string;
  actorType: string;
  actorId?: string | null;
  details?: object;
  idirUserDisplayName?: string;
}

export type EventsPk = 'id';
export type EventsId = Events[EventsPk];
export type EventsOptionalAttributes =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'requestId'
  | 'teamId'
  | 'organizationId'
  | 'workflowId'
  | 'idirUserid'
  | 'actorType'
  | 'actorId'
  | 'details'
  | 'idirUserDisplayName';
export type EventsCreationAttributes = Optional<EventsAttributes, EventsOptionalAttributes>;

export class Events extends Model<EventsAttributes, EventsCreationAttributes> implements EventsAttributes {
  id!: number;
  createdAt!: Date;
  updatedAt!: Date;
  requestId?: number;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  eventCode!: string;
  idirUserid?: string;
  actorType!: string;
  actorId?: string | null;
  details?: object;
  idirUserDisplayName?: string;

  // Events belongsTo Requests via requestId
  request!: Requests;
  getRequest!: Sequelize.BelongsToGetAssociationMixin<Requests>;
  setRequest!: Sequelize.BelongsToSetAssociationMixin<Requests, RequestsId>;
  createRequest!: Sequelize.BelongsToCreateAssociationMixin<Requests>;

  static initModel(sequelize: Sequelize.Sequelize): typeof Events {
    return sequelize.define(
      'Events',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'requests',
            key: 'id',
          },
          field: 'request_id',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'teams', key: 'id' },
          onDelete: 'SET NULL',
          field: 'team_id',
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'organization_id',
        },
        workflowId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: { model: 'request_workflows', key: 'id' },
          onDelete: 'SET NULL',
          field: 'workflow_id',
        },
        eventCode: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'event_code',
        },
        idirUserid: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_userid',
        },
        actorType: {
          type: DataTypes.STRING(32),
          allowNull: false,
          defaultValue: 'user',
          field: 'actor_type',
        },
        actorId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'actor_id',
        },
        details: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        idirUserDisplayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_user_display_name',
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
        tableName: 'events',
        schema: 'public',
        timestamps: true,
        indexes: [
          {
            name: 'events_pkey',
            unique: true,
            fields: [{ name: 'id' }],
          },
        ],
      },
    ) as typeof Events;
  }
}
