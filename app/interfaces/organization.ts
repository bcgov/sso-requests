import { Level } from '@app/shared/enums';

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
  pending: boolean;
  user?: { id: number; idirEmail: string; displayName?: string };
}

// The vocabulary is shared by grants and ceilings: a null integrationId means
// the row applies to the whole team, including integrations created later.
export interface Scope {
  integrationId?: number | null;
  environment?: string | null;
  level: Level;
}

export interface Ceiling extends Scope {
  id?: number;
  organizationTeamId?: number;
}

export interface Grant extends Scope {
  id?: number;
  teamId: number;
}

export interface OrganizationTeamLink {
  id: number;
  organizationId: number;
  teamId: number;
  pending: boolean;
  invitedBy?: number | null;
  team?: { id: number; name: string };
  organization?: Organization;
  ceilings: Ceiling[];
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
  grants: Grant[];
}
