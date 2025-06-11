import { cleanUpDatabaseTables } from '@/tests/helpers/utils';
import sequelize from '@/sequelize/config';

afterAll(async () => {
  await cleanUpDatabaseTables();
  return sequelize.close();
});
