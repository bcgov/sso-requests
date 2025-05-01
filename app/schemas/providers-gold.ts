import { Integration } from '../interfaces/Request';
import { Schema } from './index';
import { idpMap } from '@app/helpers/meta';
import getConfig from 'next/config';
import { docusaurusURL, formatWikiURL } from '@app/utils/constants';
import { BcscAttribute, BcscPrivacyZone } from '@app/interfaces/types';
import { usesBcServicesCard, usesSocial } from '@app/helpers/integration';
import { getDiscontinuedIdps } from '@app/utils/helpers';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { include_digital_credential, include_bc_services_card, allow_bc_services_card_prod, include_social } =
  publicRuntimeConfig;

export default function getSchema(
  integration: Integration,
  context: { isAdmin?: boolean } = { isAdmin: true },
  bcscPrivacyZones?: BcscPrivacyZone[],
  bcscAttributes?: BcscAttribute[],
) {
  const { protocol, authType, status, devIdps } = integration;
  const applied = status === 'applied';

  const allow_bcsc_prod = allow_bc_services_card_prod === 'true' || process.env.ALLOW_BC_SERVICES_CARD_PROD === 'true';
  let include_bcsc = include_bc_services_card === 'true' || process.env.INCLUDE_BC_SERVICES_CARD === 'true';
  const includeSocial = include_social === 'true' || process.env.INCLUDE_SOCIAL === 'true';

  if (integration.environments?.includes('prod') && !allow_bcsc_prod) {
    include_bcsc = false;
  }

  const bcscSelected = usesBcServicesCard(integration);
  const socialSelected = usesSocial(integration);

  const protocolSchema = {
    type: 'string',
    title: 'Select Client Protocol',
    enum: ['oidc', 'saml'],

    tooltip: {
      content: 'The OpenID Connect (OIDC) client protocol is recommended.',
    },
    tooltips: [
      null,
      {
        content: `To read more about SAML configuration options and limitations, see <a href="${docusaurusURL}/integrating-your-application/saml" target="_blank" title="SAML Integrations">here</a>.`,
        hide: 3000,
      },
    ],
  };

  const privacyZonesSchema = {
    type: 'string',
    title: 'Please select privacy zone',
    enum: bcscPrivacyZones?.map((zone) => zone.privacy_zone_name || []),
  };

  const properties: any = {
    protocol: protocolSchema,
  };

  const required = [];

  if (protocol === 'oidc') {
    properties.authType = {
      type: 'string',
      title: 'Select Usecase',
      enum: ['browser-login', 'service-account', 'both'],
      tooltip: applied
        ? null
        : {
            content: `Note that once this is submitted, you will not be able to update and rather will need to create a new integration.`,
          },
      tooltips: [
        {
          content: `This enables standard OpenID Connect redirect based authentication with authorization code. In terms of OpenID Connect or OAuth2 specifications, this enables support of 'Authorization Code Flow' for this client.`,
        },
        {
          content: `This allows you to authenticate this client to Keycloak and retrieve access token dedicated to this client. In terms of OAuth2 specification, this enables support of 'Client Credentials Grant' for this client.`,
        },
        {
          content: `This enables 'Browser Login' and 'Service Account' both.`,
        },
      ],
    };

    if (authType === 'browser-login') {
      properties.publicAccess = {
        type: 'boolean',
        title: 'Select Client Type',
        enum: [true, false],
      };
    }

    required.push('publicAccess');
  }

  if (authType !== 'service-account') {
    const idpEnum = ['azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth', 'githubpublic', 'githubbcgov'];

    /*
      Schemas are shared between lambda functions and client app to keep validations in sync.
      They set env vars differently though, process.env is used in lambdas but publicRuntimeConfig in client app.
      Need to check both to see if dc is allowed.
    */
    const include_dc = include_digital_credential === 'true' || process.env.INCLUDE_DIGITAL_CREDENTIAL === 'true';

    if (include_dc) {
      idpEnum.push('digitalcredential');
    }

    if (include_bcsc) {
      idpEnum.push('bcservicescard');
    }

    if (includeSocial) {
      idpEnum.push('social');
    }

    // grandfather existing integrations and allow them to remove discontinued IDPs
    getDiscontinuedIdps().forEach((idp) => {
      if (devIdps?.includes(idp) && !idpEnum.includes(idp)) {
        idpEnum.unshift(idp);
      }
    });

    if (context.isAdmin && !idpEnum?.includes('idir')) idpEnum?.unshift('idir');

    properties.devIdps = {
      type: 'array',
      minItems: 1,
      title: 'Choose Identity Provider(s)',
      items: {
        type: 'string',
        enum: idpEnum,
      },
      warningMessage:
        'Role assignment is not available for the BC Services Card and Digital Credential Identity Providers.',
      tooltips: idpEnum.map((idp) => {
        if (idp === 'azureidir') {
          return {
            content: `
            To learn the difference between IDIR and IDIR with MFA,
            <a href="${formatWikiURL(
              '/Our-Partners-the-Identity-Providers#idir-with-mfa',
            )}" target="_blank" title="IDIR vs IDIR with MFA">
            please visit our GitHub page about choosing an Identity Provider
            </a>
            `,
            hide: 3000,
          };
        }
        if (idp === 'digitalcredential') {
          return {
            content: `To learn more about using the Digital Credential option visit our <a href="${formatWikiURL(
              'Our-Partners-the-Identity-Providers#what-are-identity-providers',
            )}" target="_blank">additional information</a>.`,
            hide: 3000,
          };
        }
        if (idp === 'bcservicescard') {
          return {
            content: `To learn more about using the BC Services Card option visit our <a href="${formatWikiURL(
              'Our-Partners-the-Identity-Providers#what-are-identity-providers',
            )}" target="_blank">additional information</a>.`,
            hide: 3000,
          };
        }
        return null;
      }),
      uniqueItems: true,
      tooltip: {
        content: `The identity providers you add will let your users authenticate with those services.`,
      },
    };
  }

  if (socialSelected && includeSocial) {
    properties.confirmSocial = {
      type: 'boolean',
      title:
        'Do you acknowledge and agree that by choosing social login, your application will not handle, transmit, or process any protected data (i.e., Protected A, Protected B, or Protected C)? If any such protected data needs to be processed now or in the future, you need to select a different Identity Provider (IDP).',
      default: null,
      enum: [null, true],
    };
  }

  if (bcscSelected && include_bcsc) {
    properties.bcscPrivacyZone = privacyZonesSchema;

    properties.bcscAttributes = {
      type: 'array',
      title: 'Please select attribute(s)',
      items: {
        type: 'string',
        enum: bcscAttributes?.map((attribute) => attribute.name),
      },
      uniqueItems: true,
      tooltip: {
        content: `We will provide a separate client for each attribute you can select. Select the attributes required for your project.`,
      },
    };
  }

  properties.environments = {
    type: 'array',
    minItems: 1,
    title: 'Choose Environment(s)',
    items: {
      type: 'string',
      enum: ['dev', 'test', 'prod'],
    },
    uniqueItems: true,
    tooltip: {
      content: `We will provide a separate client for each environment you can select. Select the environments required for your project.`,
    },
  };

  // Don't show BCSC option if feature flag is off and prod is selected
  if (!allow_bcsc_prod && bcscSelected) {
    properties.environments.items = {
      type: 'string',
      enum: ['dev', 'test'],
    };
  }

  if (protocol !== 'saml') {
    properties.additionalRoleAttribute = {
      type: 'string',
      title: 'Additional Role Attribute(optional)',
      tooltip: {
        content: `By default "client_roles" is the default attribute key name to include roles info, if you wish to include same info in another attribute, then use this.`,
      },
      maxLength: 50,
    };
  }

  if (protocol === 'saml' && context.isAdmin) {
    properties.clientId = {
      type: 'string',
      title: 'As SSO Admin. you can override the client id',
      tooltip: {
        content: `The client id should be a string without any spaces`,
      },
      maxLength: 250,
    };
  }

  return {
    type: 'object',
    customValidation: [
      'additionalRoleAttribute',
      'clientId',
      'devIdps',
      'authType',
      'bcscPrivacyZone',
      'bcscAttributes',
    ],
    headerText: 'Choose providers',
    stepText: 'Basic Info',
    properties,
    required,
  } as Schema;
}
