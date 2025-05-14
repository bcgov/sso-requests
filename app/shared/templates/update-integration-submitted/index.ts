import * as fs from 'fs';
import Handlebars from 'handlebars';
import { getEmailTemplate, processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { getReadableIntegrationDiff, sendEmail } from '@app/utils/ches';
import {
  SSO_EMAIL_ADDRESS,
  IDIM_EMAIL_ADDRESS,
  OCIO_EMAIL_ADDRESS,
  DIT_EMAIL_ADDRESS,
  DIT_ADDITIONAL_EMAIL_ADDRESS,
  SOCIAL_APPROVAL_EMAIL_ADDRESS,
} from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import {
  usesGithub,
  usesBcServicesCardProd,
  usesBceidProd,
  usesDigitalCredentialProd,
  usesDigitalCredential,
  usesSocial,
} from '@app/helpers/integration';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO change request submitted (email 1 of 2)`;
const template = getEmailTemplate('update-integration-submitted/update-integration-submitted.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  addingProd?: boolean;
  changes?: any;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration } = originalData;
  const readableDiff = getReadableIntegrationDiff(originalData.changes);
  const data = { ...originalData, integration: await processRequest(integration), changes: readableDiff };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration, addingProd } = data;
  const emails = await getIntegrationEmails(integration);
  const attachments = [];
  const resettingBceidApproval = data.changes?.some(
    (change: any) => change.path[0] === 'bceidApproved' && change.lhs === true && change.rhs === false,
  );
  const cc = [SSO_EMAIL_ADDRESS];
  if (usesBceidProd(integration) || usesBcServicesCardProd(integration) || resettingBceidApproval)
    cc.push(IDIM_EMAIL_ADDRESS);
  if (usesGithub(integration)) cc.push(OCIO_EMAIL_ADDRESS);
  if (usesDigitalCredential(integration) && addingProd) {
    cc.push(DIT_EMAIL_ADDRESS);
  }
  if (usesDigitalCredentialProd(integration)) cc.push(DIT_ADDITIONAL_EMAIL_ADDRESS);
  if (usesSocial(integration)) {
    cc.push(SOCIAL_APPROVAL_EMAIL_ADDRESS);
    const buffer = fs.readFileSync(`${process.cwd()}/shared/templates/attachments/social-assessment.xlsx`);
    attachments.push({
      content: buffer.toString('base64'),
      filename: 'self-assessment.xlsx',
      encoding: 'base64',
    });
  }

  return sendEmail({
    code: EMAILS.UPDATE_INTEGRATION_SUBMITTED,
    to: emails,
    cc,
    attachments,
    ...rendered,
  });
};

export default { render, send };
