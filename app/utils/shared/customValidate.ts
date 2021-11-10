export const isValidKeycloakURI = (uri: string) => {
  try {
    const url = new URL(uri);
    if (uri !== uri.trim()) return false;
    if (uri.match(/\s/)) return false;
    if (!uri.match(/^https?:\/\//)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

const validationMessage = 'Please enter a valid URI, including an http:// or https:// prefix';

export const customValidate = (formData: any, errors: any) => {
  const {
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
    environments = [],
    test,
    prod,
  } = formData;

  let isAllValid = devValidRedirectUris.every(isValidKeycloakURI);
  if (!isAllValid) validateArrayFields(devValidRedirectUris, errors, 'devValidRedirectUris');

  if (test || environments.includes('test')) {
    isAllValid = testValidRedirectUris.every(isValidKeycloakURI);
    if (!isAllValid) validateArrayFields(testValidRedirectUris, errors, 'testValidRedirectUris');
  }

  if (prod || environments.includes('prod')) {
    isAllValid = prodValidRedirectUris.every(isValidKeycloakURI);
    if (!isAllValid) validateArrayFields(prodValidRedirectUris, errors, 'prodValidRedirectUris');
  }

  return errors;
};

const validateArrayFields = (arrayValues: any, errors: any, key: string) => {
  arrayValues.forEach((value: any, i: number) => {
    if (!isValidKeycloakURI(value)) errors[key][i].addError(validationMessage);
  });
};
