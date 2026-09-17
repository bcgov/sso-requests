import * as Sequelize from 'sequelize';
import { DataTypes, Model } from 'sequelize';
import { Permission } from '@sso/authz';

// A per-integration cap under one link. It is intersected with the link when
// authority is resolved, so it can only narrow.
export interface OrganizationIntegrationOverridesAttributes {
  id?: number;
  organizationTeamId: number;
  requestId: number;
  permissions: Permission[];
}

export class OrganizationIntegrationOverrides
  extends Model<OrganizationIntegrationOverridesAttributes>
  implements OrganizationIntegrationOverridesAttributes
{
  id!: number;
  organizationTeamId!: number;
  requestId!: number;
  permissions!: Permission[];

  static initModel(sequelize: Sequelize.Sequelize): typeof OrganizationIntegrationOverrides {
    return sequelize.define(
      'OrganizationIntegrationOverrides',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        organizationTeamId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'organization_team_id',
        },
        requestId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'request_id',
        },
        permissions: {
          type: DataTypes.ARRAY(DataTypes.TEXT),
          allowNull: false,
          defaultValue: [],
        },
      },
      {
        tableName: 'organization_integration_overrides',
        schema: 'public',
        underscored: true,
        timestamps: true,
      },
    ) as typeof OrganizationIntegrationOverrides;
  }
}
