import isNil from 'lodash.isnil';
import uniq from 'lodash.uniq';
import FieldProjectTeam from '@app/form-components/FieldProjectTeam';
import ClientTypeWidget from '@app/form-components/widgets/ClientTypeWidget';
import ClientTokenWidget from '@app/form-components/widgets/ClientTokenWidget';
import TooltipRadioWidget from '@app/form-components/widgets/TooltipRadioWidget';
import TooltipIDPCheckboxesWidget from '@app/form-components/widgets/TooltipIDPCheckboxesWidget';
import FieldTermsAndConditions from '@app/form-components/FieldTermsAndConditions';
import FieldRequesterInfo from '@app/form-components/FieldRequesterInfo';
import FieldReviewAndSubmit from '@app/form-components/FieldReviewAndSubmit';
import FieldInlineGrid from '@app/form-components/FieldInlineGrid';
import { Integration } from '@app/interfaces/Request';
import { oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';
import MinutesToSeconds from '@app/form-components/widgets/MinutesToSeconds';
import SwitchWidget from '@app/form-components/widgets/SwitchWidget';
import get from 'lodash.get';
import BcscAttributesWidget from '@app/form-components/widgets/BcscAttributesWidget';
import BcscPrivacyZoneWidget from '@app/form-components/widgets/BcscPrivacyZoneWidget';
import { envMap, idpMap } from '@app/helpers/meta';
import { environments } from '@app/utils/constants';
import { Environment } from '@app/interfaces/types';
import { Team, LoggedInUser } from '@app/interfaces/team';
import { GetStandardSettingsResponse } from '@app/interfaces/api';
import { hasAppPermission, appPermissions } from '@app/utils/authorize';

interface Props {
  integration: Integration;
  formData?: Integration;
  session: LoggedInUser | null;
  teams: Team[];
  schemas: any;
  defaultSessionSettings: GetStandardSettingsResponse;
}

const envs = environments as Environment[];

const getUISchema = ({ integration, formData, session, teams, schemas, defaultSessionSettings }: Props) => {
  const {
    id,
    status,
    devIdps = [],
    environments = [],
    bceidApproved = false,
    bcServicesCardApproved = false,
    githubApproved = false,
    otpApproved = false,
  } = integration || {};
  const isNew = isNil(id);
  const isApplied = status === 'applied';
  const disableBcscUpdateApproved = integration?.devIdps?.includes('bcservicescard') && bcServicesCardApproved;
  const disableOtpUpdateApproved = integration?.devIdps?.includes('otp') && otpApproved;
  const isSaml = integration?.protocol === 'saml';

  const envDisabled = isApplied ? environments?.concat() || [] : ['dev'];
  let idpDisabled: string[] = [];
  let idpHidden: string[] = [];
  let allIdpsDisabled = false;

  // If applied AND approved, ALL users can only remove. Removal will reset the approval, allowing them to add again.
  // Allowing this in one swipe really complicates things, mostly because there is one "bceidapproved" flag and not 3.
  if (isApplied) {
    if (isSaml && bceidApproved) {
      allIdpsDisabled = true;
    }
    if (bceidApproved) {
      ['bceidbasic', 'bceidbusiness', 'bceidboth'].forEach((bceidIdp) => {
        if (!devIdps.includes(bceidIdp)) idpDisabled.push(bceidIdp);
      });
    }
    if (githubApproved) {
      ['githubpublic', 'githubbcgov'].forEach((githubIdp) => {
        if (!devIdps.includes(githubIdp)) idpDisabled.push(githubIdp);
      });
    }
    if (bcServicesCardApproved) {
      idpDisabled.push('bcservicescard');
    }
    if (otpApproved) {
      idpDisabled.push('otp');
    }
  }

  idpDisabled = uniq(idpDisabled);

  // Only admins or integrations already using public github can use the IDP.
  if (
    !hasAppPermission(session?.client_roles, appPermissions.ADD_RESTRICTED_IDPS) &&
    (!isApplied || !devIdps.includes('githubpublic'))
  )
    idpHidden.push('githubpublic');

  // Only admins can use OTP.
  if (!hasAppPermission(session?.client_roles, appPermissions.ADD_RESTRICTED_IDPS)) idpHidden.push('otp');

  // Disabling saml for DC integrations until appending pres_req_conf_id is figured out.
  if (formData?.protocol === 'saml') {
    idpDisabled.push('digitalcredential');
  }

  const includeComment = isApplied && hasAppPermission(session?.client_roles, appPermissions.ADD_REQUEST_COMMENT);

  const tokenFields: any = {};

  const bcServicesCardFields: any = {
    bcscPrivacyZone: {
      'ui:widget': BcscPrivacyZoneWidget,
      'ui:classNames': 'short-field-string',
      'ui:disabled': disableBcscUpdateApproved || disableOtpUpdateApproved,
    },
    bcscAttributes: {
      'ui:widget': BcscAttributesWidget,
      'ui:disabled': disableBcscUpdateApproved,
    },
  };

  if (!['bcservicescard', 'otp'].some((val) => formData?.devIdps?.includes(val))) {
    bcServicesCardFields['bcscPrivacyZone']['ui:widget'] = 'hidden';
    bcServicesCardFields['bcscPrivacyZone']['ui:label'] = false;
  }

  if (!formData?.devIdps?.includes('bcservicescard')) {
    bcServicesCardFields['bcscAttributes']['ui:widget'] = 'hidden';
    bcServicesCardFields['bcscAttributes']['ui:field'] = 'hidden';
  }

  const durationAdditionalFields =
    formData?.protocol === 'saml' ? samlDurationAdditionalFields : oidcDurationAdditionalFields;

  for (const env of envs) {
    const OfflineAccessEnabled = get(formData, `${env}OfflineAccessEnabled`, false);
    for (let y = 0; y < durationAdditionalFields.length; y++) {
      let inheritedRealmSetting: string;
      switch (durationAdditionalFields[y]) {
        case 'SessionIdleTimeout':
          inheritedRealmSetting = defaultSessionSettings[env].ssoSessionIdleTimeout;
          break;
        case 'SessionMaxLifespan':
          inheritedRealmSetting = defaultSessionSettings[env].ssoSessionMaxLifespan;
          break;
        case 'AccessTokenLifespan':
          inheritedRealmSetting = defaultSessionSettings[env].accessTokenLifespan;
          break;
        case 'OfflineSessionIdleTimeout':
          inheritedRealmSetting = defaultSessionSettings[env].offlineSessionIdleTimeout;
          break;
        case 'OfflineSessionMaxLifespan':
          inheritedRealmSetting = defaultSessionSettings[env].offlineSessionMaxLifespan;
          break;
        default:
          inheritedRealmSetting = 'Inherited from realm settings';
      }
      const minuteOnlyFields = ['SessionIdleTimeout', 'SessionMaxLifespan'];
      let def: any = {
        'ui:widget': minuteOnlyFields.includes(durationAdditionalFields[y]) ? MinutesToSeconds : ClientTokenWidget,
        'ui:readonly': !hasAppPermission(
          session?.client_roles || [],
          appPermissions.UPDATE_REQUEST_ADDITIONAL_SETTINGS,
        ),
        'ui:FieldTemplate': FieldInlineGrid,
        'ui:inheritedRealmSetting': inheritedRealmSetting,
      };

      tokenFields[`${env}${durationAdditionalFields[y]}`] = def;
    }

    tokenFields[`${env}OfflineAccessEnabled`] = {
      'ui:widget': SwitchWidget,
      'ui:FieldTemplate': FieldInlineGrid,
      'ui:readonly': !hasAppPermission(session?.client_roles, appPermissions.UPDATE_REQUEST_ADDITIONAL_SETTINGS),
    };

    if (formData?.protocol === 'oidc') {
      if (!OfflineAccessEnabled) {
        tokenFields[`${env}OfflineSessionIdleTimeout`]['ui:readonly'] = true;
        tokenFields[`${env}OfflineSessionMaxLifespan`]['ui:readonly'] = true;
      }
    }
  }

  return {
    projectName: {
      'ui:placeholder': 'Project Name',
      'ui:classNames': 'short-field-string',
    },
    teamId: {
      'ui:classNames': 'short-field-string',
      'ui:enumNames': ['Select...'].concat(teams.map((team) => team.name) ?? []),
    },
    additionalRoleAttribute: {
      'ui:classNames': 'short-field-string',
    },
    clientId: {
      'ui:readonly': !hasAppPermission(session?.client_roles, appPermissions.UPDATE_SAML_REQUEST_CLIENT_ID),
      'ui:classNames': 'short-field-string',
    },
    devLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      'ui:classNames': 'short-field-string',
    },
    testLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      'ui:classNames': 'short-field-string',
    },
    prodLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      'ui:classNames': 'short-field-string',
    },
    devDisplayHeaderTitle: {
      'ui:widget': SwitchWidget,
    },
    testDisplayHeaderTitle: {
      'ui:widget': SwitchWidget,
    },
    prodDisplayHeaderTitle: {
      'ui:widget': SwitchWidget,
    },
    devSamlSignAssertions: {
      'ui:widget': SwitchWidget,
    },
    testSamlSignAssertions: {
      'ui:widget': SwitchWidget,
    },
    prodSamlSignAssertions: {
      'ui:widget': SwitchWidget,
    },
    usesTeam: {
      'ui:widget': SwitchWidget,
      'ui:readonly': isApplied && integration?.usesTeam,
    },
    projectLead: {
      'ui:FieldTemplate': FieldRequesterInfo,
      'ui:widget': SwitchWidget,
      'ui:readonly': isApplied,
    },
    newToSso: {
      'ui:widget': SwitchWidget,
    },
    primaryEndUsers: {
      'ui:widget': 'checkboxes',
      'ui:classNames': 'checkboxes-grid',
      'ui:enumNames': ['People living in BC', 'People doing business/travel in BC', 'BC Gov Employees', 'Other'],
    },
    primaryEndUsersOther: {
      'ui:widget': 'textarea',
      'ui:classNames': 'other-details',
      'ui:label': false,
    },
    publicAccess: {
      'ui:widget': ClientTypeWidget,
      'ui:enumNames': ['Public', 'Confidential'],
    },
    protocol: {
      'ui:widget': TooltipRadioWidget,
      'ui:default': 'oidc',
      'ui:readonly': isApplied,
      'ui:enumNames': ['OpenID Connect', 'SAML'],
    },
    authType: {
      'ui:widget': TooltipRadioWidget,
      'ui:default': 'browser-login',
      'ui:readonly': isApplied,
      'ui:enumNames': ['Browser Login', 'Service Account', 'Browser Login and Service Account'],
    },
    devIdps: {
      'ui:disabled': allIdpsDisabled,
      'ui:widget': TooltipIDPCheckboxesWidget,
      'ui:enumDisabled': idpDisabled,
      'ui:enumHidden': idpHidden,
      'ui:enumNames': schemas[1]?.properties?.devIdps?.items?.enum.map((idp: string) => idpMap[idp]) || [],
    },
    bceidTo: {
      'ui:label': false,
      'ui:readonly': true,
    },
    bceidCc: {
      'ui:label': false,
    },
    bceidBody: {
      'ui:widget': 'textarea',
    },
    environments: {
      'ui:widget': 'checkboxes',
      'ui:enumDisabled': envDisabled,
      'ui:enumNames': schemas[1]?.properties?.environments?.items?.enum.map((env: string) => envMap[env]) || [],
    },
    createTeam: {
      'ui:FieldTemplate': FieldProjectTeam,
      'ui:widget': 'hidden',
      'ui:label': false,
    },
    agreeWithTerms: {
      'ui:FieldTemplate': FieldTermsAndConditions,
    },
    comment: {
      'ui:FieldTemplate': FieldReviewAndSubmit,
      'ui:widget': includeComment ? 'textarea' : 'hidden',
      'ui:label': includeComment,
    },
    devValidRedirectUris: {
      items: {
        'ui:options': {
          label: false,
        },
      },
    },
    testValidRedirectUris: {
      items: {
        'ui:options': {
          label: false,
        },
      },
    },
    prodValidRedirectUris: {
      items: {
        'ui:options': {
          label: false,
        },
      },
    },
    ...bcServicesCardFields,
    ...tokenFields,
  };
};

export default getUISchema;
