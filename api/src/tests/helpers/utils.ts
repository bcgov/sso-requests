import { authenticate } from '@/modules/authenticate';
import sequelize from '@/sequelize/config';
import { assertAuditInvariants } from '../../../../packages/audit/test-support/invariants';

// Checked before every wipe, so a code path that leaves the audit record inconsistent fails the test that ran
// it. A test that breaks an invariant on purpose (an audit write it makes fail) says so first.
let invariantsWaived = false;
export const waiveAuditInvariantsOnce = () => {
  invariantsWaived = true;
};

const checkAuditInvariants = async () => {
  if (invariantsWaived) {
    invariantsWaived = false;
    return;
  }
  await assertAuditInvariants(async (sql) => (await sequelize.query(sql))[0] as unknown[]);
};

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
  // Wipe whatever the check finds, so one broken file does not leave its rows to fail the next.
  const broken = await checkAuditInvariants().catch((err) => err);
  let tableNames: any = await sequelize.query(query);
  tableNames = tableNames.map((v: any) => v[0]);
  for (const table of tableNames) {
    await sequelize.query(`${dropTables ? 'DROP' : 'TRUNCATE'} TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
  if (broken) throw broken;
};
