import validate from 'react-jsonschema-form/lib/validate';
import { Request } from '@app/interfaces/Request';

export const isValidKeycloakURI = (uri: string) => {
  try {
    // Throws error if invalid url
    new URL(uri);
    if (uri !== uri.trim()) return false;
    if (uri.match(/\s/)) return false;
    if (!uri.match(/^[a-zA-Z]+:\/\/\S+/)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

const validationMessage = 'Please enter a valid URI, including an http:// or https:// prefix';

export const customValidate = (formData: any, errors: any, fields: string[]) => {
  const {
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
    environments = [],
    usesTeam,
    teamId,
  } = formData;

  const fieldMap: any = {
    devValidRedirectUris: () => {
      const isAllValid = devValidRedirectUris.every(isValidKeycloakURI);
      if (!isAllValid) validateArrayFields(devValidRedirectUris, errors, 'devValidRedirectUris');
    },
    testValidRedirectUris: () => {
      if (environments.includes('test')) {
        const isAllValid = testValidRedirectUris.every(isValidKeycloakURI);
        if (!isAllValid) validateArrayFields(testValidRedirectUris, errors, 'testValidRedirectUris');
      }
    },
    prodValidRedirectUris: () => {
      if (environments.includes('prod')) {
        const isAllValid = prodValidRedirectUris.every(isValidKeycloakURI);
        if (!isAllValid) validateArrayFields(prodValidRedirectUris, errors, 'prodValidRedirectUris');
      }
    },
    createTeam: () => {
      if (usesTeam && !teamId) {
        errors['createTeam'].addError('Please select or create a team');
      }
    },
  };

  if (!fields) fields = Object.keys(fieldMap);

  for (let x = 0; x < fields.length; x++) {
    const fn = fieldMap[fields[x]];
    if (fn) fn();
  }

  return errors;
};

export const createCustomValidate = (fields: string[]) => {
  return function (formData: any, errors: any) {
    return customValidate(formData, errors, fields);
  };
};

const validateArrayFields = (arrayValues: any, errors: any, key: string) => {
  arrayValues.forEach((value: any, i: number) => {
    if (!isValidKeycloakURI(value)) errors[key][i].addError(validationMessage);
  });
};

export const validateForm = (formData: Request, schemas: any[], visited?: any) => {
  const errors: any = {};
  schemas.forEach((schema, i) => {
    if (visited && !visited[i]) return;

    const hasCustomValidation = schema.customValidation && schema?.customValidation.length > 0;
    const { errors: err } = validate(
      formData,
      schema,
      hasCustomValidation ? createCustomValidate(schema.customValidation) : undefined,
    );
    if (err.length > 0) errors[i] = err;
  });

  return errors;
};
