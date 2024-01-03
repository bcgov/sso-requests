const init = (sequelize, DataTypes) => {
  return sequelize.define(
    'requestQueue',
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
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
