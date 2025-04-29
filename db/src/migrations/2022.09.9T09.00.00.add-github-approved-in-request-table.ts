import { DataTypes } from 'sequelize';

export const name = '2022.09.9T09.00.00.add-github-approved-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'github_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'github_approved');
};

export default { name, up, down };
