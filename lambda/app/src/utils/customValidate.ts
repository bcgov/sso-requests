const isValidKeycloakURI = (uri: string) => {
  try {
    const url = new URL(uri);
    return true;
  } catch (err) {
    return false;
  }
};

export const customValidate = (formData: any, errors: any) => {
  const { devValidRedirectUris = [], testValidRedirectUris = [], prodValidRedirectUris = [] } = formData;
  let isAllValid = devValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.devValidRedirectUris.addError('Please enter a valid URI');

  isAllValid = testValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.testValidRedirectUris.addError('Please enter a valid URI');

  isAllValid = prodValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) errors.prodValidRedirectUris.addError('Please enter a valid URI');

  return errors;
};
