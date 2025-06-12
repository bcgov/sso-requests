import sequelize from '@/sequelize/config';
import models from '@/sequelize/models/models';
import { camelCase } from 'lodash';

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
