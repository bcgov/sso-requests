import { createMigrator } from '../lambda/db/src/umzug';

async function main() {
  const migrator = createMigrator();
  await migrator.up();
  console.log('migration done');
}

main();
