import axios from 'axios';
import url from 'url';
import compact from 'lodash.compact';
import startCase from 'lodash.startcase';
import uniq from 'lodash.uniq';
import { EmailOptions } from '../interfaces';
import https from 'https';
import { envMap, idpMap } from '@app/helpers/meta';

const compactUniq = (v) => uniq(compact(v));

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const fetchChesToken = async (username, password) => {
  const tokenEndpoint = process.env.CHES_TOKEN_ENDPOINT;
  const params = new url.URLSearchParams({ grant_type: 'client_credentials' });
  try {
    const payload = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Accept-Encoding': 'application/json',
      },
      httpsAgent,
      auth: {
        username,
        password,
      },
    });

    const { access_token: accessToken } = payload.data;
    return [accessToken, null];
  } catch (err) {
    console.log(err);
    return [null, err];
  }
};

export const sendEmail = async ({ code, from = 'bcgov.sso@gov.bc.ca', to, cc, body, ...rest }: EmailOptions) => {
  const { CHES_USERNAME: username, CHES_PASSWORD: password, REALM_REGISTRY_API: realmRegistryApi } = process.env;
  const chesAPIEndpoint = realmRegistryApi + '/emails';
  const [accessToken, error] = await fetchChesToken(username, password);
  if (error) throw Error(error);

  const reqPayload = {
    // see https://ches.nrs.gov.bc.ca/api/v1/docs#operation/postEmail for options
    bodyType: 'html',
    body,
    encoding: 'utf-8',
    from,
    priority: 'normal',
    subject: 'CHES Email Message',
    to: compactUniq(to),
    cc: compactUniq(cc),
    ...rest,
  };

  const reqOptions = {
    headers: { Authorization: `Bearer ${accessToken}` },
    httpsAgent,
  };

  // see https://github.com/axios/axios/issues/1650#issuecomment-410403394
  // see https://nodejs.org/api/cli.html#node_tls_reject_unauthorizedvalue
  // process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  return axios.post(chesAPIEndpoint, reqPayload, reqOptions);
};

/**
 * Map the request name and values to readable labels for email formatting.
 * @param name The key from request payload
 * @param prevValue The original value
 * @param newValue The newly sent value
 */
const mapNames = (name: string, prevValue: string, newValue: string) => {
  // Dev Settings
  if (name === 'devLoginTitle') {
    return { name: 'Development Login Page Name', prevValue, newValue };
  }
  if (name === 'devDisplayHeaderTitle') {
    return { name: 'Development Display SSO Header Title', prevValue, newValue };
  }
  if (name === 'devHomePageUri') {
    return { name: 'Development Home Page URI', prevValue, newValue };
  }
  if (name === 'devAccessTokenLifespan') {
    return { name: 'Development Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'devSessionIdleTimeout') {
    return { name: 'Development Client Session Idle', prevValue, newValue };
  }
  if (name === 'devSessionMaxLifespan') {
    return { name: 'Development Client Session Max', prevValue, newValue };
  }
  if (name === 'devAccessTokenLifespan') {
    return { name: 'Development Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'devOfflineAccessEnabled') {
    return { name: 'Development Allow Offline Access', prevValue, newValue };
  }
  if (name === 'devOfflineSessionIdleTimeout') {
    return { name: 'Development Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'devOfflineSessionMaxLifespan') {
    return { name: 'Development Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'devAccessTokenLifespan') {
    return { name: 'Development Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'devAssertionLifespan') {
    return { name: 'Development Assertion Lifespan', prevValue, newValue };
  }
  if (name === 'devSamlLogoutPostBindingUri') {
    return { name: 'Development Logout Service URL', prevValue, newValue };
  }
  if (name === 'devSamlSignAssertions') {
    return { name: 'Development Sign Assertions', prevValue, newValue };
  }
  if (name === 'devValidRedirectUris') {
    return { name: 'Development Redirect URIs', prevValue, newValue };
  }

  // Test
  if (name === 'testLoginTitle') {
    return { name: 'Test Login Page Name', prevValue, newValue };
  }
  if (name === 'testDisplayHeaderTitle') {
    return { name: 'Test Display SSO Header Title', prevValue, newValue };
  }
  if (name === 'testHomePageUri') {
    return { name: 'Test Home Page URI', prevValue, newValue };
  }
  if (name === 'testAccessTokenLifespan') {
    return { name: 'Test Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'testSessionIdleTimeout') {
    return { name: 'Test Client Session Idle', prevValue, newValue };
  }
  if (name === 'testSessionMaxLifespan') {
    return { name: 'Test Client Session Max', prevValue, newValue };
  }
  if (name === 'testAccessTokenLifespan') {
    return { name: 'Test Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'testOfflineAccessEnabled') {
    return { name: 'Test Allow Offline Access', prevValue, newValue };
  }
  if (name === 'testOfflineSessionIdleTimeout') {
    return { name: 'Test Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'testOfflineSessionMaxLifespan') {
    return { name: 'Test Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'testAccessTokenLifespan') {
    return { name: 'Test Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'testAssertionLifespan') {
    return { name: 'Test Assertion Lifespan', prevValue, newValue };
  }
  if (name === 'testSamlLogoutPostBindingUri') {
    return { name: 'Test Logout Service URL', prevValue, newValue };
  }
  if (name === 'testSamlSignAssertions') {
    return { name: 'Test Sign Assertions', prevValue, newValue };
  }
  if (name === 'testValidRedirectUris') {
    return { name: 'Test Redirect URIs', prevValue, newValue };
  }

  // Prod
  if (name === 'prodLoginTitle') {
    return { name: 'Production Login Page Name', prevValue, newValue };
  }
  if (name === 'prodDisplayHeaderTitle') {
    return { name: 'Production Display SSO Header Title', prevValue, newValue };
  }
  if (name === 'prodHomePageUri') {
    return { name: 'Production Home Page URI', prevValue, newValue };
  }
  if (name === 'prodAccessTokenLifespan') {
    return { name: 'Production Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'prodSessionIdleTimeout') {
    return { name: 'Production Client Session Idle', prevValue, newValue };
  }
  if (name === 'prodSessionMaxLifespan') {
    return { name: 'Production Client Session Max', prevValue, newValue };
  }
  if (name === 'prodAccessTokenLifespan') {
    return { name: 'Production Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'prodOfflineAccessEnabled') {
    return { name: 'Production Allow Offline Access', prevValue, newValue };
  }
  if (name === 'prodOfflineSessionIdleTimeout') {
    return { name: 'Production Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'prodOfflineSessionMaxLifespan') {
    return { name: 'Production Client Offline Session Idle', prevValue, newValue };
  }
  if (name === 'prodAccessTokenLifespan') {
    return { name: 'Production Access Token Lifespan', prevValue, newValue };
  }
  if (name === 'prodAssertionLifespan') {
    return { name: 'Production Assertion Lifespan', prevValue, newValue };
  }
  if (name === 'prodSamlLogoutPostBindingUri') {
    return { name: 'Production Logout Service URL', prevValue, newValue };
  }
  if (name === 'prodSamlSignAssertions') {
    return { name: 'Production Sign Assertions', prevValue, newValue };
  }
  if (name === 'prodValidRedirectUris') {
    return { name: 'Production Redirect URIs', prevValue, newValue };
  }

  // Global Settings
  if (name === 'bcscPrivacyZone') {
    return { name: 'BC Services Card Privacy Zone', prevValue, newValue };
  }
  if (name === 'bcscAttributes') {
    return { name: 'BC Services Card Attributes', prevValue, newValue };
  }
  if (name === 'devIdps') {
    return { name: 'Identity Providers', prevValue: idpMap[prevValue], newValue: idpMap[newValue] };
  }
  if (name === 'publicAccess') {
    return { name: 'Public Client', prevValue, newValue };
  }
  if (name === 'protocol') {
    return { name: 'Client Protocol', prevValue, newValue };
  }
  if (name === 'authType') {
    return { name: 'Use Case', prevValue, newValue };
  }
  if (name === 'environments') {
    return { name: 'Environments', prevValue: envMap[prevValue], newValue: envMap[newValue] };
  }
  return { name, prevValue, newValue };
};

/**
 * Subset of fields to show as changes in the formatted emails.
 */
const shownFields = [
  'devLoginTitle',
  'devDisplayHeaderTitle',
  'devValidRedirectUris',
  'devHomePageUri',
  'devAccessTokenLifespan',
  'devSessionIdleTimeout',
  'devSessionMaxLifespan',
  'devOfflineAccessEnabled',
  'devOfflineSessionIdleTimeout',
  'devOfflineSessionMaxLifespan',
  'projectName',
  'publicAccess',
  'protocol',
  'authType',
  'testValidRedirectUris',
  'prodValidRedirectUris',
  'environments',
  'usesTeam',
  'additionalRoleAttribute',
  'devIdps',
  'devAssertionLifespan',
  'testAssertionLifespan',
  'testAccessTokenLifespan',
  'testSessionIdleTimeout',
  'testSessionMaxLifespan',
  'testOfflineSessionIdleTimeout',
  'testOfflineSessionMaxLifespan',
  'prodAssertionLifespan',
  'prodAccessTokenLifespan',
  'prodSessionIdleTimeout',
  'prodSessionMaxLifespan',
  'prodOfflineSessionIdleTimeout',
  'prodOfflineSessionMaxLifespan',
  'testLoginTitle',
  'prodLoginTitle',
  'testDisplayHeaderTitle',
  'prodDisplayHeaderTitle',
  'devSamlLogoutPostBindingUri',
  'testSamlLogoutPostBindingUri',
  'prodSamlLogoutPostBindingUri',
  'devSamlSignAssertions',
  'testSamlSignAssertions',
  'prodSamlSignAssertions',
  'testOfflineAccessEnabled',
  'prodOfflineAccessEnabled',
  'bcscPrivacyZone',
  'bcscAttributes',
  'bcServicesCardApproved',
  'testHomePageUri',
  'prodHomePageUri',
];

/**
 * Basic type for deep-diffs. Library does not export types.
 */
interface Diff {
  kind: string;
  path: (string | number)[];
  index?: number;
  item?: Diff;
  lhs: any;
  rhs: any;
}

/**
 * Generate readable html to be used in the handlebars email template generator for integration updates.
 * @param diff A diff from the deep-diff library https://www.npmjs.com/package/deep-diff of integration changes.
 */
export const getReadableIntegrationDiff = (diff?: Diff[]) => {
  if (!diff || !Array.isArray(diff)) return '';

  let readableDiff = '';
  // Object tracking array type changes to handle index-swapping. Saves list of removed and added values per key.
  const arrayChanges: { [key: string]: { old: any[]; new: any[] } } = {};

  diff.forEach((diff) => {
    const path = diff.path[0] as string;
    if (!shownFields.includes(path)) return;
    const isArrayChange = diff.kind === 'A';
    const isArrayEdit = diff.path.length > 1;

    if (isArrayChange || isArrayEdit) {
      // Array edits are under item key, additions and deletions directly on object
      const lhs = diff.item?.lhs ?? diff.lhs;
      const rhs = diff.item?.rhs ?? diff.rhs;

      // Map values to readable labels
      const { name, prevValue, newValue } = mapNames(path, lhs, rhs);

      // Add to changes if the key if exists, or create the key if not exists. Add conditionally since prev/old value may not exist if creating/deleting.
      if (arrayChanges.hasOwnProperty(name)) {
        prevValue && arrayChanges[name].old.push(prevValue);
        newValue && arrayChanges[name].new.push(newValue);
      } else {
        arrayChanges[name] = {
          old: prevValue ? [prevValue] : [],
          new: newValue ? [newValue] : [],
        };
      }
    } else {
      const { name, prevValue, newValue } = mapNames(path, diff.lhs, diff.rhs);
      readableDiff += `<strong>${startCase(name)}:</strong> ${prevValue} => ${newValue}<br/>`;
    }
  });

  Object.entries(arrayChanges).forEach(([key, values]: any) => {
    // Filter out values that were both added and deleted to prevent double-listing swapped values
    const removed = values.old.filter((val) => !values.new.includes(val));
    const added = values.new.filter((val) => !values.old.includes(val));
    if (!removed.length && !added.length) return;

    readableDiff += `<strong>${key}:</strong><br/>`;
    if (removed.length) {
      const removedListItems = removed.map((val) => `<li>${val}</li>`).join('');
      readableDiff += `Removed: <ul>${removedListItems}</ul>`;
    }
    if (added.length) {
      const addedListItems = added.map((val) => `<li>${val}</li>`).join('');
      readableDiff += `Added: <ul>${addedListItems}</ul>`;
    }
  });

  return readableDiff;
};
