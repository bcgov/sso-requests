import * as fs from 'fs';
import Handlebars = require('handlebars');
import { sendEmail } from '@lambda-shared/utils/ches';

const SUBJECT_TEMPLATE = `Invitation to join {{team.name}}`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  email: string;
  team: string;
  invitationLink: string;
  apiUrl: string;
}

export const render = (data: DataProps) => {
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps) => {
  const { email } = data;

  return sendEmail({
    to: [email],
    ...render(data),
  });
};

export default { render, send };
