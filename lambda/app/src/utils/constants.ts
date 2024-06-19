export const MS_GRAPH_URL = 'https://graph.microsoft.com';
export const CYPRESS_MOCKED_IDIR_LOOKUP = [{ mail: 'pathfinder.ssotraining2@gov.bc.ca', id: 1 }];
export const bcscIdpMappers = [
  { name: 'username', type: 'oidc-username-idp-mapper', template: '${CLAIM.sub}@${ALIAS}' },
];
export const bcscClientScopeMappers = [
  'given_name',
  'email',
  'display_name',
  'given_names',
  'family_name',
  'sector_identifier_uri',
  'address',
];
export const bcscDefaultScopes = 'openid profile email address';
