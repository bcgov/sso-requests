import { createMigrator } from './umzug';
import * as dotenv from 'dotenv';

dotenv.config();

export const main = async () => {
  try {
    const migrator = await createMigrator();
    await migrator.up();
  } catch (err) {
    console.log('errored out', err);
  }
};

main();
