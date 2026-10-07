import { AxiosError } from 'axios';
import { Permission } from '@sso/authz';
import { instance } from './axios';
import { handleAxiosError } from 'services/axios';
import {
  IntegrationOverride,
  Organization,
  OrganizationApiAccount,
  OrganizationMember,
  OrganizationTeamLink,
  TeamIntegration,
  TeamSearchResult,
} from 'interfaces/organization';

type Result<T> = Promise<[T, null] | [null, AxiosError]>;

const call = <T>(request: Promise<{ data: T }>): Result<T> =>
  request.then((res) => [res.data, null] as [T, null]).catch((err: any) => handleAxiosError(err) as [null, AxiosError]);

export const getOrganizations = (): Result<Organization[]> => call(instance.get('organizations'));

export const createOrganization = (data: { name: string; description?: string }): Result<Organization> =>
  call(instance.post('organizations', data));

export const updateOrganization = (id: number, data: { name?: string; description?: string }): Result<Organization> =>
  call(instance.put(`organizations/${id}`, data));

export const deleteOrganization = (id: number): Result<{ success: boolean }> =>
  call(instance.delete(`organizations/${id}`));

export const getOrganizationMembers = (id: number): Result<OrganizationMember[]> =>
  call(instance.get(`organizations/${id}/members`));

export const addOrganizationMember = (id: number, data: { idirEmail: string; role: string }) =>
  call(instance.post(`organizations/${id}/members`, data));

export const updateOrganizationMemberRole = (id: number, userId: number, role: string) =>
  call(instance.put(`organizations/${id}/members/${userId}`, { role }));

export const removeOrganizationMember = (id: number, userId: number) =>
  call(instance.delete(`organizations/${id}/members/${userId}`));

export const getOrganizationTeams = (id: number): Result<OrganizationTeamLink[]> =>
  call(instance.get(`organizations/${id}/teams`));

// The organization proposes a permission set; nothing is in force until the
// team accepts, and after that the set is the team's to change.
export const inviteTeamToOrganization = (id: number, data: { teamId: number; permissions: Permission[] }) =>
  call(instance.post(`organizations/${id}/teams`, data));

// Team discovery for the invite flow, and the integration list both sides need
// in order to see what a consent reaches.
export const searchTeamsForOrganization = (id: number, query: string): Result<TeamSearchResult[]> =>
  call(instance.get(`organizations/${id}/team-search`, { params: { q: query } }));

export const getTeamIntegrationsForOrganization = (id: number, teamId: number): Result<TeamIntegration[]> =>
  call(instance.get(`organizations/${id}/teams/${teamId}/integrations`));

export const removeTeamFromOrganization = (id: number, teamId: number) =>
  call(instance.delete(`organizations/${id}/teams/${teamId}`));

export const getOrganizationApiAccounts = (id: number): Result<OrganizationApiAccount[]> =>
  call(instance.get(`organizations/${id}/api-accounts`));

// An organization account holds nothing of its own, so there is nothing to send.
export const createOrganizationApiAccount = (id: number) => call(instance.post(`organizations/${id}/api-accounts`, {}));

export const deleteOrganizationApiAccount = (id: number, accountId: number) =>
  call(instance.delete(`organizations/${id}/api-accounts/${accountId}`));

export const getOrganizationApiAccountCredentials = (id: number, accountId: number) =>
  call(instance.get(`organizations/${id}/api-accounts/${accountId}/credentials`));

export const updateOrganizationApiAccountSecret = (id: number, accountId: number) =>
  call(instance.put(`organizations/${id}/api-accounts/${accountId}/credentials`));

// Team-side view of the same links: what this team has been invited to, and on
// what terms.
export const getTeamOrganizations = (teamId: number): Result<OrganizationTeamLink[]> =>
  call(instance.get(`teams/${teamId}/organizations`));

export const respondToOrganizationInvitation = (
  teamId: number,
  orgId: number,
  data: { accept: boolean; permissions?: Permission[] },
) => call(instance.post(`teams/${teamId}/organizations/${orgId}`, data));

export const updateTeamConsent = (teamId: number, orgId: number, permissions: Permission[]) =>
  call(instance.put(`teams/${teamId}/organizations/${orgId}`, { permissions }));

export const updateIntegrationOverrides = (teamId: number, orgId: number, overrides: IntegrationOverride[]) =>
  call(instance.put(`teams/${teamId}/organizations/${orgId}/overrides`, { overrides }));

export const leaveOrganization = (teamId: number, orgId: number) =>
  call(instance.delete(`teams/${teamId}/organizations/${orgId}`));
