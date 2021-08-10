const isValidKeycloakURI = (uri: string) => {
  try {
    const url = new URL(uri);
    if (uri !== uri.trim()) return false;
    return true;
  } catch (err) {
    return false;
  }
};

const validationMessage = 'Please enter a valid URI, including an http:// or https:// prefix';

export const customValidate = (formData: any, errors: any) => {
  const { devValidRedirectUris = [], testValidRedirectUris = [], prodValidRedirectUris = [] } = formData;
  let isAllValid = devValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.devValidRedirectUris.addError(validationMessage);

  isAllValid = testValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.testValidRedirectUris.addError(validationMessage);

  isAllValid = prodValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.prodValidRedirectUris.addError(validationMessage);

  return errors;
};
