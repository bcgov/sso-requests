import { Request } from '../interfaces/Request';
import validate from 'react-jsonschema-form/lib/validate';
import requesterSchema from '../schemas/requester-info';
import providerSchema from '../schemas/providers';
import termsAndConditionsSchema from '../schemas/terms-and-conditions';
import { isObject } from 'lodash';
import { customValidate } from './customValidate';

type EmailMessage = 'delete' | 'update' | 'submit' | 'create';

export const validateRequest = (formData: Request) => {
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

export const getEmailBody = (requestNumber: number, messageType: EmailMessage) => {
  switch (messageType) {
    case 'delete':
      return `
      <h1>SSO request deletion</h1>
      <p>Your request to delete integration #${requestNumber} is successfully submitted</p>
      <p>Thanks,</p>
      <p>Pathfinder SSO Team</p>`;
    case 'update':
      return `
      <h1>SSO request update</h1>
      <p>Your updates for SSO request #${requestNumber} are successfully submitted. The expected processing time is 45 minutes.</p>
      <p>Once the updates have completed, you will receive an email from SSO Pathfinder Team letting you know that JSON Client Installation is ready.</p>
      <p>Thanks,</p>
      <p>Pathfinder SSO Team</p>
      `;
    case 'submit':
      return `
      <h1>SSO request submitted</h1>
      <p>Your SSO request #${requestNumber} is successfully submitted. The expected processing time is 45 minutes.</p>
      <p>Once the request is approved, you will receive an email from SSO Pathfinder Team letting you know that JSON Client Installation is ready.</p>
      <p>Thanks,</p>
      <p>Pathfinder SSO Team</p>
    `;
    default:
      return '';
  }
};

export const getEmailSubject = (messageType: EmailMessage) => {
  switch (messageType) {
    case 'delete':
      return 'SSO Request deleted';
    case 'update':
      return 'SSO Update Submitted';
    case 'submit':
      return 'SSO Request Submitted';
    default:
      return '';
  }
};
