import { createMigrator } from './umzug';
import * as dotenv from 'dotenv';

dotenv.config();

export const main = async () => {
  const logs = [];
  const logger = {
    info: (...data) => {
      logs.push(JSON.stringify(data, null, 2));
    },
  };

  try {
    const migrator = await createMigrator(logger);
    await migrator.up();

    const response = {
      statusCode: 200,
      headers: { time: new Date() },
      body: { success: true, logs },
    };
  } catch (err) {
    console.log('errored out', err);

    const response = {
      statusCode: 422,
      headers: { time: new Date() },
      body: { success: false },
    };
  }
};

main();
