import { FormValidation } from 'react-jsonschema-form';
import validate from 'react-jsonschema-form/lib/validate';
import { Integration } from '@app/interfaces/Request';

const isValidKeycloakURI = (isProd: boolean, uri: string) => {
  try {
    if (uri === '*') return !isProd;

    // Throws error if invalid url
    new URL(uri);
    if (uri !== uri.trim()) return false;
    if (uri.match(/\s|#/)) return false;
    if (!uri.match(/^[a-zA-Z][a-zA-Z-\.]*:\/\/\S+/)) return false;
    return true;
  } catch (err) {
    return false;
  }
};

export const isValidKeycloakURIDev = isValidKeycloakURI.bind(null, false);
export const isValidKeycloakURIProd = isValidKeycloakURI.bind(null, true);

const validationMessage = 'Please enter a valid URI';

export const customValidate = (formData: any, errors: FormValidation, fields?: string[]) => {
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
      const isAllValid = devValidRedirectUris.every(isValidKeycloakURIDev);
      if (!isAllValid) validateArrayFields(devValidRedirectUris, errors, 'devValidRedirectUris', isValidKeycloakURIDev);
    },
    testValidRedirectUris: () => {
      if (environments.includes('test')) {
        const isAllValid = testValidRedirectUris.every(isValidKeycloakURIDev);
        if (!isAllValid)
          validateArrayFields(testValidRedirectUris, errors, 'testValidRedirectUris', isValidKeycloakURIDev);
      }
    },
    prodValidRedirectUris: () => {
      if (environments.includes('prod')) {
        const isAllValid = prodValidRedirectUris.every(isValidKeycloakURIProd);
        if (!isAllValid)
          validateArrayFields(prodValidRedirectUris, errors, 'prodValidRedirectUris', isValidKeycloakURIProd);
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

const validateArrayFields = (arrayValues: any, errors: any, key: string, func: (val: string) => boolean) => {
  arrayValues.forEach((value: any, i: number) => {
    const valid = func(value);

    let hasError = false;

    if (i === 0 && !valid) {
      hasError = true;
    } else if (value !== '' && !valid) {
      hasError = true;
    }

    if (hasError) errors[key][i].addError(validationMessage);
  });
};

export const validateForm = (formData: Integration, schemas: any[], visited?: any) => {
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
