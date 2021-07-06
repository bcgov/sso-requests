import { FormattedData, Data } from '../../shared/interfaces';

const IdentityProviders = ['github', 'idir'];
const validEnvironments = ['dev', 'test', 'prod'];

// react-jsonschema-form is opinionated about schema shape defining data shape.
// this function reformats returned data to an easier to handle shape
// TODO: backend data validation
export const formatFormData = (data: Data): FormattedData => {
  const { identityProviders, environments, projectName } = data;
  const { devRedirectUrls = [], testRedirectUrls = [], prodRedirectUrls = [] } = environments;

  const formattedIdentityProviders = IdentityProviders.filter((key) => identityProviders[key]);
  const formattedEnvironments = validEnvironments
    .filter((key) => ['dev', 'test', 'prod'].includes(key))
    .filter((key) => environments[key]);

  const formattedValidRedirectUris = {
    dev: devRedirectUrls.map((data) => data.url),
    test: testRedirectUrls.map((data) => data.url),
    prod: prodRedirectUrls.map((data) => data.url),
  };

  const newData: FormattedData = {
    identityProviders: formattedIdentityProviders,
    environments: formattedEnvironments,
    validRedirectUrls: formattedValidRedirectUris,
    projectName,
  };
  return newData;
};
