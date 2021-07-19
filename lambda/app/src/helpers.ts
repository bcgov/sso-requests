import { FormattedData, Data } from '../../shared/interfaces';

// react-jsonschema-form is opinionated about schema shape defining data shape.
// this function reformats returned data to an easier to handle shape
// TODO: backend data validation
export const formatFormData = (data: Data): FormattedData => {
  const { devRedirectUrls = [], testRedirectUrls = [], prodRedirectUrls = [], ...rest } = data;

  const formattedEnvironments: string[] = [];
  if (devRedirectUrls.length > 0) formattedEnvironments.push('dev');
  if (testRedirectUrls.length > 0) formattedEnvironments.push('test');
  if (prodRedirectUrls.length > 0) formattedEnvironments.push('prod');

  const formattedValidRedirectUris = {
    dev: devRedirectUrls,
    test: testRedirectUrls,
    prod: prodRedirectUrls,
  };

  const newData: FormattedData = {
    environments: formattedEnvironments,
    validRedirectUris: formattedValidRedirectUris,
    ...rest,
  };
  return newData;
};
