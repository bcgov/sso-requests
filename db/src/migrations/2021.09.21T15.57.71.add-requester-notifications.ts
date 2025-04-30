import { DataTypes } from 'sequelize';

export const name = '2021.09.21T15.57.71.add-requester-notifications.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'has_unread_notifications', {
    type: DataTypes.BOOLEAN,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'has_unread_notifications');
};

export default { name, up, down };
