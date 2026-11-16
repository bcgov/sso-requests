export const name = '2026.10.23T17.00.00.cascade-delete-surveys-on-user-delete';

export const up = async ({ context: sequelize }) => {
  await sequelize.query(`
    ALTER TABLE surveys
      DROP CONSTRAINT IF EXISTS surveys_user_id_fkey,
      ADD CONSTRAINT surveys_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  `);
};

export const down = async ({ context: sequelize }) => {
  await sequelize.query(`
    ALTER TABLE surveys
      DROP CONSTRAINT IF EXISTS surveys_user_id_fkey,
      ADD CONSTRAINT surveys_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id)
  `);
};

export default { name, up, down };
