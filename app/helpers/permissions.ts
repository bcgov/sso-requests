import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';

export const canDeleteIntegration = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    ['planFailed', 'planned', 'applyFailed', 'submitted'].includes(integration?.status || '')
  ) {
    return false;
  }

  if (integration.usesTeam) {
    if (integration.userTeamRole === 'admin') return true;
  } else return true;

  return false;
};

export const canEditIntegration = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    !['draft', 'applied'].includes(integration.status || '')
  ) {
    return false;
  } else return true;
};

export const canDeleteTeam = (team: Team) => {
  if (!team || Number(team.integrationCount) > 0) {
    return false;
  }
  if (team.role === 'admin') return true;
  return false;
};

export const canEditTeam = (team: Team) => {
  if (!team) return false;
  if (team.role === 'admin') return true;
  return false;
};

export const canCreateOrDeleteRoles = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    ['pr', 'planned', 'submitted'].includes(integration?.status || '')
  ) {
    return false;
  }
  if (integration.usesTeam) {
    if (integration.userTeamRole === 'admin') return true;
  } else return true;
  return false;
};
