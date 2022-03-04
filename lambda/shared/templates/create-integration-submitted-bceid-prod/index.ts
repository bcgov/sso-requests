import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { Data } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getIntegrationEmails } from '../helpers';

const SUBJECT_TEMPLATE = `New BCeID Request ID {{request.id}}`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: Data;
  appUrl: string;
}

export const render = (originalData: DataProps) => {
  const { integration, appUrl } = originalData;
  const data = { integration: processRequest(integration), appUrl };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps) => {
  const { integration } = data;
  const emails = await getIntegrationEmails(integration);

  return sendEmail({
    to: emails,
    cc: [SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS],
    ...render(data),
  });
};

export default { render, send };
