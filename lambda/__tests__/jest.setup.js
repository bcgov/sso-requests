const { createImportSpecifier } = require('typescript');
const { sequelize, models } = require('../shared/sequelize/models/models');
process.env.GH_SECRET = 'test';
process.env.ALLOW_GOLD = true;

afterAll(async () => {
  return sequelize.close();
});
