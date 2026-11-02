import 'reflect-metadata';
import { cleanUpDatabaseTables } from './helpers/utils';
import sequelize from '../sequelize/config';

afterAll(async () => {
  await cleanUpDatabaseTables();
  return sequelize.close();
});
