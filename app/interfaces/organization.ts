import { Permission } from '@sso/authz';

export interface Organization {
  id: number;
  name: string;
  description?: string | null;
  role?: string;
}

export interface OrganizationMember {
  organizationId: number;
  userId: number;
  role: string;
  user?: { id: number; idirEmail: string; displayName?: string };
}

export interface IntegrationOverride {
  id?: number;
  organizationTeamId?: number;
  requestId: number;
  permissions: Permission[];
}

export interface OrganizationTeamLink {
  id: number;
  organizationId: number;
  teamId: number;
  // What the team consented to across the whole team — proposed by the
  // organization while `pending`, and the team's own from acceptance onward.
  permissions: Permission[];
  pending: boolean;
  invitedBy?: number | null;
  team?: { id: number; name: string };
  organization?: Organization;
  overrides: IntegrationOverride[];
}

export interface TeamSearchResult {
  id: number;
  name: string;
  organizationId: number | null;
  pending: boolean | null;
  available: boolean;
}

export interface TeamIntegration {
  id: number;
  projectName: string;
  clientId: string | null;
  status: string;
  environments: string[];
}

export interface OrganizationApiAccount {
  id: number;
  clientId: string;
  organizationId: number;
  status: string;
  archived: boolean;
}
