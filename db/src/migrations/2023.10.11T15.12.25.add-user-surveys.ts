import { DataTypes } from 'sequelize';

export const name = '2023.10.11T15.12.25.add-user-surveys';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('surveys', {
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
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    triggerEvent: {
      type: DataTypes.ENUM('createRole', 'addUserToRole', 'cssApiRequest', 'createIntegration'),
      field: 'trigger_event',
      allow_null: false,
    },
    message: {
      type: DataTypes.STRING,
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
  });

  await sequelize.getQueryInterface().addColumn('users', 'survey_submissions', {
    type: DataTypes.JSONB,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users', 'survey_submissions');
  await sequelize.getQueryInterface().dropTable('surveys');
};

export default { name, up, down };
