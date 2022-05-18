import { Request } from '../interfaces/Request';
import { devValidRedirectUris } from './providers';
import { Schema } from './index';

export const roles = {
  type: 'array',
  items: { type: 'string', maxLength: 100, placeholder: 'e.g. Administrator' },
  deletableIndex: 0,
  default: [],
  addItemText: 'Add user role',
  description:
    'Add roles your integration, once created, you will have the ability to assign these roles to your users.',
  title: 'User Roles (Optional)',
  tooltip: {
    content:
      '<p>Client roles are an additional attribute you can assign to users at an application level (not a CSS level), to manage access controls.</p><p>Some examples of client roles are: Administrator and Manager</p>',
  },
};

export default function getSchemas(formData: Request) {
  return (formData.environments || []).map((env) => {
    const loginTitleField = `${env}LoginTitle`;
    const redirectUriField = `${env}ValidRedirectUris`;
    const roleField = `${env}Roles`;
    const accessTokenLifespanField = `${env}AccessTokenLifespan`;
    const sessionIdleTimeoutField = `${env}SessionIdleTimeout`;
    const sessionMaxLifespanField = `${env}SessionMaxLifespan`;
    const offlineSessionIdleTimeoutField = `${env}OfflineSessionIdleTimeout`;
    const offlineSessionMaxLifespanField = `${env}OfflineSessionMaxLifespan`;

    let headerText = '';
    let stepText = '';
    if (env === 'prod') {
      headerText = 'Enter Prod integration Info';
      stepText = 'Production';
    } else if (env === 'test') {
      headerText = 'Enter Test integration Info';
      stepText = 'Test';
    } else {
      headerText = 'Enter Dev integration Info';
      stepText = 'Development';
    }

    return {
      type: 'object',
      customValidation: [redirectUriField],
      headerText,
      stepText,
      required: [],
      properties: {
        [loginTitleField]: { type: 'string', title: 'Keycloak Login Page Name', maxLength: 100 },
        [redirectUriField]: { ...devValidRedirectUris, title: 'Redirect URIs' },
        // [roleField]: roles,
        [accessTokenLifespanField]: {
          title: 'Access Token Lifespan',
          type: 'number',
          tooltipContent:
            'Max time before an access token is expired. This value is recommended to be short relative to the SSO timeout.',
          additionalClassNames: 'mt-1',
        },
        [sessionIdleTimeoutField]: {
          title: 'Client Session Idle',
          type: 'number',
          tooltipContent:
            'Time a client session is allowed to be idle before it expires. Tokens are invalidated when a client session is expired. If not set it uses the standard SSO Session Idle value.',
          additionalClassNames: 'mt-1',
        },
        [sessionMaxLifespanField]: {
          title: 'Client Session Max',
          type: 'number',
          tooltipContent:
            'Max time before a client session is expired. Tokens are invalidated when a client session is expired. If not set, it uses the standard SSO Session Max value.',
          additionalClassNames: 'mt-1',
        },
        [offlineSessionIdleTimeoutField]: {
          title: 'Client Offline Session Idle',
          type: 'number',
          tooltipContent:
            'Time a client offline session is allowed to be idle before it expires. Offline tokens are invalidated when a client offline session is expired. If not set it uses the Offline Session Idle value.',
          additionalClassNames: 'mt-1',
        },
        [offlineSessionMaxLifespanField]: {
          title: 'Client Offline Session Max',
          type: 'number',
          tooltipContent:
            'Max time before a client offline session is expired. Offline tokens are invalidated when a client offline session is expired. If not set, it uses the Offline Session Max value.',
          additionalClassNames: 'mt-1',
        },
      },
    } as Schema;
  });
}
