import * as Sequelize from 'sequelize';
import { DataTypes, Model } from 'sequelize';

export interface OrganizationsAttributes {
  id?: number;
  name: string;
  description?: string | null;
}

export class Organizations extends Model<OrganizationsAttributes> implements OrganizationsAttributes {
  id!: number;
  name!: string;
  description!: string | null;

  static initModel(sequelize: Sequelize.Sequelize): typeof Organizations {
    return sequelize.define(
      'Organizations',
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        tableName: 'organizations',
        schema: 'public',
        underscored: true,
        timestamps: true,
      },
    ) as typeof Organizations;
  }
}
