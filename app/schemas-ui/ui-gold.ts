import isNil from 'lodash.isnil';
import uniq from 'lodash.uniq';
import FieldProjectTeam from '@app/form-components/FieldProjectTeam';
import ClientTypeWidget from '@app/form-components/widgets/ClientTypeWidget';
import ClientTokenWidget from '@app/form-components/widgets/ClientTokenWidget';
import TooltipRadioWidget from '@app/form-components/widgets/TooltipRadioWidget';
import TooltipCheckboxesWidget from '@app/form-components/widgets/TooltipCheckboxesWidget';
import FieldTermsAndConditions from '@app/form-components/FieldTermsAndConditions';
import FieldRequesterInfo from '@app/form-components/FieldRequesterInfo';
import FieldReviewAndSubmit from '@app/form-components/FieldReviewAndSubmit';
import FieldInlineGrid from '@app/form-components/FieldInlineGrid';
import { checkBceidGroup, checkGithubGroup } from '@app/helpers/integration';
import { Integration } from '@app/interfaces/Request';
import { oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';
import MinutesToSeconds from '@app/form-components/widgets/MinutesToSeconds';
import SwitchWidget from '@app/form-components/widgets/SwitchWidget';
import get from 'lodash.get';
import BcscAttributesWidget from '@app/form-components/widgets/BcscAttributesWidget';
import BcscPrivacyZoneWidget from '@app/form-components/widgets/BcscPrivacyZoneWidget';
import { envMap, idpMap } from '@app/helpers/meta';
import { Team } from '@app/interfaces/team';

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
  teams: Team[];
  schemas: any;
}

const envs = ['dev', 'test', 'prod'];

const getUISchema = ({ integration, formData, isAdmin, teams, schemas }: Props) => {
  const {
    id,
    status,
    devIdps = [],
    environments = [],
    bceidApproved = false,
    bcServicesCardApproved = false,
  } = integration || {};
  const isNew = isNil(id);
  const isApplied = status === 'applied';
  const disableBcscUpdateApproved = integration?.devIdps?.includes('bcservicescard') && bcServicesCardApproved;

  const envDisabled = isApplied ? environments?.concat() || [] : ['dev'];
  let idpDisabled: string[] = [];
  let idpHidden: string[] = [];

  if (!isAdmin) {
    if (isApplied) {
      devIdps.forEach((idp) => {
        if (checkBceidGroup(idp)) {
          if (bceidApproved) idpDisabled.push('bceidbasic', 'bceidbusiness', 'bceidboth');
        }
        if (checkGithubGroup(idp)) {
          idpDisabled.push('githubpublic', 'githubbcgov');
        }
        if (idp === 'bcservicescard' && bcServicesCardApproved) idpDisabled.push('bcservicescard');
      });
    }

    idpDisabled = uniq(idpDisabled);

    if (!isApplied || !devIdps.includes('githubpublic')) idpHidden.push('githubpublic');
  }

  // Disabling saml for DC integrations until appending pres_req_conf_id is figured out.
  if (formData?.protocol === 'saml') {
    idpDisabled.push('digitalcredential');
  }

  const includeComment = isApplied && isAdmin;

  const tokenFields: any = {};

  const bcServicesCardFields: any = {
    bcscPrivacyZone: {
      'ui:widget': BcscPrivacyZoneWidget,
      'ui:classNames': 'short-field-string',
      'ui:disabled': disableBcscUpdateApproved,
    },
    bcscAttributes: {
      'ui:widget': BcscAttributesWidget,
      'ui:disabled': disableBcscUpdateApproved,
    },
  };

  if (!formData?.devIdps?.includes('bcservicescard')) {
    bcServicesCardFields['bcscPrivacyZone']['ui:widget'] = 'hidden';
    bcServicesCardFields['bcscPrivacyZone']['ui:label'] = false;
    bcServicesCardFields['bcscAttributes']['ui:widget'] = 'hidden';
    bcServicesCardFields['bcscAttributes']['ui:field'] = 'hidden';
  }

  const durationAdditionalFields =
    formData?.protocol === 'saml' ? samlDurationAdditionalFields : oidcDurationAdditionalFields;

  for (let x = 0; x < envs.length; x++) {
    const OfflineAccessEnabled = get(formData, `${envs[x]}OfflineAccessEnabled`, false);
    for (let y = 0; y < durationAdditionalFields.length; y++) {
      const minuteOnlyFields = ['SessionIdleTimeout', 'SessionMaxLifespan'];
      let def: any = {
        'ui:widget': minuteOnlyFields.includes(durationAdditionalFields[y]) ? MinutesToSeconds : ClientTokenWidget,
        'ui:readonly': !isAdmin,
        'ui:FieldTemplate': FieldInlineGrid,
      };

      tokenFields[`${envs[x]}${durationAdditionalFields[y]}`] = def;
    }

    tokenFields[`${envs[x]}OfflineAccessEnabled`] = {
      'ui:widget': SwitchWidget,
      'ui:FieldTemplate': FieldInlineGrid,
      'ui:readonly': !isAdmin,
    };

    if (formData?.protocol === 'oidc') {
      if (!OfflineAccessEnabled) {
        tokenFields[`${envs[x]}OfflineSessionIdleTimeout`]['ui:readonly'] = true;
        tokenFields[`${envs[x]}OfflineSessionMaxLifespan`]['ui:readonly'] = true;
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
      'ui:readonly': !isAdmin,
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
      'ui:widget': TooltipCheckboxesWidget,
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
