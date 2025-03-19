import { Integration } from 'app/interfaces/Request';
import { IntegrationData } from '../../shared/interfaces';
import createHttpError from 'http-errors';

export const SSO_ADMIN_USERID_01 = 'SSO_ADMIN_USER_01';
export const SSO_ADMIN_EMAIL_01 = 'sso.admin.user-01@gov.bc.ca';

export const BCEID_ADMIN_IDIR_USERID_01 = 'BCEID_ADMIN_USER_01';
export const BCEID_ADMIN_IDIR_EMAIL_01 = 'bceid.admin.user-01@gov.bc.ca';

export const GITHUB_ADMIN_IDIR_USERID_01 = 'GITHUB_ADMIN_USER_01';
export const GITHUB_ADMIN_IDIR_EMAIL_01 = 'github.admin.user-01@gov.bc.ca';

export const BCSC_ADMIN_IDIR_USERID_01 = 'BCSC_ADMIN_USER_01';
export const BCSC_ADMIN_IDIR_EMAIL_01 = 'bcsc.admin.user-01@gov.bc.ca';

export const TEAM_ADMIN_IDIR_USERNAME_01 = 'TEAMADMINIDIRUSER01';
export const TEAM_ADMIN_IDIR_USERID_01 = 'TEAM_ADMIN_IDIR_USER_01';
export const TEAM_ADMIN_IDIR_EMAIL_01 = 'team.admin.idir.user-01@gov.bc.ca';

export const TEAM_ADMIN_IDIR_USERID_02 = 'TEAM_ADMIN_IDIR_USER_02';
export const TEAM_ADMIN_IDIR_EMAIL_02 = 'team.admin.idir.user-02@gov.bc.ca';

export const TEAM_ADMIN_IDIR_USERID_03 = 'TEAM_ADMIN_IDIR_USER_03';
export const TEAM_ADMIN_IDIR_EMAIL_03 = 'team.admin.idir.user-03@gov.bc.ca';

export const TEAM_MEMBER_IDIR_USERID_01 = 'TEAM_MEMBER_IDIR_USER_01';
export const TEAM_MEMBER_IDIR_EMAIL_01 = 'team.member.idir.user-01@gov.bc.ca';

export const TEAM_MEMBER_IDIR_USERID_02 = 'TEAM_MEMBER_IDIR_USER_02';
export const TEAM_MEMBER_IDIR_EMAIL_02 = 'team.member.idir.user-02@gov.bc.ca';

export const SSO_TEAM_IDIR_USER = 'SSO_TEAM_IDIR_USER';
export const SSO_TEAM_IDIR_EMAIL = 'bcgov.sso@gov.bc.ca';

export const formDataDev: IntegrationData = {
  id: 1,
  idirUserid: 'TEST',
  projectName: 'test',
  clientId: 'test',
  serviceType: 'gold',
  publicAccess: true,
  devValidRedirectUris: ['https://b'],
  environments: ['dev'],
  devIdps: ['azureidir'],
  projectLead: true,
  newToSso: true,
  agreeWithTerms: true,
  protocol: 'oidc',
  status: 'draft',
  archived: false,
  idirUserDisplayName: 'test user',
  usesTeam: false,
  requester: 'SSO Admin',
  userId: 1,
  user: {
    id: 0,
    idirUserid: 'QWERASDF',
    idirEmail: 'test@test.com',
    displayName: 'Test User',
    additionalEmail: '',
  },
  lastChanges: [
    { lhs: true, rhs: false, kind: 'E', path: ['bceidApproved'] },
    { lhs: 'project-1', rhs: 'project-2', kind: 'E', path: ['projectName'] },
  ],
};

export const formDataDevTest: IntegrationData = {
  ...formDataDev,
  testValidRedirectUris: ['https://test'],
  environments: ['dev', 'test'],
};

export const formDataProd: IntegrationData = {
  ...formDataDevTest,
  prodValidRedirectUris: ['https://a'],
  environments: ['dev', 'test', 'prod'],
};

export const postTeamMembers = [
  {
    idirEmail: TEAM_ADMIN_IDIR_EMAIL_02,
    role: 'admin',
  },
  {
    idirEmail: TEAM_ADMIN_IDIR_EMAIL_03,
    role: 'admin',
  },
  {
    idirEmail: TEAM_MEMBER_IDIR_EMAIL_01,
    role: 'member',
  },
  {
    idirEmail: TEAM_MEMBER_IDIR_EMAIL_02,
    role: 'member',
  },
];

export const postTeam = {
  name: 'team_01',
  members: postTeamMembers,
};

export const putTeam = {
  name: 'team_02',
};

export const postRoles = [
  {
    name: 'integration_role',
    envs: ['dev'],
  },
];

export const postCompositeRoles = ['composite_role1', 'composite_role2'];

export const getCreateIntegrationData = (args: {
  projectName?: string;
  teamIntegration?: boolean;
  teamId?: number;
}) => {
  if (args.teamIntegration && !args.teamId)
    throw new createHttpError.BadRequest('require teamid for creating a team integration');
  return {
    projectName: args.projectName || 'Test Integration',
    projectLead: true,
    serviceType: 'gold',
    usesTeam: args.teamIntegration || false,
    primaryEndUsers: [],
    teamId: args.teamIntegration ? args.teamId : undefined,
  };
};

export const getUpdateIntegrationData = (args: {
  integration: Integration;
  projectName?: string;
  envs?: string[];
  identityProviders?: string[];
  protocol?: string;
  authType?: string;
  publicAccess?: boolean;
  bceidApproved?: boolean;
  githubApproved?: boolean;
  bcServicesCardApproved?: boolean;
}) => {
  const {
    projectName = args.integration.projectName,
    envs = args.integration.environments?.length > 1 ? args.integration.environments : ['dev'],
    identityProviders = args.integration.devIdps?.length > 1 ? args.integration.devIdps : ['azureidir'],
    protocol = args.integration.protocol || 'oidc',
    authType = args.integration.authType || 'browser-login',
    publicAccess = args.integration.publicAccess || true,
    bceidApproved = args.integration.bceidApproved || false,
    githubApproved = args.integration.githubApproved || false,
    bcServicesCardApproved = args.integration.githubApproved || false,
  } = args;

  const samlIntegration = protocol === 'saml';
  return {
    ...args.integration,
    projectName,
    publicAccess: samlIntegration ? undefined : publicAccess,
    realm: 'standard',
    devValidRedirectUris: ['https://a'],
    testValidRedirectUris: envs.includes('test') ? ['https://a'] : [],
    prodValidRedirectUris: envs.includes('prod') ? ['https://a'] : [],
    agreeWithTerms: true,
    environments: envs,
    devIdps: identityProviders,
    testIdps: envs.includes('test') ? identityProviders : [],
    prodIdps: envs.includes('prod') ? identityProviders : [],
    protocol,
    teamId: args.integration.usesTeam ? args.integration.teamId.toString() : undefined,
    authType,
    bceidApproved,
    githubApproved,
    bcServicesCardApproved,
    devSamlLogoutPostBindingUri: samlIntegration ? 'https://a' : undefined,
    testSamlLogoutPostBindingUri: samlIntegration && envs.includes('test') ? 'https://a' : undefined,
    prodSamlLogoutPostBindingUri: samlIntegration && envs.includes('prod') ? 'https://a' : undefined,
    primaryEndUsers: [],
    devLoginTitle: '',
    testLoginTitle: '',
    prodLoginTitle: '',
  };
};

export const putIntegrationBatchPr = {
  actionNumber: Math.floor(Math.random() * 100000),
  repoOwner: 'test',
  repoName: 'test',
  changes: {},
  isEmpty: false,
  isAllowedToMerge: true,
  prNumber: Math.floor(Math.random() * 1000),
  success: true,
};
