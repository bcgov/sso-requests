import * as fs from 'fs';
import Handlebars = require('handlebars');
import { Team, User } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { getTeamEmails } from '../helpers';

const SUBJECT_TEMPLATE = `Team Admin has modified {{team.name}}`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  user: User;
  team: Team;
}

export const render = (data: DataProps) => {
  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps) => {
  const { team, user } = data;
  const emails = await getTeamEmails(team.id, ['admin']);

  return sendEmail({
    to: emails,
    ...render(data),
  });
};

export default { render, send };
