import { DataTypes } from 'sequelize';

export const name = '2026.09.22T02.33.00.add-bcgov-unit-description-requests-table';

// Durable store for the integration submission workflow. Workflow + step state must survive a pod
// restart mid-flight, so every transition is written here before any side effect is attempted.
export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('bcgov_units', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.createTable('divisions', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bcgov_unit_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'bcgov_units',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await sequelize.getQueryInterface().addColumn('requests', 'bcgov_unit_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'division_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'description', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.removeColumn('requests', 'description');
  await queryInterface.removeColumn('requests', 'division_id');
  await queryInterface.removeColumn('requests', 'bcgov_unit_id');

  await queryInterface.dropTable('divisions');
  await queryInterface.dropTable('bcgov_units');
};
