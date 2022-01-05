export const isValidKeycloakURI = (uri: string) => {
  try {
    // Throws error if invalid url
    new URL(uri);
    if (uri !== uri.trim()) return false;
    if (uri.match(/\s/)) return false;
    if (!uri.match(/^[a-zA-Z]+?:\/\//)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

export const validationMessage =
  'Please enter a valid URI, including a prefix like http://, https://, or for custom URL schemes something like ionicApp:// ';

export const customValidate = (formData: any, errors: any) => {
  const {
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
    environments = [],
    test,
    prod,
    usesTeam,
    teamId,
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

  if (usesTeam && !teamId) {
    errors['createTeam'].addError('Please select or create a team');
  }
  return errors;
};

const validateArrayFields = (arrayValues: any, errors: any, key: string) => {
  arrayValues.forEach((value: any, i: number) => {
    if (!isValidKeycloakURI(value)) errors[key][i].addError(validationMessage);
  });
};
