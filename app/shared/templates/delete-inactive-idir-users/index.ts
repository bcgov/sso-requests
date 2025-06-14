import * as fs from 'fs';
import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { getIntegrationEmails, getEmailTemplate } from '../helpers';

const SUBJECT_TEMPLATE = `In-active IDIR User Removed`;
const template = getEmailTemplate('delete-inactive-idir-users/delete-inactive-idir-users.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

export const render = async (originalData: any): Promise<RenderResult> => {
  const data = { ...originalData };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: any, rendered: RenderResult) => {
  const emails = await getIntegrationEmails(data.integration);
  return sendEmail({
    code: EMAILS.DELETE_INACTIVE_IDIR_USER,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
