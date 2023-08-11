import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { getTeamEmails } from '../helpers';

const SUBJECT_TEMPLATE = `In-active IDIR User Removed`;
const template = fs.readFileSync(__dirname + '/delete-inactive-idir-users.html', 'utf8');

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
  const emails = await getTeamEmails(data.teamId);
  return sendEmail({
    code: EMAILS.DELETE_INACTIVE_IDIR_USER,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
