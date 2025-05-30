import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';

const SUBJECT_TEMPLATE = `In-active IDIR User Removed From Team`;
const template = fs.readFileSync(__dirname + '/remove-inactive-idir-user-from-team.html', 'utf8');

const bodyHandler = Handlebars.compile(template, { noEscape: true });
const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });

export const render = async (originalData: any): Promise<RenderResult> => {
  const data = { ...originalData };
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: { emails: string[]; username: string; teamName: string }, rendered: RenderResult) => {
  const { emails } = data;
  return sendEmail({
    code: EMAILS.REMOVE_INACTIVE_IDIR_USER_FROM_TEAM,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
