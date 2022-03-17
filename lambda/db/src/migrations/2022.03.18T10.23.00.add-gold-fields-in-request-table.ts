import { DataTypes } from 'sequelize';

export const name = '2022.03.18T10.23.00.add-gold-fields-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'additional_emails', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'additionalEmails');
};

export default { name, up, down };
