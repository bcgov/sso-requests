import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Requests, RequestsId } from './Requests';

// The audit record. Columns match AUDIT_EVENT_COLUMNS in @sso/audit, which
// writes every row. None of the resource columns carries a foreign key, so an
// event outlives the request, team or organization it is about.
export interface EventsAttributes {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  eventCode: string;
  outcome: string;
  operationId?: string | null;
  parentOperationId?: string | null;
  requestId?: number | null;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  environment?: string | null;
  actorType: string;
  actorId?: string | null;
  idirUserid?: string | null;
  idirUserDisplayName?: string | null;
  reqId?: string | null;
  details?: object;
}

export type EventsPk = 'id';
export type EventsId = Events[EventsPk];
export type EventsOptionalAttributes =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'outcome'
  | 'operationId'
  | 'parentOperationId'
  | 'requestId'
  | 'teamId'
  | 'organizationId'
  | 'workflowId'
  | 'targetType'
  | 'targetId'
  | 'environment'
  | 'actorType'
  | 'actorId'
  | 'idirUserid'
  | 'idirUserDisplayName'
  | 'reqId'
  | 'details';
export type EventsCreationAttributes = Optional<EventsAttributes, EventsOptionalAttributes>;

export class Events extends Model<EventsAttributes, EventsCreationAttributes> implements EventsAttributes {
  id!: number;
  createdAt!: Date;
  updatedAt!: Date;
  eventCode!: string;
  outcome!: string;
  operationId?: string | null;
  parentOperationId?: string | null;
  requestId?: number | null;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  environment?: string | null;
  actorType!: string;
  actorId?: string | null;
  idirUserid?: string | null;
  idirUserDisplayName?: string | null;
  reqId?: string | null;
  details?: object;

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
        eventCode: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: 'event_code',
        },
        outcome: {
          type: DataTypes.STRING(16),
          allowNull: false,
          defaultValue: 'success',
          field: 'outcome',
        },
        operationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'operation_id',
        },
        parentOperationId: {
          type: DataTypes.UUID,
          allowNull: true,
          field: 'parent_operation_id',
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'request_id',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: true,
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
          field: 'workflow_id',
        },
        targetType: {
          type: DataTypes.STRING(32),
          allowNull: true,
          field: 'target_type',
        },
        targetId: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'target_id',
        },
        environment: {
          type: DataTypes.STRING(16),
          allowNull: true,
          field: 'environment',
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
        idirUserid: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_userid',
        },
        idirUserDisplayName: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: 'idir_user_display_name',
        },
        reqId: {
          type: DataTypes.STRING(64),
          allowNull: true,
          field: 'req_id',
        },
        details: {
          type: DataTypes.JSONB,
          allowNull: true,
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
