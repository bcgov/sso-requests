const init = (sequelize, DataTypes) => {
  return sequelize.define(
    'requestQueue',
    {
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      request: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      underscored: true,
    },
  );
};

export default init;
