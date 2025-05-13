import * as fs from 'fs';
import Handlebars from 'handlebars';
import { processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import {
  SSO_EMAIL_ADDRESS,
  DIT_EMAIL_ADDRESS,
  IDIM_EMAIL_ADDRESS,
  DIT_ADDITIONAL_EMAIL_ADDRESS,
  SOCIAL_APPROVAL_EMAIL_ADDRESS,
} from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { usesBcServicesCardProd, usesBceidProd, usesDigitalCredentialProd, usesSocial } from '@app/helpers/integration';

const SUBJECT_TEMPLATE = `Pathfinder SSO request approved (email 2 of 2)`;
const template = fs.readFileSync(
  `${process.cwd()}/shared/templates/create-integration-applied/create-integration-applied.html`,
  'utf8',
);

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  waitingBceidProdApproval?: boolean;
  hasBceid?: boolean;
  waitingGithubProdApproval?: boolean;
  waitingBcServicesCardProdApproval?: boolean;
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
  if (usesBceidProd(integration) || usesBcServicesCardProd(integration)) cc.push(IDIM_EMAIL_ADDRESS);
  if (usesSocial(integration)) cc.push(SOCIAL_APPROVAL_EMAIL_ADDRESS);
  if (usesDigitalCredentialProd(integration)) {
    cc.push(DIT_EMAIL_ADDRESS, DIT_ADDITIONAL_EMAIL_ADDRESS);
  }

  return sendEmail({
    code: EMAILS.CREATE_INTEGRATION_APPLIED,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
