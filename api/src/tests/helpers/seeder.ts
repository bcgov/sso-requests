import sequelize from '@/sequelize/config';
import models from '@/sequelize/models/models';
import { camelCase } from 'lodash';
import { OrganizationRole } from '@/constants';

export const seedTeamAndMembers = async (
  teamName: string,
  teamMembers: { idirUserId: string; email: string; role: string }[],
) => {
  const team = await models.team.create({
    name: teamName,
  });

  teamMembers.forEach(async (member) => {
    let user: any;

    user = await models.user.create({
      idirUserid: member.idirUserId,
      idirEmail: member.email,
    });

    await models.usersTeam.create({
      userId: user.id,
      teamId: team.id,
      role: 'admin',
      pending: false,
    });
  });
  return team;
};

export const seedIntergrations = async (data: {
  integrationName: string;
  idps?: string[];
  userId?: number;
  teamId?: number;
  submitted?: boolean;
  protocol?: string;
  publicAccess?: boolean;
  prodIntegration?: boolean;
  authType?: string;
}) => {
  const { integrationName, idps = ['idir'] } = data;
  return await models.request.create({
    projectName: integrationName,
    devIdps: idps,
    testIdps: idps,
    prodIdps: data.prodIntegration ? idps : [],
    devValidRedirectUris: ['https://localhost:3000'],
    testValidRedirectUris: ['https://localhost:3000'],
    prodValidRedirectUris: data.prodIntegration ? ['https://localhost:3000'] : [],
    teamId: data.teamId ? data.teamId : null,
    protocol: data.protocol ? data.protocol : 'oidc',
    publicAccess: data.publicAccess ? data.publicAccess : false,
    status: data.submitted ? 'applied' : 'draft',
    projectLead: data.teamId ? false : true,
    userId: data.teamId ? null : data.userId,
    clientId: camelCase(integrationName),
    bcscPrivacyZone: idps.includes('bcsc') ? 'privacy-zone-1' : '',
    bcscAttributes: idps.includes('bcsc') ? ['displayName', 'email'] : [],
    authType: data.authType || 'browser-login',
    devHomePageUri: 'https://localhost:3000',
    testHomePageUri: 'https://localhost:3000',
    prodHomePageUri: data.prodIntegration ? 'https://localhost:3000' : null,
    devSamlLogoutPostBindingUri: data.protocol === 'saml' ? 'https://localhost:3000' : null,
    testSamlLogoutPostBindingUri: data.protocol === 'saml' ? 'https://localhost:3000' : null,
    prodSamlLogoutPostBindingUri: data.protocol === 'saml' && data.prodIntegration ? 'https://localhost:3000' : null,
    usesTeam: data.teamId ? true : false,
    devLoginTitle: 'Test Login Title',
    testLoginTitle: 'Test Login Title',
    prodLoginTitle: data.prodIntegration ? 'Test Login Title' : null,
    apiServiceAccount: false,
    serviceType: 'gold',
  });
};

// Mirrors what the portal creates for a team API account: the account row plus a
// wildcard grant set over its own team.
export const seedApiAccount = async (teamId: number, grants?: Partial<ApiAccountGrantSeed>[]) => {
  const account = await models.request.create({
    projectName: `Service Account for team #${teamId}`,
    serviceType: 'gold',
    usesTeam: true,
    teamId,
    apiServiceAccount: true,
    authType: 'service-account',
    status: 'applied',
    environments: ['prod'],
  });

  account.clientId = `service-account-team-${teamId}-${account.id}`;
  await account.save();

  const rows: Partial<ApiAccountGrantSeed>[] = grants ?? [
    { teamId, integrationId: null, environment: null, level: 'editor' },
  ];

  await models.apiAccountGrant.bulkCreate(
    rows.map((grant) => ({
      apiAccountId: account.id,
      teamId: grant.teamId ?? null,
      integrationId: grant.integrationId ?? null,
      environment: grant.environment ?? null,
      level: grant.level,
    })),
  );

  return account;
};

export interface ApiAccountGrantSeed {
  teamId: number | null;
  integrationId: number | null;
  environment: string | null;
  level: OrganizationRole;
}

export interface CeilingSeed {
  integrationId?: number | null;
  environment?: string | null;
  level: OrganizationRole;
}

export const seedOrganization = async (name: string) => models.organization.create({ name });

// Links a team to an organization at the given ceiling. `pending` reproduces an
// invitation the team has not accepted, which must grant nothing.
export const seedOrganizationTeam = async (
  organizationId: number,
  teamId: number,
  ceilings: CeilingSeed[],
  pending = false,
) => {
  const link = await models.organizationTeam.create({ organizationId, teamId, pending });

  await models.organizationTeamCeiling.bulkCreate(
    ceilings.map((ceiling) => ({
      organizationTeamId: link.id,
      integrationId: ceiling.integrationId ?? null,
      environment: ceiling.environment ?? null,
      level: ceiling.level,
    })),
  );

  return link;
};

export const seedOrganizationApiAccount = async (organizationId: number, grants: ApiAccountGrantSeed[]) => {
  const account = await models.request.create({
    projectName: `Service Account for organization #${organizationId}`,
    serviceType: 'gold',
    usesTeam: false,
    organizationId,
    apiServiceAccount: true,
    authType: 'service-account',
    status: 'applied',
    environments: ['prod'],
  });

  account.clientId = `service-account-org-${organizationId}-${account.id}`;
  await account.save();

  await models.apiAccountGrant.bulkCreate(
    grants.map((grant) => ({
      apiAccountId: account.id,
      teamId: grant.teamId ?? null,
      integrationId: grant.integrationId ?? null,
      environment: grant.environment ?? null,
      level: grant.level,
    })),
  );

  return account;
};
