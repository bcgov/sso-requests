import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';
import { usesBceidProd, usesBcServicesCardProd } from '@app/helpers/integration';

const SUBJECT_TEMPLATE = `{{type}} Request ID {{integration.id}} approved and being processed (email 1 of 2)`;
const template = fs.readFileSync(__dirname + '/prod-approved.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
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

  return sendEmail({
    code: EMAILS.PROD_APPROVED,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
