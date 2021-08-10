import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../../shared/sequelize/models/models';

export const createMigrator = (logger?: any) => {
  const migrator = new Umzug({
    migrations: {
      glob: ['migrations/*.{js,ts}', { cwd: __dirname }],
    },
    context: sequelize,
    storage: new SequelizeStorage({
      sequelize,
    }),
    logger: logger || console,
  });

  return migrator;
};
