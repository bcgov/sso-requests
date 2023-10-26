import { DataTypes } from 'sequelize';

export const name = '2023.10.26T10.13.85.add-vc-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'verified_credential_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'verified_credential_approved');
};

export default { name, up, down };
