import Handlebars from 'handlebars';
import { sendEmail } from '@app/utils/ches';
import { EMAILS } from '@app/shared/enums';
import {
  getEmailTemplate,
  getOrganizationAdminEmails,
  getTeamEmails,
  processOrganization,
  processTeam,
} from '../helpers';
import type { RenderResult } from '../index';

export type OrganizationTeamNotificationAction =
  | 'invited'
  | 'accepted'
  | 'declined'
  | 'left'
  | 'removed'
  | 'member-added'
  | 'member-removed';

interface DataProps {
  organization: { id: number; name: string };
  team?: { id: number; name: string };
  member?: { idirEmail: string; additionalEmail?: string | null };
  action: OrganizationTeamNotificationAction;
  appUrl?: string;
}

const SUBJECT_TEMPLATE = `Organization access update: {{organization.name}}`;
const template = getEmailTemplate('organization-team-notification/organization-team-notification.html');

const subjectHandler = Handlebars.compile(SUBJECT_TEMPLATE, { noEscape: true });
const bodyHandler = Handlebars.compile(template, { noEscape: true });

const getMessage = (action: OrganizationTeamNotificationAction, organization: string, team: string) => {
  switch (action) {
    case 'invited':
      return `Organization ${organization} invited team ${team} to join. As a team admin you can accept or decline this request.`;
    case 'accepted':
      return `Team ${team} accepted the invitation to join organization ${organization}.`;
    case 'declined':
      return `Team ${team} declined the invitation to join organization ${organization}.`;
    case 'left':
      return `Team ${team} left organization ${organization}.`;
    case 'removed':
      return `Team ${team} was removed from organization ${organization}.`;
    case 'member-added':
      return `You have been added to organization ${organization}.`;
    case 'member-removed':
      return `You have been removed from organization ${organization}.`;
  }
};

export const render = async (originalData: DataProps): Promise<RenderResult> => {
  const { organization, team, action } = originalData;
  const processedOrganization = await processOrganization(organization);
  const processedTeam = team ? await processTeam(team) : undefined;
  const teamLabel = processedTeam ? `${processedTeam.name} (#${processedTeam.id})` : '';
  const data = {
    ...originalData,
    organization: processedOrganization,
    message: getMessage(action, processedOrganization.name, teamLabel),
  };

  return {
    subject: subjectHandler(data),
    body: bodyHandler(data),
  };
};

export const send = async (data: DataProps, rendered: RenderResult) => {
  const { organization, team, member, action } = data;
  let to: string[];
  if (action === 'member-added' || action === 'member-removed') {
    to = [];
    if (member?.idirEmail) to.push(member.idirEmail);
    if (member?.additionalEmail && member.additionalEmail !== member.idirEmail) to.push(member.additionalEmail);
  } else if (action === 'invited' || action === 'removed') {
    to = team ? await getTeamEmails(team.id, false, ['admin']) : [];
  } else {
    to = await getOrganizationAdminEmails(organization.id);
  }

  return sendEmail({
    code: EMAILS.ORGANIZATION_TEAM_NOTIFICATION,
    to,
    cc: [],
    ...rendered,
  });
};

export default { render, send };
