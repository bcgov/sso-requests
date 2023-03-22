import { DataTypes, Op } from 'sequelize';

export const name = '2023.03.17T11.00.00.add-saml-post-logout-uri';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_saml_logout_post_binding_uri', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_saml_logout_post_binding_uri', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_saml_logout_post_binding_uri', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_saml_logout_post_binding_uri');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_saml_logout_post_binding_uri');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_saml_logout_post_binding_uri');
};

export default { name, up, down };
