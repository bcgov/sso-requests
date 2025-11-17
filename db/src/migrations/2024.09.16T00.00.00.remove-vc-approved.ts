import { DataTypes } from 'sequelize';

export const name = '2024.09.16T00.00.00.remove-vc-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'digital_credential_approved');
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'digital_credential_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export default { name, up, down };
