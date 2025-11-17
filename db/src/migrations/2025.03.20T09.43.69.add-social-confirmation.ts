import { DataTypes } from 'sequelize';

export const name = '2025.03.20T09.43.69.add-social-confirmation';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'confirm_social', {
    type: DataTypes.BOOLEAN,
  });
  await sequelize.getQueryInterface().addColumn('requests', 'social_approved', {
    type: DataTypes.BOOLEAN,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'confirm_social');
  await sequelize.getQueryInterface().removeColumn('requests', 'social_approved');
};

export default { name, up, down };
