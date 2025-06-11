export const name = '2023.11.01T13.26.56.update-vc-name';

export const up = async ({ context: sequelize }) => {
  await sequelize
    .getQueryInterface()
    .renameColumn('requests', 'verifiable_credential_approved', 'digital_credential_approved');
};

export const down = async ({ context: sequelize }) => {
  await sequelize
    .getQueryInterface()
    .renameColumn('requests', 'digital_credential_approved', 'verifiable_credential_approved');
};

export default { name, up, down };
