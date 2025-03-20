import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `BC Services Card integration disabled for Client ({{integration.projectName}})`;
const template = fs.readFileSync(__dirname + '/disable-bcsc-idp.html', 'utf8');

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
  const emails = [SSO_EMAIL_ADDRESS];
  const cc = [];
  if (process.env.APP_ENV === 'production' && integration.environments.includes('prod')) {
    cc.push(IDIM_EMAIL_ADDRESS);
  }

  return sendEmail({
    code: EMAILS.DISABLE_BCSC_IDP,
    to: emails,
    cc,
    ...rendered,
  });
};

export default { render, send };
