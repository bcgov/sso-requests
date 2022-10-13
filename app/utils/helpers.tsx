import isString from 'lodash.isstring';
import { errorMessages, environmentOptions } from 'utils/constants';
import { getSchemas } from 'schemas';
import { Team, User } from 'interfaces/team';
import { Integration, Option } from 'interfaces/Request';
import { Change } from 'interfaces/Event';
import { getStatusDisplayName } from 'utils/status';
import { usesBceid, usesGithub, checkNotGithubGroup } from '@app/helpers/integration';
import { silverRealmIdpsMap } from '@app/helpers/meta';

export const formatFilters = (idps: Option[], envs: Option[]) => {
  let realms: string[] | null = [];
  idps.forEach((idp: Option) => (realms = realms?.concat(idp.value) || null));
  realms = realms.length > 0 ? realms : null;

  let formattedEnvironments: string[] | null = envs.map((env: Option) => env.value as string);
  formattedEnvironments = formattedEnvironments.length > 0 ? formattedEnvironments : null;
  return [realms, formattedEnvironments];
};

export const getRequestedEnvironments = (integration: Integration) => {
  const { bceidApproved, githubApproved, environments = [], serviceType } = integration;

  const hasBceid = usesBceid(integration);
  const hasGithub = usesGithub(integration);
  const options = environmentOptions.map((option) => {
    const idps = serviceType === 'gold' ? integration.devIdps : silverRealmIdpsMap[integration.realm || 'onestopauth'];
    return { ...option, idps: idps || [] };
  });

  if (serviceType === 'gold') {
    const bceidApplying = checkIfBceidProdApplying(integration);
    const githubApplying = checkIfGithubProdApplying(integration);

    let envs = options.filter((env) => environments.includes(env.name));
    if (hasBceid && (!bceidApproved || bceidApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter((idp) => !idp.startsWith('bceid'));
        return env;
      });

    if (hasGithub && (!githubApproved || githubApplying))
      envs = envs.map((env) => {
        if (env.name === 'prod') env.idps = env.idps.filter(checkNotGithubGroup);
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
  else request.usesTeam = false;

  return changeNullToUndefined(request);
};

export const transformErrors = (errors: any) => {
  return errors.map((error: any) => {
    const propertiesToTransform = Object.keys(errorMessages).map((key) => `.${key}`);
    if (propertiesToTransform.includes(error.property)) {
      const errorMessageKey = error.property.slice(1);
      error.message = errorMessages[errorMessageKey] || error.message;
    } else if (error.property.includes('ValidRedirectUris')) {
      if (error.message === 'should be string') error.message = '';
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
            Changed <code>{String(lhs)}</code> to <code>{rhs}</code>
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
