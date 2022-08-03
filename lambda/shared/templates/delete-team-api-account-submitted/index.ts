import * as fs from 'fs';
import Handlebars = require('handlebars');
import { Team, Data } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { getTeamEmails, processIntegrationList, processRequest, processTeam } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';

const SUBJECT_TEMPLATE = `SSO CSS API Account deleted`;
const template = fs.readFileSync(__dirname + '/delete-team-api-account-submitted.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  requester: string;
  team: Team;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { requester, team } = originalData;

  const data = { ...originalData, requester, team: processTeam(team) };

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
