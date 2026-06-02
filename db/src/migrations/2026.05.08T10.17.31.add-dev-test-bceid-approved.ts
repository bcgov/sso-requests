import { DataTypes } from 'sequelize';

export const name = '2026.05.08T10.17.31.add-dev-test-bceid-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_bceid_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_bceid_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // Grandfather in applied clients that already use BCeID.
  await sequelize.query(`
    UPDATE requests
    SET dev_bceid_approved = true,
        test_bceid_approved = true
    WHERE status = 'applied'
      AND dev_idps::text[] && ARRAY['bceidbasic', 'bceidboth', 'bceidbusiness']::text[];
  `);
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_bceid_approved');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_bceid_approved');
};

export default { name, up, down };
