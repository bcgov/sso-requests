const init = (sequelize, DataTypes) => {
  const Survey = sequelize.define(
    'survey',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        defaultValue: sequelize.UUIDV4,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        field: 'user_id',
        allow_null: false,
        references: { model: 'users', key: 'id' },
      },
      triggerEvent: {
        type: DataTypes.ENUM('createRole', 'addUserToRole', 'cssApiRequest', 'createIntegration'),
        field: 'trigger_event',
        allow_null: false,
      },
      message: {
        type: DataTypes.STRING(700),
        field: 'message',
        allowNull: true,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      underscored: true,
      timestamps: false, // Do not need an updated_at field
    },
  );

  return Survey;
};

export default init;
