import { createMigrator } from './umzug';
import * as dotenv from 'dotenv';

dotenv.config();

const checkConnection = async () => {
  const { sequelize } = await import('@app/shared/sequelize/models/models');
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const main = async () => {
  let connectionRetries = 3;
  const retryInterval = 10000; // 10 seconds

  try {
    const migrator = await createMigrator();
    while (connectionRetries > 0) {
      try {
        await checkConnection();
        break; // Exit the loop if connection is successful
      } catch (error) {
        console.error('Database connection attempt failed. Retrying...', error);
        connectionRetries -= 1;
        if (connectionRetries === 0) {
          console.error('Max database connection attempts reached. Exiting...');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, retryInterval));
      }
    }
    await migrator.up();
  } catch (err) {
    console.log('errored out', err);
  }
};

main();
