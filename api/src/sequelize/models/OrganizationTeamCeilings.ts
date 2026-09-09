import * as Sequelize from 'sequelize';
import { DataTypes, Model } from 'sequelize';

export interface OrganizationTeamCeilingsAttributes {
  id?: number;
  organizationTeamId: number;
  integrationId?: number | null;
  level: string;
  environment?: string | null;
}

export class OrganizationTeamCeilings
  extends Model<OrganizationTeamCeilingsAttributes>
  implements OrganizationTeamCeilingsAttributes
{
  id!: number;
  organizationTeamId!: number;
  integrationId!: number | null;
  level!: string;
  environment!: string | null;

  static initModel(sequelize: Sequelize.Sequelize): typeof OrganizationTeamCeilings {
    return sequelize.define(
      'OrganizationTeamCeilings',
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
        tableName: 'organization_team_ceilings',
        schema: 'public',
        underscored: true,
        timestamps: true,
      },
    ) as typeof OrganizationTeamCeilings;
  }
}
