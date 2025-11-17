import { DataTypes } from 'sequelize';

export const name = '2025.06.17T12.31.60.add-otp-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'otp_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'otp_approved');
};

export default { name, up, down };
