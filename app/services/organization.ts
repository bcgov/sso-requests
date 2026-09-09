import { AxiosError } from 'axios';
import { instance } from './axios';
import { handleAxiosError } from 'services/axios';
import {
  Ceiling,
  Grant,
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

export const inviteTeamToOrganization = (id: number, data: { teamId: number; ceilings: Ceiling[] }) =>
  call(instance.post(`organizations/${id}/teams`, data));

// Team discovery for the invite flow, and the integration list both sides need
// in order to choose a level per integration.
export const searchTeamsForOrganization = (id: number, query: string): Result<TeamSearchResult[]> =>
  call(instance.get(`organizations/${id}/team-search`, { params: { q: query } }));

export const getTeamIntegrationsForOrganization = (id: number, teamId: number): Result<TeamIntegration[]> =>
  call(instance.get(`organizations/${id}/teams/${teamId}/integrations`));

export const removeTeamFromOrganization = (id: number, teamId: number) =>
  call(instance.delete(`organizations/${id}/teams/${teamId}`));

export const getOrganizationApiAccounts = (id: number): Result<OrganizationApiAccount[]> =>
  call(instance.get(`organizations/${id}/api-accounts`));

export const createOrganizationApiAccount = (id: number, grants: Grant[]) =>
  call(instance.post(`organizations/${id}/api-accounts`, { grants }));

export const updateOrganizationApiAccountGrants = (id: number, accountId: number, grants: Grant[]) =>
  call(instance.put(`organizations/${id}/api-accounts/${accountId}`, { grants }));

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
  data: { accept: boolean; ceilings?: Ceiling[] },
) => call(instance.post(`teams/${teamId}/organizations/${orgId}`, data));

export const updateTeamCeiling = (teamId: number, orgId: number, ceilings: Ceiling[]) =>
  call(instance.put(`teams/${teamId}/organizations/${orgId}`, { ceilings }));

export const leaveOrganization = (teamId: number, orgId: number) =>
  call(instance.delete(`teams/${teamId}/organizations/${orgId}`));
