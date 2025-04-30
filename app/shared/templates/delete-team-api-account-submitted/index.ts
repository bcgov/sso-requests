import Handlebars from 'handlebars';
import { Team } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { getTeamEmails, processTeam } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';
import { deleteTeamApiAccountSubmitted } from './delete-team-api-account-submitted';

const SUBJECT_TEMPLATE = `SSO CSS API Account deleted`;

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(deleteTeamApiAccountSubmitted, { noEscape: true });

interface DataProps {
  team: Team;
  requester: string;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { team, requester } = originalData;

  const data = { ...originalData, requester, team: await processTeam(team) };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { team, requester } = data;
  const emails = await getTeamEmails(team.id, false, ['admin']);

  return sendEmail({
    code: EMAILS.DELETE_TEAM_API_ACCOUNT_SUBMITTED,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
