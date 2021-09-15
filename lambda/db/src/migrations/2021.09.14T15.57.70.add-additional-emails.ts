const { DataTypes } = require('sequelize');

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
