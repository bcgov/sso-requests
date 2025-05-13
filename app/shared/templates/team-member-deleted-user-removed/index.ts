import * as fs from 'fs';
import Handlebars from 'handlebars';
import { Team, User } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { getUserEmails, processTeam, processUser } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Team Admin has modified {{team.name}}`;
const template = fs.readFileSync(__dirname + '/team-member-deleted-user-removed.html', 'utf8');

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
  const emails = await getUserEmails(user);

  return sendEmail({
    code: EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED,
    to: emails,
    cc: [],
    ...rendered,
  });
};

export default { render, send };
