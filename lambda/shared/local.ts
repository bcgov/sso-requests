export const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const IDIM_EMAIL_ADDRESS =
  process.env.APP_ENV === 'production' ? 'idim.consulting@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';

export const OCIO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

export const DIT_EMAIL_ADDRESS = 'ditrust@gov.bc.ca';

export const DIT_ADDITIONAL_EMAIL_ADDRESS =
  process.env.APP_ENV === 'production' ? 'aaron.unger@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';
