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

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
}

const envs = ['dev', 'test', 'prod'];

const getUISchema = ({ integration, formData, isAdmin }: Props) => {
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
      classNames: 'short-field-string',
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
      classNames: 'short-field-string',
      'ui:readonly': !isNew && formData?.protocol === 'saml' && formData?.status !== 'draft',
    },
    teamId: {
      classNames: 'short-field-string',
    },
    additionalRoleAttribute: {
      classNames: 'short-field-string',
    },
    clientId: {
      'ui:readonly': !isAdmin,
      classNames: 'short-field-string',
    },
    devLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      classNames: 'short-field-string',
    },
    testLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      classNames: 'short-field-string',
    },
    prodLoginTitle: {
      'ui:placeholder': 'Pathfinder SSO Login Page Name',
      classNames: 'short-field-string',
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
      classNames: 'checkboxes-grid',
    },
    primaryEndUsersOther: {
      'ui:widget': 'textarea',
      classNames: 'other-details',
      'ui:label': false,
    },
    publicAccess: {
      'ui:widget': ClientTypeWidget,
    },
    protocol: {
      'ui:widget': TooltipRadioWidget,
      'ui:default': 'oidc',
      'ui:readonly': isApplied,
    },
    authType: {
      'ui:widget': TooltipRadioWidget,
      'ui:default': 'browser-login',
      'ui:readonly': isApplied,
    },
    devIdps: {
      'ui:widget': TooltipCheckboxesWidget,
      'ui:enumDisabled': idpDisabled,
      'ui:enumHidden': idpHidden,
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
    ...bcServicesCardFields,
    ...tokenFields,
  };
};

export default getUISchema;
