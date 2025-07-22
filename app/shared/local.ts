const { EMAIL_ADDRESSES } = process.env;

let parsedAddresses = {};

try {
    parsedAddresses = JSON.parse(EMAIL_ADDRESSES || '{}');
} catch {
    parsedAddresses = {}
}

export const {
    SSO_EMAIL_ADDRESS = "",
    IDIM_EMAIL_ADDRESS = "",
    OTP_EMAIL_ADDRESS_CC = "",
    OTP_EMAIL_ADDRESS_BCC = "",
    OCIO_EMAIL_ADDRESS = "",
    SOCIAL_APPROVAL_EMAIL_ADDRESS = "",
    DIT_EMAIL_ADDRESS = "",
    DIT_ADDITIONAL_EMAIL_ADDRESS = "",
} = parsedAddresses as any;

// export const SSO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

// export const IDIM_EMAIL_ADDRESS = app_env === 'production' ? 'idim.consulting@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';

// export const OTP_EMAIL_ADDRESS_CC =
//   app_env === 'production' ? ['dt.support@gov.bc.ca', 'ditrust@gov.bc.ca'] : ['bcgov.sso@gov.bc.ca'];
// export const OTP_EMAIL_ADDRESS_BCC =
//   app_env === 'production' ? ['jonathan-langlois@live.ca'] : ['jonathan-langlois@live.ca'];

// export const OCIO_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

// export const SOCIAL_APPROVAL_EMAIL_ADDRESS = 'bcgov.sso@gov.bc.ca';

// export const DIT_EMAIL_ADDRESS = 'ditrust@gov.bc.ca';

// export const DIT_ADDITIONAL_EMAIL_ADDRESS = app_env === 'production' ? 'aaron.unger@gov.bc.ca' : 'bcgov.sso@gov.bc.ca';
