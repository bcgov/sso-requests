import * as fs from 'fs';
import Handlebars from 'handlebars';
import { processRequest } from '../helpers';
import { IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `{{type}} Request ID {{integration.id}} transfer of ownership`;
const template = fs.readFileSync(
  `${process.cwd()}/shared/templates/orphan-integration/orphan-integration.html`,
  'utf8',
);

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

  return sendEmail({
    code: EMAILS.ORPHAN_INTEGRATION,
    to: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
