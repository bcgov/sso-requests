import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

export const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const IDIM_EMAIL_ADDRESS = app_env === 'production' ? 'idim.consulting@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';

export const OCIO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const SOCIAL_APPROVAL_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const DIT_EMAIL_ADDRESS = 'ditrust@gov.bc.ca';

export const DIT_ADDITIONAL_EMAIL_ADDRESS = app_env === 'production' ? 'aaron.unger@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';

export const OTP_EMAIL_ADDRESS_CC =
  app_env === 'production' ? ['ditrust@gov.bc.ca', 'dt.support@gov.bc.ca'] : ['bcgov.sso@gov.bc.ca'];
export const OTP_EMAIL_ADDRESS_BCC = app_env === 'production' ? ['olena.mitovska@gov.bc.ca'] : ['bcgov.sso@gov.bc.ca'];
