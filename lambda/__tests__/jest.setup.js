const { createImportSpecifier } = require('typescript');
const { sequelize, models } = require('../shared/sequelize/models/models');
process.env.GH_SECRET = 'test';

afterAll(async () => {
  return sequelize.close();
});
