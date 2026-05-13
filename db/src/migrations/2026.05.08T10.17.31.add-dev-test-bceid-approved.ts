import { DataTypes } from 'sequelize';

export const name = '2026.05.08T10.17.31.add-dev-test-bceid-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_bceid_approved', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_bceid_approved', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  });

  // Grandfather in existing clients dev/test approvals
  await sequelize.getQueryInterface().bulkUpdate('requests', { dev_bceid_approved: true }, {});
  await sequelize.getQueryInterface().bulkUpdate('requests', { test_bceid_approved: true }, {});
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_bceid_approved');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_bceid_approved');
};

export default { name, up, down };
