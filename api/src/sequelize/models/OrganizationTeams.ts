import * as Sequelize from 'sequelize';
import { DataTypes, Model } from 'sequelize';

export interface OrganizationTeamsAttributes {
  id?: number;
  organizationId: number;
  teamId: number;
  pending?: boolean;
  invitedBy?: number | null;
}

export class OrganizationTeams extends Model<OrganizationTeamsAttributes> implements OrganizationTeamsAttributes {
  id!: number;
  organizationId!: number;
  teamId!: number;
  pending!: boolean;
  invitedBy!: number | null;

  static initModel(sequelize: Sequelize.Sequelize): typeof OrganizationTeams {
    return sequelize.define(
      'OrganizationTeams',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        organizationId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'organization_id',
        },
        teamId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'team_id',
        },
        pending: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        invitedBy: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'invited_by',
        },
      },
      {
        tableName: 'organization_teams',
        schema: 'public',
        underscored: true,
        timestamps: true,
      },
    ) as typeof OrganizationTeams;
  }
}
