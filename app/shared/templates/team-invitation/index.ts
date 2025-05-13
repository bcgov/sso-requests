import * as fs from 'fs';
import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { processTeam } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';

const SUBJECT_TEMPLATE = `Invitation to join {{team.name}}`;
const template = fs.readFileSync(__dirname + '/team-invitation.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  email: string;
  team: string;
  invitationLink: string;
  apiUrl: string;
  role: string;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { team } = originalData;
  const data = { ...originalData, team: await processTeam(team) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { email } = data;

  return sendEmail({
    code: EMAILS.TEAM_INVITATION,
    to: [email],
    cc: [],
    ...rendered,
  });
};

export default { render, send };
