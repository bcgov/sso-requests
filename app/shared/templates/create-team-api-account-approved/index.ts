import * as fs from 'fs';
import Handlebars from 'handlebars';
import { Team, IntegrationData } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { getEmailTemplate, getTeamEmails, processIntegrationList, processTeam } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { SSO_EMAIL_ADDRESS } from '@app/shared/local';

const SUBJECT_TEMPLATE = `SSO CSS API Account created (email 2 of 2)`;
const template = getEmailTemplate('create-team-api-account-approved/create-team-api-account-approved.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

interface DataProps {
  requester: string;
  team: Team;
  integrations: IntegrationData[];
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
    code: EMAILS.CREATE_TEAM_API_ACCOUNT_APPROVED,
    to: emails,
    cc: [SSO_EMAIL_ADDRESS],
    ...rendered,
  });
};

export default { render, send };
