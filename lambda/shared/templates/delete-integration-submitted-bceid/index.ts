import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `BCeID Integration ID {{integration.id}} deleted`;
const template = fs.readFileSync(__dirname + '/delete-integration-submitted-bceid.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  appUrl: string;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { integration, appUrl } = originalData;
  const data = {
    integration: await processRequest(integration),
    emails: (await getIntegrationEmails(integration, true)).join(', '),
    appUrl,
  };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { integration } = data;
  const emails = await getIntegrationEmails(integration);

  return sendEmail({
    code: EMAILS.DELETE_INTEGRATION_SUBMITTED_BCEID,
    to: [SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS],
    cc: emails,
    ...rendered,
  });
};

export default { render, send };
