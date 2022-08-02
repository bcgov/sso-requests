import * as fs from 'fs';
import Handlebars = require('handlebars');
import { Team, Data } from '@lambda-shared/interfaces';
import { sendEmail } from '@lambda-shared/utils/ches';
import { getTeamEmails, processIntegrationList, processTeam } from '../helpers';
import { EMAILS } from '@lambda-shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@lambda-shared/local';

const SUBJECT_TEMPLATE = `SSO CSS API Account created`;
const template = fs.readFileSync(__dirname + '/team-api-service-account-created.html', 'utf8');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  requester: string;
  team: Team;
  integrations: Array<Data>;
}

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { team, requester, integrations } = originalData;

  const integrationList = await processIntegrationList(integrations);

  const data = { ...originalData, team: await processTeam(team), requester, integrations: integrationList };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { team, requester, integrations } = data;
  const emails = await getTeamEmails(team.id, false, ['admin']);

  return sendEmail({
    code: EMAILS.TEAM_API_SERVICE_ACCOUNT_CREATED,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
