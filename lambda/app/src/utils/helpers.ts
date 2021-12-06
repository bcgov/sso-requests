import { Request } from '../interfaces/Request';
import validate from 'react-jsonschema-form/lib/validate';
import requesterSchema from '../schemas/requester-info';
import providerSchema from '../schemas/providers';
import termsAndConditionsSchema from '../schemas/terms-and-conditions';
import { isObject, omit, sortBy } from 'lodash';
import { customValidate } from './customValidate';
import { diff } from 'deep-diff';
import { Session, Data } from '../../../shared/interfaces';
import { Op } from 'sequelize';
import { getEmailBody, getEmailSubject, EmailMessage } from '../../../shared/utils/templates';
import { sendEmail } from '../../../shared/utils/ches';

export const errorMessage = 'No changes submitted. Please change your details to update your integration.';

export const omitNonFormFields = (data: Request) =>
  omit(data, [
    'updatedAt',
    'createdAt',
    'archived',
    'status',
    'environments',
    'actionNumber',
    'prNumber',
    'clientName',
    'idirUserid',
    'idirUserDisplayName',
    'id',
  ]);

export type BceidEvent = 'submission' | 'deletion' | 'update';
const bceidRealms = ['onestopauth-basic', 'onestopauth-business', 'onestopauth-both'];
export const usesBceid = (realm: string | undefined) => {
  if (!realm) return false;
  return bceidRealms.includes(realm);
};

export const notifyIdim = async (request: Data, bceidEvent: BceidEvent) => {
  const { realm, id, preferredEmail, additionalEmails, environments } = request;
  if (!usesBceid(realm) || bceidEvent === 'update') return;
  const usesProd = environments.includes('prod');

  // Only cc user for production requests
  let cc = usesProd ? [preferredEmail] : [];
  if (Array.isArray(additionalEmails) && usesProd) cc = cc.concat(additionalEmails);

  let emailCode: EmailMessage;
  if (bceidEvent === 'submission' && usesProd) emailCode = 'bceid-idim-prod-submitted';
  else if (bceidEvent === 'submission') emailCode = 'bceid-idim-prod-submitted';
  else if (bceidEvent === 'deletion') emailCode = 'bceid-idim-deleted';
  else return;
  // const to = APP_ENV === 'production' ? ['bcgov.sso@gov.bc.ca', 'IDIM.Consulting@gov.bc.ca'] : ['bcgov.sso@gov.bc.ca'];
  const to = ['bcgov.sso@gov.bc.ca'];
  return sendEmail({
    to,
    cc,
    body: getEmailBody(emailCode, request),
    subject: getEmailSubject(emailCode, id),
    event: { emailCode, requestId: id },
  });
};

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
  Object.entries(inputs).forEach(([key, value]) => {
    if (isObject(value) || Array.isArray(value)) {
      stringifiedInputs[key] = JSON.stringify(value);
    } else {
      stringifiedInputs[key] = String(value);
    }
  });

  return stringifiedInputs;
};

export const isAdmin = (session: Session) => session.client_roles?.includes('sso-admin');

export const getWhereClauseForAllRequests = (data: {
  searchField: string[];
  searchKey: string;
  status?: string;
  archiveStatus?: string;
  realms?: string[];
  environments?: string[];
}) => {
  const where: any = {};
  const { searchField, searchKey, status = [], archiveStatus = [], realms, environments } = data;

  if (searchKey && searchField && searchField.length > 0) {
    where[Op.or] = [];
    searchField.forEach((field) => {
      if (field === 'id') {
        const id = Number(searchKey);
        if (!Number.isNaN(id)) where[Op.or].push({ id });
      } else {
        where[Op.or].push({ [field]: { [Op.iLike]: `%${searchKey}%` } });
      }
    });
  }

  if (status.length > 0) {
    where.status = {
      [Op.in]: status,
    };
  }

  if (archiveStatus.length === 1) {
    where.archived = archiveStatus[0] === 'archived';
  }

  if (realms)
    where.realm = {
      [Op.in]: realms,
    };

  if (environments)
    where.environments = {
      [Op.overlap]: environments,
    };

  return where;
};
