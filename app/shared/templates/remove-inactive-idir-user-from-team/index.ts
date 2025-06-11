import * as fs from 'fs';
import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { getEmailTemplate } from '../helpers';

const SUBJECT_TEMPLATE = `In-active IDIR User Removed From Team`;
const template = getEmailTemplate('remove-inactive-idir-user-from-team/remove-inactive-idir-user-from-team.html');

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
