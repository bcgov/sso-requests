import { sequelize } from '@app/shared/sequelize/models/models';

const query =
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";

// by default it truncates all the tables
export const cleanUpDatabaseTables = async (dropTables: boolean = false) => {
  console.log('Starting DB cleanup...');
  const tableNames = [
    'users_teams',
    'events',
    'users',
    'requests',
    'SequelizeMeta',
    'surveys',
    'request_roles',
    'bcsc_clients',
    'teams',
    'request_queues',
  ];
  for (const table of tableNames) {
    await sequelize.query(`${dropTables ? 'DROP' : 'TRUNCATE'} TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
  console.log('DB cleanup completed!');
};

export const activateTeamPendingUsers = async (teamId: number) => {
  try {
    await sequelize.query(`UPDATE users_teams SET pending=false where team_id=${teamId} and pending=true`);
    return true;
  } catch (err) {
    console.error('error updating team user status', err);
    return false;
  }
};

export const generateRandomName = (length: number = 6) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let randomName = '';
  for (let i = 0; i < length; i++) {
    randomName += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return randomName;
};
