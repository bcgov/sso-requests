import { DataTypes } from 'sequelize';

export const name = '2021.09.14T15.57.70.add-additional-emails.js';

// see https://sequelize.org/master/manual/naming-strategies.html
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
