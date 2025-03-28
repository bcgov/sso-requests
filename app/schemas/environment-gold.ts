import { RJSFSchema } from '@rjsf/utils';
import { Integration } from '../interfaces/Request';
import { devValidRedirectUris } from './providers';
import FieldAccessTokenTop from '@app/form-components/FieldAccessTokenTop';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { include_bc_services_card } = publicRuntimeConfig;

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

export default function getSchemas(formData: Integration) {
  return (formData.environments || []).map((env) => {
    const loginTitleField = `${env}LoginTitle`;
    const displayHeaderTitleField = `${env}DisplayHeaderTitle`;
    const redirectUriField = `${env}ValidRedirectUris`;
    const roleField = `${env}Roles`;
    const samlLogoutPostBindingUriField = `${env}SamlLogoutPostBindingUri`;
    const samlSignAssertionsField = `${env}SamlSignAssertions`;
    const homePageUriField = `${env}HomePageUri`;

    let tokenSchemas: any = {};

    if (formData?.protocol === 'saml') {
      const assertionLifespanField = `${env}AssertionLifespan`;

      tokenSchemas = {
        [assertionLifespanField]: {
          title: 'Assertion Lifespan',
          type: 'number',
          tooltipContent:
            'Lifespan set in the SAML assertion conditions. After that time the assertion will be invalid. The "SessionNotOnOrAfter" attribute is not modified and continue using the "SSO Session Max" time defined at realm level.',
          additionalClassNames: 'mt-1',
        },
      };
    } else {
      const accessTokenLifespanField = `${env}AccessTokenLifespan`;
      const sessionIdleTimeoutField = `${env}SessionIdleTimeout`;
      const sessionMaxLifespanField = `${env}SessionMaxLifespan`;
      const offlineSessionIdleTimeoutField = `${env}OfflineSessionIdleTimeout`;
      const offlineSessionMaxLifespanField = `${env}OfflineSessionMaxLifespan`;
      const offlineAccessEnabledField = `${env}OfflineAccessEnabled`;

      tokenSchemas = {
        [accessTokenLifespanField]: {
          title: 'Access Token Lifespan',
          type: 'number',
          tooltip: {
            content:
              'Max time before an access token is expired. This value is recommended to be short relative to the SSO timeout.',
          },
          additionalClassNames: 'mt-1',
          top: FieldAccessTokenTop,
        },
        [sessionIdleTimeoutField]: {
          title: 'Client Session Idle',
          type: 'number',
          tooltip: {
            content:
              'Time a client session is allowed to be idle before it expires. Tokens are invalidated when a client session is expired. If not set it uses the standard SSO Session Idle value.',
          },
          additionalClassNames: 'mt-1',
        },
        [sessionMaxLifespanField]: {
          title: 'Client Session Max',
          type: 'number',
          tooltip: {
            content:
              'Max time before a client session is expired. Tokens are invalidated when a client session is expired. If not set, it uses the standard SSO Session Max value.',
          },
          additionalClassNames: 'mt-1',
        },
        [offlineAccessEnabledField]: {
          type: 'boolean',
          title: 'Allow offline access',
          tooltip: { content: 'Allow offline access for this client.' },
          default: false,
          additionalClassNames: 'mt-1',
        },
        [offlineSessionIdleTimeoutField]: {
          title: 'Client Offline Session Idle',
          type: 'number',
          tooltip: {
            content:
              'Time a client offline session is allowed to be idle before it expires. Offline tokens are invalidated when a client offline session is expired. If not set it uses the Offline Session Idle value.',
          },
          additionalClassNames: 'mt-1',
        },
        [offlineSessionMaxLifespanField]: {
          title: 'Client Offline Session Max',
          type: 'number',
          tooltip: {
            content:
              'Max time before a client offline session is expired. Offline tokens are invalidated when a client offline session is expired. If not set, it uses the Offline Session Max value.',
          },
          additionalClassNames: 'mt-1',
        },
      };
    }

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

    const hasLoginFlow = formData.authType !== 'service-account';
    const loginFlowSchemas = hasLoginFlow
      ? {
          [loginTitleField]: {
            type: 'string',
            title: 'Pathfinder SSO Login Page Name',
            tooltip: {
              content: `Enter a name that you would like to be displayed for users, as they're logging into the Pathfinder SSO Login Page. If you leave this field blank, the page will automatically display "Standard"`,
            },
            maxLength: 100,
          },
          [displayHeaderTitleField]: {
            type: 'boolean',
            title: 'Display Pathfinder SSO Header Title',
            tooltip: {
              content: `Enable/Disable display of the header title "Pathfinder SSO" on Pathfinder SSO Login Page`,
            },
            default: true,
          },
          [redirectUriField]: { ...devValidRedirectUris, title: 'Redirect URIs', currentEnvironment: env },
        }
      : {};

    const sharedCustomFields = [`${env}SessionIdleTimeout`, `${env}SessionMaxLifespan`];
    const customValidation = hasLoginFlow
      ? [...sharedCustomFields, redirectUriField, samlLogoutPostBindingUriField, homePageUriField]
      : sharedCustomFields;

    let additionalConfig: any = {};

    if (
      (include_bc_services_card === 'true' || process.env.INCLUDE_BC_SERVICES_CARD === 'true') &&
      formData?.devIdps?.includes('bcservicescard')
    ) {
      additionalConfig[homePageUriField] = {
        type: 'string',
        title: 'Home Page URL',
        tooltip: {
          content: `URL of the home page of your application. The value of this field MUST point to a valid Web page, and will be presented to end users in BCSC Service Listing, and possibly during authentication.`,
        },
        placeholder: 'e.g. https://example.com',
        default: '',
      };
    }

    if (formData?.protocol === 'saml') {
      additionalConfig[samlLogoutPostBindingUriField] = {
        type: 'string',
        title: 'Logout Service URL',
        tooltip: {
          content: `SAML POST Binding URL for the client's single logout service. You can leave this blank if you are using a different binding`,
        },
        maxLength: 250,
        description: 'You may want to have your logout service enabled from your application',
        placeholder: 'e.g. https://example.com/logout/callback',
        default: '',
      };
      additionalConfig[samlSignAssertionsField] = {
        type: 'boolean',
        title: 'Sign Assertions',
        tooltip: {
          content: `Should assertions inside the SAML document be signed?. This setting is not needed if the document is already being signed.`,
        },
        default: false,
      };
    }

    return {
      type: 'object',
      customValidation,
      headerText,
      stepText,
      required: [],
      properties: {
        ...loginFlowSchemas,
        ...additionalConfig,
        ...tokenSchemas,
      },
    } as RJSFSchema;
  });
}
