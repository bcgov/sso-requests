import { authenticate } from '@lambda-app/authenticate';
import { AuthMock } from './types';
import { sequelize } from '@lambda-shared/sequelize/models/models';
import { sendEmail } from '@lambda-shared/utils/ches';

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

export const createMockAuth = (idir_userid: string, email: string, clientRoles: string[] = []) => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve({
      idir_userid,
      email,
      client_roles: clientRoles || [],
      given_name: '',
      family_name: '',
    });
  });
};

export const clearMockAuth = () => {
  mockedAuthenticate.mockImplementation(() => {
    return Promise.resolve(null);
  });
};

const mockedSendEmail = sendEmail as jest.Mock<any>;

export const createMockSendEmail = () => {
  const result = [];
  mockedSendEmail.mockImplementation((data: any) => {
    result.push(data);
    return Promise.resolve(null);
  });

  return result;
};

const query =
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";

// by default it truncates all the tables
export const cleanUpDatabaseTables = async (dropTables: boolean = false) => {
  let tableNames = await sequelize.query(query);
  tableNames = tableNames.map((v) => v[0]);
  for (const table of tableNames) {
    await sequelize.query(`${dropTables ? 'DROP' : 'TRUNCATE'} TABLE "${table}" CASCADE`);
  }
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
