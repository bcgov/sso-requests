import * as fs from 'fs';
import Handlebars = require('handlebars');
import { Team, User } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { getTeamEmails, processTeam, processUser } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Team Admin has modified {{team.name}}`;
const template = fs.readFileSync(__dirname + '/template.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  user: User;
  team: Team;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { team, user } = originalData;
  const data = { ...originalData, team: await processTeam(team), user: await processUser(user) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { team, user } = data;
  const emails = await getTeamEmails(team.id, ['admin']);

  return sendEmail({
    code: EMAILS.TEAM_MEMBER_DELETED_ADMINS,
    to: emails,
    cc: [],
    ...rendered,
  });
};

export default { render, send };
