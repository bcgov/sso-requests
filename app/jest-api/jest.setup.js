const { sequelize } = require('@app/shared/sequelize/models/models');
const { cleanUpDatabaseTables } = require('./helpers/utils');
require('./helpers/common-mocks');

process.env.GH_SECRET = 'test';
process.env.API_AUTH_SECRET = 'test';
process.env.NODE_ENV = 'development';
//process.env.NEXT_PUBLIC_INCLUDE_DIGITAL_CREDENTIAL = 'true';
// process.env.NEXT_PUBLIC_INCLUDE_BC_SERVICES_CARD = 'true';
// process.env.NEXT_PUBLIC_ALLOW_BC_SERVICES_CARD_PROD = 'true';
process.env.LOCAL_DEV = true;
process.env.VERIFY_USER_SECRET = 'test';

// Run integration sagas inline so API specs observe the final outcome within the request call.
process.env.WORKFLOW_EXECUTION_MODE = 'synchronous';
process.env.WORKFLOW_MAX_STEP_ATTEMPTS = '1';
process.env.WORKFLOW_RETRY_BASE_DELAY_MS = '0';
process.env.WORKFLOW_RETRY_MAX_DELAY_MS = '0';

beforeAll(async () => {
  await cleanUpDatabaseTables();
});

afterAll(async () => {
  await cleanUpDatabaseTables();
  return sequelize.close();
});
