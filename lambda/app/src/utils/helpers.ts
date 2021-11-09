import { Request } from '../interfaces/Request';
import validate from 'react-jsonschema-form/lib/validate';
import requesterSchema from '../schemas/requester-info';
import providerSchema from '../schemas/providers';
import termsAndConditionsSchema from '../schemas/terms-and-conditions';
import { isObject, omit, sortBy } from 'lodash';
import { customValidate } from './customValidate';
import { diff } from 'deep-diff';
import { Session, Data } from '../../../shared/interfaces';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';

export const omitNonFormFields = (data: Request) =>
  omit(data, [
    'updatedAt',
    'createdAt',
    'archived',
    'status',
    'bceidApproved',
    'environments',
    'actionNumber',
    'prNumber',
    'clientName',
    'idirUserid',
    'idirUserDisplayName',
    'id',
  ]);

const sortURIFields = (data: any) => {
  const sortedData = { ...data };
  const { devValidRedirectUris, testValidRedirectUris, prodValidRedirectUris } = data;
  sortedData.devValidRedirectUris = sortBy(devValidRedirectUris);
  sortedData.testValidRedirectUris = sortBy(testValidRedirectUris);
  sortedData.prodValidRedirectUris = sortBy(prodValidRedirectUris);
  return sortedData;
};

export const processRequest = (data: any) => {
  const immutableFields = ['idirUserid', 'projectLead', 'clientName', 'status'];
  const allowedRequest = omit(data, immutableFields);
  const sortedRequest = sortURIFields(allowedRequest);
  sortedRequest.environments = processEnvironments(sortedRequest);
  return sortedRequest;
};

const processEnvironments = (data: any) => {
  const environments = [];
  if (data.dev) environments.push('dev');
  if (data.test) environments.push('test');
  if (data.prod) environments.push('prod');
  return environments;
};

export const getDifferences = (newData: any, originalData: Request) => {
  const sortedNewData = sortURIFields(newData);
  return diff(omitNonFormFields(originalData), omitNonFormFields(sortedNewData));
};

export const validateRequest = (formData: any, original: Request, isUpdate = false) => {
  if (isUpdate) {
    const differences = getDifferences(formData, original);
    if (!differences) return { message: errorMessage };
  }

  const { errors: firstPageErrors } = validate(formData, requesterSchema);
  const { errors: secondPageErrors } = validate(formData, providerSchema, customValidate);
  const { errors: thirdPageErrors } = validate(formData, termsAndConditionsSchema);
  const allValid = firstPageErrors.length === 0 && secondPageErrors.length === 0 && thirdPageErrors.length === 0;
  if (allValid) return true;
  return {
    firstPageErrors,
    secondPageErrors,
    thirdPageErrors,
  };
};

// GH actions inputs expects an object where all values are strings
export const stringifyGithubInputs = (inputs: any) => {
  const stringifiedInputs = {};
  Object.entries(inputs).map(([key, value]) => {
    if (isObject(value) || Array.isArray(value)) {
      stringifiedInputs[key] = JSON.stringify(value);
    } else {
      stringifiedInputs[key] = String(value);
    }
  });

  return stringifiedInputs;
};

export const isAdmin = (session: Session) => session.client_roles?.includes('sso-admin');

export const realmToIDP = (realm?: string) => {
  let idps: string[] = [];
  if (realm === 'onestopauth') idps = ['idir'];
  if (realm === 'onestopauth-basic') idps = ['idir', 'bceid-basic'];
  if (realm === 'onestopauth-business') idps = ['idir', 'bceid-business'];
  if (realm === 'onestopauth-both') idps = ['idir', 'bceid-business', 'bceid-basic'];
  return idps;
};

export const formatBody = (request: Data, idirUserDisplayName: string) => {
  const testUris =
    request.testValidRedirectUris.length > 0 && request.testValidRedirectUris[0] !== ''
      ? `, TEST: ${request.testValidRedirectUris.join(', ')}`
      : '';
  return `
    <h1>Hello Pathfinder SSO friend,</h1>
    <p>
    You are receiving this email to summarize your BCeID prod integration request details.  The integration request will be completed by the Identity and Information Management (IDIM) team.
    </p>

    <strong>Integration request details: </strong>
    <ul>
      <li><strong>Project name:</strong> ${request.projectName}</li>
      <li><strong>Accountable person:</strong> ${idirUserDisplayName}</li>
      <li><strong>URIs (for dev and test):</strong> DEV: ${request.devValidRedirectUris.join(', ')}${testUris}</li>
      <li><strong>Identity Providers Required:</strong> ${realmToIDP(request.realm)}</li>
    </ul>

    <h2>Next Steps</h2>
    <ol>
      <li>The IDIM team will be in touch with you within the next 2 business days to schedule a meeting.</li>
      <li><strong>Please have answers to the questions below, before your meeting with the IDIM team.</strong></li>
    </ol>
    <ul>
      <li>What is your estimated volume of initial users?</li>
      <li>Do you anticipate your volume of users will grow over the next three years?</li>
      <li>When do you need access to the production environment by?</li>
      <li>When will your end users need access to the production environment?</li>
    </ul>

    Thank you,

    Pathfinder SSO team.

  `;
};
