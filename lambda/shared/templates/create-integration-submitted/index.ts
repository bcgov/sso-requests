import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest, resolveAttachmentPath, getIntegrationEmails } from '../helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import {
  SSO_EMAIL_ADDRESS,
  IDIM_EMAIL_ADDRESS,
  OCIO_EMAIL_ADDRESS,
  DIT_EMAIL_ADDRESS,
  DIT_ADDITIONAL_EMAIL_ADDRESS,
  SOCIAL_APPROVAL_EMAIL_ADDRESS,
} from '@lambda-shared/local';
import { EMAILS } from '@lambda-shared/enums';
import {
  usesGithub,
  usesBceidProd,
  usesBcServicesCardProd,
  usesDigitalCredentialProd,
  usesSocial,
} from '@app/helpers/integration';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO request submitted & additional important information (email 1 of 2)`;
const template = fs.readFileSync(__dirname + '/create-integration-submitted.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  waitingBceidProdApproval?: boolean;
  waitingGithubProdApproval?: boolean;
  waitingSocialProdApproval?: boolean;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration } = originalData;
  const data = { ...originalData, integration: await processRequest(integration) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration } = data;
  const emails = await getIntegrationEmails(integration);
  const cc = [SSO_EMAIL_ADDRESS];
  const attachments = [];
  if (usesBceidProd(integration) || usesBcServicesCardProd(integration)) cc.push(IDIM_EMAIL_ADDRESS);
  if (usesGithub(integration)) cc.push(OCIO_EMAIL_ADDRESS);
  if (usesSocial(integration)) {
    cc.push(SOCIAL_APPROVAL_EMAIL_ADDRESS);
    const filePath = resolveAttachmentPath('social-assessment.xlsx');
    const buffer = fs.readFileSync(filePath);
    attachments.push({
      content: buffer.toString('base64'),
      filename: 'self-assessment.xlsx',
      encoding: 'base64',
    });
  }
  if (usesDigitalCredentialProd(integration)) {
    cc.push(DIT_EMAIL_ADDRESS, DIT_ADDITIONAL_EMAIL_ADDRESS);
  }

  return sendEmail({
    code: EMAILS.CREATE_INTEGRATION_SUBMITTED,
    to: emails,
    cc,
    attachments,
    ...rendered,
  });
};

export default { render, send };
