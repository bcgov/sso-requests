const { sequelize } = require('@app/shared/sequelize/models/models');
const { cleanUpDatabaseTables } = require('./helpers/utils');
require('./helpers/common-mocks');

process.env.GH_SECRET = 'test';
process.env.API_AUTH_SECRET = 'test';
process.env.NODE_ENV = 'development';
process.env.INCLUDE_DIGITAL_CREDENTIAL = true;
process.env.INCLUDE_BC_SERVICES_CARD = true;
process.env.ALLOW_BC_SERVICES_CARD_PROD = true;
process.env.LOCAL_DEV = true;
process.env.VERIFY_USER_SECRET = 'test';
process.env.EMAIL_ADDRESSES = `{
    "SSO_EMAIL_ADDRESS": "SSO_EMAIL_ADDRESS@address.com",
    "IDIM_EMAIL_ADDRESS": "IDIM_EMAIL_ADDRESS@address.com",
    "OTP_EMAIL_ADDRESS_CC": ["OTP_EMAIL_ADDRESS_CC@address.com"],
    "OTP_EMAIL_ADDRESS_BCC": ["OTP_EMAIL_ADDRESS_BCC@address.com"],
    "OCIO_EMAIL_ADDRESS": "OCIO_EMAIL_ADDRESS@address.com",
    "DIT_EMAIL_ADDRESS":"DIT_EMAIL_ADDRESS@address.com",
    "DIT_ADDITIONAL_EMAIL_ADDRESS": "DIT_ADDITIONAL_EMAIL_ADDRESS@address.com",
    "SOCIAL_APPROVAL_EMAIL_ADDRESS": "SOCIAL_APPROVAL_EMAIL_ADDRESS@address.com"
}`;

beforeAll(async () => {
  await cleanUpDatabaseTables();
});

afterAll(async () => {
  await cleanUpDatabaseTables();
  return sequelize.close();
});
