const { Op, DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('requests', { uses_team: false }, { uses_team: { [Op.eq]: null } });
  await sequelize.getQueryInterface().changeColumn('requests', 'uses_team', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'uses_team', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  });
};
