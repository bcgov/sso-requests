import isString from 'lodash.isstring';
import { errorMessages, environmentOptions } from '@app/utils/constants';
import { LoggedInUser, Team, User } from '@app/interfaces/team';
import { Integration, Option, GoldIDPOption } from '@app/interfaces/Request';
import { Change } from '@app/interfaces/Event';
import { getStatusDisplayName } from '@app/utils/status';
import {
  usesBceid,
  usesGithub,
  checkNotBceidGroup,
  checkNotGithubGroup,
  usesBcServicesCard,
  checkNotBcServicesCard,
  checkBceidGroup,
  usesSocial,
  checkNotSocial,
} from '@app/helpers/integration';

export const formatFilters = (idps: Option[], envs: Option[]) => {
  const gold_realms: GoldIDPOption = {
    idir: ['idir', 'azureidir'],
    bceid: ['bceidbasic', 'bceidbusiness', 'bceidboth'],
    github: ['githubbcgov', 'githubpublic'],
    digitalCredential: 'digitalcredential',
    bcservicescard: 'bcservicescard',
    social: 'social',
  };

  let realms: string[] | null = [];
  let devIdps: string[] | null = [];

  idps.forEach((idp: Option) => {
    if (idp.value == 'github') {
      devIdps = devIdps?.concat(gold_realms['github']) || null;
    } else if (idp.value == 'idir') {
      devIdps = devIdps?.concat(gold_realms['idir']) || null;
    } else if (idp.value == 'bceid') {
      devIdps = devIdps?.concat(gold_realms['bceid']) || null;
    } else if (idp.value === 'digitalcredential') {
      devIdps = devIdps?.concat(gold_realms.digitalCredential) || null;
    } else if (idp.value === 'bcservicescard') {
      devIdps = devIdps?.concat(gold_realms.bcservicescard) || null;
    } else if (idp.value === 'social') {
      devIdps = devIdps?.concat(gold_realms.social) || null;
    }
  });

  realms = realms.length > 0 ? realms : null;
  devIdps = devIdps.length > 0 ? devIdps : null;
  let formattedEnvironments: string[] | null = envs.map((env: Option) => env.value as string);
  formattedEnvironments = formattedEnvironments.length > 0 ? formattedEnvironments : null;
  return [devIdps, realms, formattedEnvironments];
};

export const getRequestedEnvironments = (integration: Integration) => {
  const {
    bceidApproved,
    githubApproved,
    bcServicesCardApproved,
    environments = [],
    serviceType,
    socialApproved,
  } = integration;

  const hasBceid = usesBceid(integration);
  const hasGithub = usesGithub(integration);
  const hasBcServicesCard = usesBcServicesCard(integration);
  const hasSocial = usesSocial(integration);
  const options = environmentOptions.map((option) => {
    const idps = integration.devIdps;
    return { ...option, idps: idps || [] };
  });

  if (serviceType === 'gold') {
    const bceidApplying = checkIfBceidProdApplying(integration);
    const githubApplying = checkIfGithubProdApplying(integration);
    const bcServicesCardApplying = checkIfBcServicesCardProdApplying(integration);
    const socialApplying = checkIfSocialProdApplying(integration);

    let envs = options.filter((env) => environments.includes(env.name));
    if (hasBceid && (!bceidApproved || bceidApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter(checkNotBceidGroup);
        return env;
      });

    if (hasGithub && (!githubApproved || githubApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter(checkNotGithubGroup);
        return env;
      });

    if (hasBcServicesCard && (!bcServicesCardApproved || bcServicesCardApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter(checkNotBcServicesCard);
        return env;
      });

    if (hasSocial && (!socialApproved || socialApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter(checkNotSocial);
        return env;
      });

    return envs;
  }

  let allowedEnvs = environments.concat() || [];
  if (hasBceid && !bceidApproved) allowedEnvs = allowedEnvs.filter((env) => env !== 'prod');
  return options.filter((env) => allowedEnvs.includes(env.name));
};

export const parseError = (err: any) => {
  if (isString(err)) return err;

  if (err.validationError) {
    return 'validation failed';
  }

  return JSON.stringify(err);
};

// Convert Payload from Base64-URL to JSON
export const decodePayload = (payload: string) => {
  if (!payload) return null;

  const cleanedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
  const decodedPayload = atob(cleanedPayload);
  const uriEncodedPayload = Array.from(decodedPayload).reduce((acc, char) => {
    const uriEncodedChar = ('00' + char.charCodeAt(0).toString(16)).slice(-2);
    return `${acc}%${uriEncodedChar}`;
  }, '');
  const jsonPayload = decodeURIComponent(uriEncodedPayload);

  return JSON.parse(jsonPayload);
};

// Parse JWT Payload
export const parseJWTPayload = (token: string) => {
  if (!token) return null;
  const [, payload] = token.split('.');
  return decodePayload(payload);
};

// Parse JWT Header
export const parseJWTHeader = (token: string) => {
  if (!token) return null;
  const [header] = token.split('.');
  return decodePayload(header);
};

// Generate a Random String
export const getRandomString = () => {
  const randomItems = new Uint32Array(28);
  crypto.getRandomValues(randomItems);
  const binaryStringItems: string[] = [];
  randomItems.forEach((dec) => binaryStringItems.push(`0${dec.toString(16).substr(-2)}`));
  return binaryStringItems.reduce((acc: string, item: string) => `${acc}${item}`, '');
};

// Encrypt a String with SHA256
export const encryptStringWithSHA256 = async (str: string) => {
  const PROTOCOL = 'SHA-256';
  const textEncoder = new TextEncoder();
  const encodedData = textEncoder.encode(str);
  return crypto.subtle.digest(PROTOCOL, encodedData);
};

// Convert Hash to Base64-URL
export const hashToBase64url = (arrayBuffer: Iterable<number>) => {
  const items = new Uint8Array(arrayBuffer);
  const stringifiedArrayHash = items.reduce((acc, i) => `${acc}${String.fromCharCode(i)}`, '');
  const decodedHash = btoa(stringifiedArrayHash);

  return decodedHash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const changeNullToUndefined = (data: any) => {
  Object.entries(data).forEach(([key, value]) => {
    // RJSF won't use default values if key exists
    if (value === null) delete data[key];
  });
  return data;
};

export const processRequest = (request: Integration): Integration => {
  if (!request.devValidRedirectUris || request.devValidRedirectUris.length === 0) {
    request.devValidRedirectUris = [''];
  }

  if (!request.testValidRedirectUris || request.testValidRedirectUris.length === 0) {
    request.testValidRedirectUris = [''];
  }

  if (!request.prodValidRedirectUris || request.prodValidRedirectUris.length === 0) {
    request.prodValidRedirectUris = [''];
  }

  if (request.teamId) request.teamId = String(request.teamId);
  else if (request.status !== 'draft') request.usesTeam = false;

  return changeNullToUndefined(request);
};

export const transformErrors = (errors: any) => {
  return errors.map((error: any) => {
    const propertiesToTransform = Object.keys(errorMessages).map((key) => `${key}`);

    const errorProperty = error.property.startsWith('.') ? error.property.split('.')[1] : error.property;

    if (propertiesToTransform.includes(errorProperty)) {
      const errorMessageKey = errorProperty;

      error.message = errorMessages[errorMessageKey] || error.message;
    } else if (
      error.property.includes('ValidRedirectUris') ||
      error.property.includes('SamlLogoutPostBindingUri') ||
      error.property.includes('bcscAttributes')
    ) {
      if (error.message === 'should be string') error.message = '';
      else if (error.message === 'should NOT have fewer than 1 items') error.message = '';
      else error.message = errorMessages.redirectUris;
    }

    return error;
  });
};

export const formatChangeEventDetails = (changes: Change[]) => {
  if (!changes || changes.length === 0) return <div>No changes</div>;

  const changesJSX = changes.map((change) => {
    const { kind, lhs, rhs, path, item } = change;
    const changedPath = path[0];
    switch (kind) {
      case 'E':
        return (
          <>
            <strong>Edited {changedPath}: </strong>
            Changed <code>{String(lhs)}</code> to <code>{String(rhs)}</code>
          </>
        );
      case 'A':
        if (item?.kind === 'D')
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Deleted <code> {item?.lhs}</code>
            </>
          );
        if (item?.kind === 'N')
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Added <code>{item?.rhs}</code>
            </>
          );
        else
          return (
            <>
              <strong>Changed Array {changedPath}: </strong>
              Edited{' '}
              <code>
                {item?.lhs} to {item?.rhs}
              </code>
            </>
          );
      case 'N':
        return (
          <>
            <strong>Added {changedPath}: </strong>
            <code>{item}</code>
          </>
        );
      case 'D':
        return (
          <>
            <strong>Deleted {changedPath} </strong>
          </>
        );
      default:
        return <code>{JSON.stringify(change, null, 2)}</code>;
    }
  });
  return (
    <ul>
      {changesJSX.map((change, i) => (
        <li key={i}>{change}</li>
      ))}
    </ul>
  );
};

export const hasAnyPendingStatus = (requests: Integration[]) => {
  return requests.some((request) => {
    return [
      // 'draft',
      'submitted',
      'pr',
      'prFailed',
      'planned',
      'planFailed',
      'approved',
      // 'applied',
      'applyFailed',
    ].includes(request.status || '');
  });
};

interface Args {
  integration: Integration | undefined;
  formData: Integration;
  formStage: number;
  teams: Team[];
}

export function canDeleteMember(members: User[], memberId?: number) {
  if (members.length === 1) return false;
  const memberToDelete = members.find((member) => member.id === memberId);
  const memberIsLastAdmin =
    members.filter((member) => member.role === 'admin').length === 1 && memberToDelete?.role === 'admin';
  if (memberIsLastAdmin) return false;
  return true;
}

export const capitalize = (string: string) => string.charAt(0).toUpperCase() + string.slice(1);

const checkIfProdApplying = (integration: Integration, target: string) => {
  const displayStatus = getStatusDisplayName(integration.status || 'draft');
  if (displayStatus !== 'Submitted') return false;
  if (!integration.lastChanges || integration.lastChanges.length === 0) return false;

  return integration.lastChanges.some((change) => {
    return change.path[0] === target && change.lhs === false && change.rhs === true;
  });
};

export const checkIfBceidProdApplying = (integration: Integration) => {
  return checkIfProdApplying(integration, 'bceidApproved');
};

export const checkIfGithubProdApplying = (integration: Integration) => {
  return checkIfProdApplying(integration, 'githubApproved');
};

export const checkIfDigitalCredentialProdApplying = (integration: Integration) => {
  const prodApplying = checkIfProdApplying(integration, 'digitalCredentialApproved');
  return prodApplying;
};

export const checkIfBcServicesCardProdApplying = (integration: Integration) => {
  const prodApplying = checkIfProdApplying(integration, 'bcServicesCardApproved');
  return prodApplying;
};

export const checkIfSocialProdApplying = (integration: Integration) => {
  const prodApplying = checkIfProdApplying(integration, 'social');
  return prodApplying;
};

export const subtractDaysFromDate = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

export const isBceidApprover = (session: LoggedInUser) => {
  return session.client_roles?.includes('bceid-approver');
};

export const isGithubApprover = (session: LoggedInUser) => {
  return session.client_roles?.includes('github-approver');
};

export const isSocialApprover = (session: LoggedInUser) => {
  return session.client_roles?.includes('social-approver');
};

export const isBcServicesCardApprover = (session: LoggedInUser) => {
  return session.client_roles?.includes('bc-services-card-approver');
};

export const isIdpApprover = (session: LoggedInUser) => {
  if (
    isBceidApprover(session) ||
    isGithubApprover(session) ||
    isBcServicesCardApprover(session) ||
    isSocialApprover(session)
  )
    return true;
  return false;
};

export const getDiscontinuedIdps = () => {
  return ['idir'];
};

export const getAllowedIdps = () => {
  return [
    'azureidir',
    'bceidbasic',
    'bceidbusiness',
    'bceidboth',
    'bcservicescard',
    'digitalcredential',
    'githubpublic',
    'githubbcgov',
  ];
};

/**
 * Returns true if valid combination and false otherwise. Invalid combinations are mixing bceidboth with any other type
 */
const isInvalidBceidCombo = (idps: string[] = []) => {
  if (!idps.includes('bceidboth')) return false;
  if (idps.includes('bceidbasic') || idps.includes('bceidbusiness')) return true;
  return false;
};

/**
 * Returns true if valid combination and false otherwise. Invalid combinations are mixing github public and bcgov together
 */
const isInvalidGithubCombo = (idps: string[] = []) => idps.includes('githubpublic') && idps.includes('githubbcgov');

const idpsEqual = (idpsA: string[], idpsB: string[]) => {
  const allAInB = idpsA.every((idp) => idpsB.includes(idp));
  const allBInA = idpsB.every((idp) => idpsA.includes(idp));
  return allAInB && allBInA;
};

/**
 * Shared validation function for client and API. Returns true if the updated idps are allowed and false otherwise.
 */
export const validateIDPs = ({
  currentIdps,
  updatedIdps,
  applied = true,
  bceidApproved = false,
  protocol = 'oidc',
  isAdmin = false,
  githubApproved = false,
  bcServicesCardApproved = false,
}: {
  currentIdps: string[];
  updatedIdps: string[];
  applied?: boolean;
  bceidApproved?: boolean;
  protocol?: string;
  isAdmin?: boolean;
  githubApproved?: boolean;
  bcServicesCardApproved?: boolean;
}) => {
  if (idpsEqual(currentIdps, updatedIdps)) return true;

  if (protocol === 'saml') {
    if (updatedIdps.length > 1) return false;
    if (bceidApproved && currentIdps[0] !== updatedIdps[0]) return false;
  }

  const invalidBceidCombo = isInvalidBceidCombo(updatedIdps);
  const invalidGithubCombo = isInvalidGithubCombo(updatedIdps);
  if (invalidBceidCombo || invalidGithubCombo) return false;

  // Exclude admin-only options
  if (!isAdmin && updatedIdps.includes('githubpublic')) {
    return false;
  }
  const addingGithub =
    (updatedIdps.includes('githubbcgov') && !currentIdps.includes('githubbcgov')) ||
    (updatedIdps.includes('githubpublic') && !currentIdps.includes('githubpublic'));
  if (addingGithub && githubApproved) {
    return false;
  }

  if (bceidApproved) {
    const newBceidIdps = updatedIdps.filter(checkBceidGroup);
    const previousBceidIdps = currentIdps.filter(checkBceidGroup);
    if (newBceidIdps.some((idp) => !previousBceidIdps.includes(idp))) return false;
  }

  const discontinuedIdps = getDiscontinuedIdps();
  if (!isAdmin) {
    for (let idp of discontinuedIdps) {
      if (!currentIdps.includes(idp) && updatedIdps.includes(idp)) return false;
    }
  }

  // No one can remove bcsc after approval
  if (bcServicesCardApproved && !updatedIdps.includes('bcservicescard') && currentIdps.includes('bcservicescard')) {
    return false;
  }

  // No one can add bcsc after approval
  if (bcServicesCardApproved && !currentIdps.includes('bcservicescard') && updatedIdps.includes('bcservicescard')) {
    return false;
  }

  return true;
};
