import * as fs from 'fs';
import Handlebars = require('handlebars');
import { processRequest } from '../helpers';
import { Data } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS, IDIM_EMAIL_ADDRESS } from '@lambda-shared/local';
import { EMAILS } from '@lambda-shared/enums';
import { getIntegrationEmails } from '../helpers';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `New BCeID Request ID {{integration.id}}`;
const template = fs.readFileSync(__dirname + '/create-integration-submitted-bceid-nonprod-idim.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: Data;
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
  return sendEmail({
    code: EMAILS.CREATE_INTEGRATION_SUBMITTED_BCEID_NONPROD_IDIM,
    to: [IDIM_EMAIL_ADDRESS],
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
