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
