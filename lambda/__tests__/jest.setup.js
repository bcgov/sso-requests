const { createImportSpecifier } = require('typescript');
const { sequelize, models } = require('../shared/sequelize/models/models');
require('./helpers/common-mocks');

process.env.GH_SECRET = 'test';
process.env.API_AUTH_SECRET = 'test';
process.env.NODE_ENV = 'development';
process.env.INCLUDE_DIGITAL_CREDENTIAL = true;
process.env.INCLUDE_BC_SERVICES_CARD = true;
process.env.ALLOW_BC_SERVICES_CARD_PROD = true;
process.env.LOCAL_DEV = true;

afterAll(async () => {
  return sequelize.close();
});
