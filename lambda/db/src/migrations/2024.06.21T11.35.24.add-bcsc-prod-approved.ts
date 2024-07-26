import { DataTypes } from 'sequelize';

export const name = '2024.06.21T11.35.24.add-bcsc-prod-approved';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'bc_services_card_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'bc_services_card_approved');
};

export default { name, up, down };
