import * as fs from 'fs';
import Handlebars from 'handlebars';
import { getEmailTemplate, processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { getIntegrationEmails } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO request restored`;
const template = getEmailTemplate('restore-integration/restore-integration.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  integration: IntegrationData;
  hasClientSecret: boolean;
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
  return sendEmail({
    code: EMAILS.CREATE_INTEGRATION_APPLIED,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
