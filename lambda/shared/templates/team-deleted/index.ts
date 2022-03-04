import * as fs from 'fs';
import Handlebars = require('handlebars');
import { Team } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { getTeamEmails } from '../helpers';

const SUBJECT_TEMPLATE = `Team {{team.name}} has been removed by a team admin`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  team: Team;
  appUrl: string;
}

export const render = (data: DataProps) => {
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps) => {
  const { team } = data;
  const emails = await getTeamEmails(team.id, ['admin']);

  return sendEmail({
    to: emails,
    ...render(data),
  });
};

export default { render, send };
