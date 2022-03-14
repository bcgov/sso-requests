import { createMigrator } from '../lambda/db/src/umzug';

async function main() {
  const migrator = await createMigrator();
  await migrator.up();
  console.log('migration done');
}

main();
