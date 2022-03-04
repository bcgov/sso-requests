import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';
import { User } from '@lambda-shared/interfaces';

const SUBJECT_TEMPLATE = `Pathfinder SSO request limit reached`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  user: User;
}

export const render = (data: DataProps) => {
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps) => {
  return sendEmail({
    to: [SSO_EMAIL_ADDRESS],
    ...render(data),
  });
};

export default { render, send };
