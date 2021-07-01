import { Sequelize } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { sequelize } from '../../shared/sequelize/models/models';

export const migrator = new Umzug({
  migrations: {
    glob: ['migrations/*.js', { cwd: __dirname }],
  },
  context: sequelize,
  storage: new SequelizeStorage({
    sequelize,
  }),
  logger: console,
});
