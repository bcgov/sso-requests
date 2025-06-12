import { DataTypes } from 'sequelize';

export const name = '2023.10.12T15.10.00.add-saml-sign-assertions';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_saml_sign_assertions', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_saml_sign_assertions', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_saml_sign_assertions', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_saml_sign_assertions');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_saml_sign_assertions');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_saml_sign_assertions');
};

export default { name, up, down };
