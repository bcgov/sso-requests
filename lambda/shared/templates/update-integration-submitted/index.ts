import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS, OCIO_EMAIL_ADDRESS, DIT_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import { usesBceid, usesGithub, usesDigitalCredential, usesBcServicesCard } from '@app/helpers/integration';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO change request submitted (email 1 of 2)`;
const template = fs.readFileSync(__dirname + '/update-integration-submitted.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  addingProd?: boolean;
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
  const { integration, addingProd } = data;
  const emails = await getIntegrationEmails(integration);
  const cc = [SSO_EMAIL_ADDRESS];
  if (usesBceid(integration) || usesBcServicesCard(integration)) cc.push(IDIM_EMAIL_ADDRESS);
  if (usesGithub(integration)) cc.push(OCIO_EMAIL_ADDRESS);
  if (usesDigitalCredential(integration) && addingProd) {
    cc.push(DIT_EMAIL_ADDRESS);
  }

  return sendEmail({
    code: EMAILS.UPDATE_INTEGRATION_SUBMITTED,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
