import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { app_env } = publicRuntimeConfig;

export const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const IDIM_EMAIL_ADDRESS = app_env === 'production' ? 'idim.consulting@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';

export const OCIO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const SOCIAL_APPROVAL_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const DIT_EMAIL_ADDRESS = 'ditrust@gov.bc.ca';

export const DIT_ADDITIONAL_EMAIL_ADDRESS = app_env === 'production' ? 'aaron.unger@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';
