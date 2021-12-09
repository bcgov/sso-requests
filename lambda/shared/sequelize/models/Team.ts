module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'team',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      underscored: true,
    },
  );
};
