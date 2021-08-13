const { sequelize, models } = require('../shared/sequelize/models/models');
process.env.GH_SECRET = 'test';

afterAll(async () => {
  await models.request.update({ status: 'draft' }, { where: {} });
  return sequelize.close();
});
