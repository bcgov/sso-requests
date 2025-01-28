export const MS_GRAPH_URL = 'https://graph.microsoft.com';
export const CYPRESS_MOCKED_IDIR_LOOKUP = [{ mail: 'Pathfinder.SSOTraining2@gov.bc.ca', id: 1 }];
export const bcscIdpMappers = [
  { name: 'username', type: 'oidc-username-idp-mapper', template: '${CLAIM.sub}@${ALIAS}' },
];
