import { CYPRESS_MOCKED_IDIR_LOOKUP, ENTRA_CUSTOM_CLAIM_MAPPING_POLICY_ID, MS_GRAPH_URL } from './constants';
import createHttpError from 'http-errors';
import axios, { AxiosRequestConfig, AxiosResponse, Method, ResponseType } from 'axios';
import { createAzureIdirUser } from '@app/keycloak/users';
import { MsGraphUserValue, MsGraphUserResponse, IntegrationData } from '@app/shared/interfaces';
import { IConfidentialClientApplication, ConfidentialClientApplication } from '@azure/msal-node';
import { Application, ServicePrincipal } from '@microsoft/microsoft-graph-types';
import { getKeycloakBaseUrlByEnvironment } from './helpers';

const GRAPH_API_MAX_RETRIES = 5;
const GRAPH_API_RETRY_INTERVAL_MS = 1500;
const GRAPH_API_MAX_RETRY_DELAY_MS = 60_000;
const GRAPH_API_TIMEOUT_MS = 30_000;
// Transient failures that are safe to retry for idempotent methods.
const RETRYABLE_STATUS_CODES = new Set([403, 404, 408, 425, 429, 500, 502, 503, 504]);
// Server explicitly signalled it did not process the request, so retrying non-idempotent methods (POST) is safe.
const POST_RETRYABLE_STATUS_CODES = new Set([403, 404, 408, 425, 429, 503]);
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'DELETE']);

export type GraphApiRequestOptions = {
  method?: Method;
  data?: unknown;
  params?: AxiosRequestConfig['params'];
  headers?: Record<string, string>;
  responseType?: ResponseType;
  signal?: AbortSignal;
};

function getRetryDelayMs(response: AxiosResponse | undefined, retryNumber: number): number {
  const retryAfter = response?.headers['retry-after'];

  if (retryAfter) {
    const seconds = Number(retryAfter);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, GRAPH_API_MAX_RETRY_DELAY_MS);
    }

    const retryDate = Date.parse(retryAfter);

    if (!Number.isNaN(retryDate)) {
      return Math.min(Math.max(retryDate - Date.now(), GRAPH_API_RETRY_INTERVAL_MS), GRAPH_API_MAX_RETRY_DELAY_MS);
    }
  }

  // Equal jitter to avoid retry storms; Math.random is fine here (non-security use).
  const cap = Math.min(GRAPH_API_RETRY_INTERVAL_MS * 2 ** retryNumber, GRAPH_API_MAX_RETRY_DELAY_MS);
  return Math.floor(cap / 2 + Math.random() * (cap / 2));
}

function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error('Aborted'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason ?? new Error('Aborted'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function getGraphRequestUrl(endpoint: string): URL {
  const graphBaseUrl = new URL(MS_GRAPH_URL);
  let requestUrl: URL;

  try {
    requestUrl = new URL(endpoint, graphBaseUrl);
  } catch {
    throw new createHttpError.BadRequest('Invalid Graph API endpoint');
  }

  if (
    requestUrl.origin !== graphBaseUrl.origin ||
    !/^\/(v1\.0|beta)(\/|$)/.test(requestUrl.pathname) ||
    requestUrl.username ||
    requestUrl.password ||
    requestUrl.hash
  ) {
    throw new createHttpError.BadRequest('Invalid Graph API endpoint');
  }

  return requestUrl;
}

/**
 * Call a Microsoft Graph v1.0 or beta endpoint using application credentials.
 */
export async function callAzureGraphApi<T = any>(endpoint: string, options: GraphApiRequestOptions = {}): Promise<T> {
  const requestUrl = getGraphRequestUrl(endpoint);
  const restrictedHeader = Object.keys(options.headers ?? {}).find((header) =>
    ['authorization', 'proxy-authorization', 'host', 'cookie'].includes(header.toLowerCase()),
  );

  if (restrictedHeader) {
    throw new createHttpError.BadRequest(`Graph API header is not allowed: ${restrictedHeader}`);
  }

  const method = ((options.method ?? 'GET') as string).toUpperCase() as Method;
  const isIdempotent = IDEMPOTENT_METHODS.has(method);
  let tokenRefreshedOn401 = false;

  for (let retryNumber = 0; ; retryNumber += 1) {
    const accessToken = await getAzureAccessToken();

    const requestConfig: AxiosRequestConfig = {
      method,
      url: requestUrl.toString(),
      data: options.data,
      params: options.params,
      responseType: options.responseType,
      signal: options.signal,
      timeout: GRAPH_API_TIMEOUT_MS,
      maxRedirects: 0,
      headers: {
        ConsistencyLevel: 'eventual',
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    };

    try {
      const response = await axios.request<T>(requestConfig);
      return response.data;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.code === 'ERR_CANCELED') {
        throw error;
      }

      const status = error.response?.status;

      // On 401, invalidate the cached token once and immediately retry with a fresh one.
      if (status === 401 && !tokenRefreshedOn401) {
        tokenRefreshedOn401 = true;
        invalidateAzureAccessToken();
        continue;
      }

      if (retryNumber >= GRAPH_API_MAX_RETRIES) {
        throw error;
      }

      // Non-idempotent methods only retry on statuses that guarantee the request wasn't processed.
      const retryableForMethod = isIdempotent
        ? status === undefined || RETRYABLE_STATUS_CODES.has(status)
        : status !== undefined && POST_RETRYABLE_STATUS_CODES.has(status);

      if (!retryableForMethod) {
        throw error;
      }

      await sleepWithAbort(getRetryDelayMs(error.response, retryNumber), options.signal);
    }
  }
}

const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 60_000;

let msalInstance: IConfidentialClientApplication;
let cachedAccessToken: { value: string; expiresAt: number } | undefined;
let accessTokenRequest: Promise<string> | undefined;

export async function getAzureAccessToken() {
  const msalConfig = {
    auth: {
      authority: process.env.MS_GRAPH_API_AUTHORITY || '',
      clientId: process.env.MS_GRAPH_API_CLIENT_ID || '',
      clientSecret: process.env.MS_GRAPH_API_CLIENT_SECRET || '',
    },
  };

  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - ACCESS_TOKEN_EXPIRY_BUFFER_MS) {
    return cachedAccessToken.value;
  }

  if (accessTokenRequest) {
    return accessTokenRequest;
  }

  const request = {
    scopes: [`${MS_GRAPH_URL}/.default`],
  };

  accessTokenRequest = (async () => {
    try {
      if (!msalInstance) {
        msalInstance = new ConfidentialClientApplication(msalConfig);
      }

      const response = await msalInstance.acquireTokenByClientCredential(request);
      if (!response?.accessToken) {
        throw new Error('Azure access token response was empty');
      }

      if (response.expiresOn) {
        cachedAccessToken = {
          value: response.accessToken,
          expiresAt: response.expiresOn.getTime(),
        };
      }

      return response.accessToken;
    } catch (error) {
      console.error(error);
      throw new createHttpError.Unauthorized('could not fetch access token');
    }
  })().finally(() => {
    accessTokenRequest = undefined;
  });

  return accessTokenRequest;
}

function invalidateAzureAccessToken(): void {
  cachedAccessToken = undefined;
}

/** Search for an idir email address. Lookup uses the "startswith" function so expects the beggining of the address. */
export const searchIdirEmail = async (email: string) => {
  if (process.env.CYPRESS_RUNNER) {
    return CYPRESS_MOCKED_IDIR_LOOKUP;
  }
  const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(mail,'${email}')&$orderby=userPrincipalName&$count=true&$top=25`;
  return callAzureGraphApi(url).then((res) => res.value?.map((value: any) => ({ mail: value.mail, id: value.id })));
};

/** Validate the provided email is linked to an existing IDIR account. */
export const validateIdirEmail = async (email: string) => {
  const encodedEmail = encodeURIComponent(email);
  const url = `${MS_GRAPH_URL}/v1.0/users/${encodedEmail}`;
  try {
    const response = await callAzureGraphApi(url);
    return { given_name: response.givenName, family_name: response.surname };
  } catch (error) {
    console.error('Failed to validate IDIR email via Graph API:', error);
    return false;
  }
};

const formatUser = (data: MsGraphUserValue) => {
  const userId = data.mailNickname;
  const guid = data.onPremisesExtensionAttributes.extensionAttribute12;
  const email = data.mail;
  const firstName = data.givenName;
  const lastName = data.surname;
  const displayName = data.displayName;
  const company = data.companyName;
  const phone = data.mobilePhone;
  const department = data.department;
  const jobTitle = data.jobTitle;
  const userPrincipalName = data.userPrincipalName;
  return {
    guid,
    userId,
    email,
    firstName,
    lastName,
    displayName,
    company,
    phone,
    department,
    jobTitle,
    userPrincipalName,
  };
};

/** Search for an IDIR user by any field and value. Search expects the actual value to start with the provided value. */
export const searchIdirUsers = async ({ field, search }: { field: string; search: string }) => {
  if (!['givenName', 'surname', 'mail', 'mailNickname'].includes(field)) {
    throw new Error('Allowed search fields are givenName, surname, mail, mailNickname');
  }
  try {
    const url = `${MS_GRAPH_URL}/v1.0/users?$filter=startswith(${field},'${search}')&$top=100&$select=onPremisesExtensionAttributes,mailNickname,displayName,mail,givenName,surname,companyName,department,jobTitle,mobilePhone,userPrincipalName`;
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;
    const formattedUsers = response.value.map(formatUser);
    return formattedUsers;
  } catch (err) {
    console.error('Failed searching Azure IDIR users from Graph API:', err);
    throw new createHttpError.UnprocessableEntity('Failed to search Azure IDIR users');
  }
};

/**
 * Verify that the given IDIR GUID resolves to a real, existing Azure IDIR account (matched against
 * `onPremisesExtensionAttributes.extensionAttribute12`). Returns the matched user's profile info,
 * or `null` if there is no match - callers should treat that as a normal "not found" case, not throw.
 */
export const verifyAzureIdirAccountByGuid = async (guid: string) => {
  try {
    // OData string literals delimit with single quotes; escape any embedded single quote by
    // doubling it (the OData standard) so the GUID cannot break out of the filter expression.
    const escapedGuid = guid.replace(/'/g, "''");
    const url = `${MS_GRAPH_URL}/v1.0/users?$filter=onPremisesExtensionAttributes/extensionAttribute12 eq '${escapedGuid}'&$count=true&$select=onPremisesExtensionAttributes,mailNickname,displayName,mail,givenName,surname,companyName,department,jobTitle,mobilePhone,userPrincipalName`;
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;
    const match = response?.value?.find(
      (user) => user.onPremisesExtensionAttributes?.extensionAttribute12?.toLowerCase() === guid.toLowerCase(),
    );
    if (!match) return null;
    return formatUser(match);
  } catch (err) {
    console.error('Failed to verify Azure IDIR account with the MS Graph API:', err);
    return null;
  }
};

/** Import a user into the keycloak instances for all envs. */
export const importIdirUser = async ({ guid, userId }: { guid: string; userId: string }) => {
  if (!guid || !userId) {
    throw new Error('Missing required user data');
  }

  try {
    const url = `${MS_GRAPH_URL}/v1.0/users?$filter=mailNickname eq '${userId}'&$select=onPremisesExtensionAttributes,displayName,mail,givenName,surname,userPrincipalName`;
    const response = (await callAzureGraphApi(url)) as MsGraphUserResponse;

    if (!response?.value?.length) {
      return false;
    }
    const result = response.value.find((user) => user.onPremisesExtensionAttributes.extensionAttribute12 === guid);
    if (!result) return false;

    await Promise.all(
      ['dev', 'test', 'prod'].map((env) =>
        createAzureIdirUser({
          environment: env,
          guid,
          userId,
          email: result.mail,
          firstName: result.givenName,
          lastName: result.surname,
          displayName: result.displayName,
          upn: result.userPrincipalName,
        }).catch(() => null),
      ),
    );
  } catch (err) {
    console.error('Failed to import Azure IDIR user from Graph API:', err);
    throw new createHttpError.UnprocessableEntity('Failed to import Azure IDIR user');
  }
};

export const setupEntraIntegration = async (
  appName: string,
  environment: string,
  request: IntegrationData,
): Promise<{ appId: string; servicePrincipalId: string; secret: string; secretExpiryDate: string }> => {
  let appReg = await getAppRegistration(appName as string);
  if (!appReg) {
    const kcBaseUrl = getKeycloakBaseUrlByEnvironment(environment);
    appReg = await createAppRegistration(appName, [
      `${kcBaseUrl}/auth/realms/bcgovidir/broker/${request.clientId}/endpoint`,
    ]);
  }

  let servicePrincipal = await getServicePrincipal(appReg.appId as string);

  if (!servicePrincipal) {
    servicePrincipal = await createServicePrincipal(appReg.appId as string);
  }

  if (servicePrincipal && servicePrincipal.id) {
    const assignedPolicy = await getAssignedClaimMappingPolicies(servicePrincipal.id);

    if (!assignedPolicy || assignedPolicy.id !== ENTRA_CUSTOM_CLAIM_MAPPING_POLICY_ID) {
      await assignClaimMappingPolicy(servicePrincipal.id, ENTRA_CUSTOM_CLAIM_MAPPING_POLICY_ID);
    }
  }

  if (!appReg.api) {
    await updateAppRegistration(appReg.id as string, {
      api: {
        acceptMappedClaims: true,
      },
    });
  }

  return {
    appId: appReg?.appId!,
    servicePrincipalId: servicePrincipal.id!,
    secret: appReg?.passwordCredentials?.[0]?.secretText!,
    secretExpiryDate: appReg?.passwordCredentials?.[0]?.endDateTime!,
  };
};

export const updateAppRegistration = async (id: string, application: Application): Promise<Application> => {
  try {
    return await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/applications/${id}`, {
      method: 'PATCH',
      data: application,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to update the Entra application registration');
  }
};

export const createAppRegistration = async (appName: string, redirectUris: string[] = []): Promise<Application> => {
  if (!appName.trim()) {
    throw new createHttpError.BadRequest('Application name is required');
  }

  try {
    return await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/applications`, {
      method: 'POST',
      data: {
        displayName: appName,
        signInAudience: 'AzureADMyOrg',
        web: {
          redirectUris,
        },
        optionalClaims: {
          idToken: [...['email', 'family_name', 'given_name', 'upn'].map((claim) => ({ name: claim }))],
        },
        passwordCredentials: [
          {
            displayName: `${appName} Password Credential`,
            endDateTime: new Date(new Date().setMonth(new Date().getMonth() + 24)).toISOString(),
          },
        ],
      },
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to create the Entra application registration');
  }
};

export const deleteAppRegistration = async (appId: string): Promise<void> => {
  try {
    await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/applications(appId='{${appId}}')`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to delete the Entra application registration');
  }
};

export const getAppRegistration = async (appName: string): Promise<Application | null> => {
  try {
    const response = await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/applications?$filter=displayName eq '${appName}'`, {
      method: 'GET',
    });
    return response.value && response.value.length > 0 ? response.value[0] : null;
  } catch (error) {
    console.error(error);
    throw new Error('Unable to retrieve the Entra application registration');
  }
};

export const createServicePrincipal = async (appId: string): Promise<ServicePrincipal> => {
  try {
    return await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/servicePrincipals`, {
      method: 'POST',
      data: {
        appId,
      },
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to create the Entra service principal');
  }
};

export const updateServicePrincipal = async (
  servicePrincipalId: string,
  servicePrincipal: ServicePrincipal,
): Promise<ServicePrincipal> => {
  try {
    if (!servicePrincipal) {
      throw new Error('Service principal not found');
    }
    return await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/servicePrincipals/${servicePrincipalId}`, {
      method: 'PATCH',
      data: servicePrincipal,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to update the Entra service principal');
  }
};

export const getServicePrincipal = async (appId: string): Promise<ServicePrincipal | null> => {
  try {
    const response = await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/servicePrincipals?$filter=appId eq '${appId}'`, {
      method: 'GET',
    });
    return response.value && response.value.length > 0 ? response.value[0] : null;
  } catch (error) {
    console.error(error);
    throw new Error('Unable to retrieve the Entra service principal');
  }
};

export const deleteServicePrincipal = async (servicePrincipalId: string): Promise<void> => {
  try {
    await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/servicePrincipals/${servicePrincipalId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(error);
    throw new Error('Unable to delete the Entra service principal');
  }
};

export const getAppRegistrationByAppId = async (appId: string): Promise<Application | null> => {
  try {
    const response = await callAzureGraphApi(`${MS_GRAPH_URL}/v1.0/applications?$filter=appId eq '${appId}'`, {
      method: 'GET',
    });
    return response.value && response.value.length > 0 ? response.value[0] : null;
  } catch (error) {
    console.error(error);
    throw new Error('Unable to retrieve the Entra application registration by appId');
  }
};

export const getAssignedClaimMappingPolicies = async (servicePrincipalId: string) => {
  try {
    const response = await callAzureGraphApi(
      `https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/claimsMappingPolicies`,
      {
        method: 'GET',
      },
    );
    return response.value && response.value.length > 0 ? response.value[0] : null;
  } catch (error) {
    console.error(error);
    throw new Error(
      `Unable to retrieve the assigned claim mapping policies for the service principal with ID: ${servicePrincipalId}`,
    );
  }
};

export const assignClaimMappingPolicy = async (servicePrincipalId: string, policyId: string) => {
  try {
    await callAzureGraphApi(
      `https://graph.microsoft.com/beta/servicePrincipals/${servicePrincipalId}/claimsMappingPolicies/$ref`,
      {
        method: 'POST',
        data: {
          '@odata.id': `https://graph.microsoft.com/beta/policies/claimsMappingPolicies/${policyId}`,
        },
      },
    );
  } catch (error) {
    console.error(error);
    throw new Error(
      `Unable to assign the claim mapping policy with ID: ${policyId} to the service principal with ID: ${servicePrincipalId}`,
    );
  }
};
