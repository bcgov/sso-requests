import * as fs from 'fs';
import Handlebars from 'handlebars';
import { processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import {
  SSO_EMAIL_ADDRESS,
  IDIM_EMAIL_ADDRESS,
  OCIO_EMAIL_ADDRESS,
  DIT_ADDITIONAL_EMAIL_ADDRESS,
  DIT_EMAIL_ADDRESS,
} from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import {
  usesBceidProd,
  usesGithub,
  usesBcServicesCardProd,
  usesDigitalCredentialProd,
  usesDigitalCredential,
} from '@app/helpers/integration';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO integration ID {{integration.id}} deleted`;
const template = fs.readFileSync(
  `${process.cwd()}/shared/templates/delete-integration-submitted/delete-integration-submitted.html`,
  'utf8',
);

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  appUrl: string;
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
  if (usesGithub(integration)) cc.push(OCIO_EMAIL_ADDRESS);
  if (usesDigitalCredential(integration)) cc.push(DIT_EMAIL_ADDRESS);
  if (usesDigitalCredentialProd(integration)) cc.push(DIT_ADDITIONAL_EMAIL_ADDRESS);

  return sendEmail({
    code: EMAILS.DELETE_INTEGRATION_SUBMITTED,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
