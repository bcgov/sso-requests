import * as fs from 'fs';
import Handlebars from 'handlebars';
import { getEmailTemplate, processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { IDIM_EMAIL_ADDRESS, SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `BC Services Card integration disabled for Client ({{integration.projectName}})`;
const template = getEmailTemplate('disable-bcsc-idp/disable-bcsc-idp.html');

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
  if (process.env.APP_ENV === 'production' && integration?.environments?.includes('prod')) {
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
