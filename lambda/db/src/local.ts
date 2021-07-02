import { migrator } from './umzug';
import { models } from '../../shared/sequelize/models/models';

async function main() {
  await migrator.up();

  console.log(await models.Request.count());
}

main();
