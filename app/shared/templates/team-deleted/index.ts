import Handlebars from 'handlebars';
import { Team } from '@app/shared/interfaces';
import { sendEmail } from '@app/utils/ches';
import { getTeamEmails } from '../helpers';
import { processTeam } from '../helpers';
import { EMAILS } from '@app/shared/enums';
import type { RenderResult } from '../index';
import { teamDeleted } from './team-deleted';

const SUBJECT_TEMPLATE = `Team {{team.name}} has been removed by a team admin`;

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(teamDeleted, { noEscape: true });

interface DataProps {
  team: Team;
  appUrl: string;
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
  const { team } = data;
  const emails = await getTeamEmails(team.id);

  return sendEmail({
    code: EMAILS.TEAM_DELETED,
    to: emails,
    cc: [],
    ...rendered,
  });
};

export default { render, send };
