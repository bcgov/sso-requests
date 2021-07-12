import { createMigrator } from './umzug';
import { sequelize, models } from '../../shared/sequelize/models/models';

async function main() {
  const migrator = createMigrator();
  await migrator.up();

  console.log(await models.request.count());

  const result = await models.request.create({
    idirUserid: '1',
    projectName: 'testproject',
    identityProviders: [],
    validRedirectUrls: [],
    environments: [],
  });

  console.log(result);

  const projects = await sequelize.query('SELECT * FROM requests');
  console.log(projects);
}

main();
