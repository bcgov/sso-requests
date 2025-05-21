import { authenticate } from '@/modules/authenticate';
import sequelize from '@/sequelize/config';

const mockedAuthenticate = authenticate as jest.Mock<any>;

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

const query =
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'";

// by default it truncates all the tables
export const cleanUpDatabaseTables = async (dropTables: boolean = false) => {
  let tableNames: any = await sequelize.query(query);
  tableNames = tableNames.map((v: any) => v[0]);
  for (const table of tableNames) {
    await sequelize.query(`${dropTables ? 'DROP' : 'TRUNCATE'} TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
};
