const init = (sequelize, DataTypes) => {
  return sequelize.define(
    'requestRole',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      environment: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'requests', key: 'id' },
      },
      composite: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      composite_roles: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
      },
      createdBy: {
        type: DataTypes.INTEGER,
        field: 'created_by',
        allowNull: false,
      },
      lastUpdatedBy: {
        type: DataTypes.INTEGER,
        field: 'last_updated_by',
        allowNull: false,
      },
    },
    {
      underscored: true,
    },
  );
};

export default init;
