import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { User } from '@lambda-shared/interfaces';
import { processUser } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Pathfinder SSO request limit reached`;
const template = fs.readFileSync(__dirname + '/request-limit-exceeded.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  user: User;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { user } = originalData;
  const data = { ...originalData, user: await processUser(user) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  return sendEmail({
    code: EMAILS.REQUEST_LIMIT_EXCEEDED,
    to: [SSO_EMAIL_ADDRESS],
    cc: [],
    ...rendered,
  });
};

export default { render, send };
