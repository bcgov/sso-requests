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
import FieldAccessTokenLifespan from '@app/form-components/FieldAccessTokenLifespan';
import { checkBceidGroup, checkGithubGroup } from '@app/helpers/integration';
import { Integration } from '@app/interfaces/Request';
import { oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';
import MinutesToSeconds from '@app/form-components/widgets/MinutesToSeconds';
import SwitchWidget from '@app/form-components/widgets/SwitchWidget';
import get from 'lodash.get';

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
}

const envs = ['dev', 'test', 'prod'];

const getUISchema = ({ integration, formData, isAdmin }: Props) => {
  const { id, status, devIdps = [], environments = [], bceidApproved = false } = integration || {};
  const isNew = isNil(id);
  const isApplied = status === 'applied';

  const envDisabled = isApplied ? environments?.concat() || [] : ['dev'];
  let idpDisabled: string[] = [];
  let idpHidden: string[] = [];

  if (!isAdmin) {
    if (isApplied) {
      devIdps.forEach((idp) => {
        if (checkBceidGroup(idp)) {
          if (bceidApproved) idpDisabled.push('bceidbasic', 'bceidbusiness', 'bceidboth');
        } else if (checkGithubGroup(idp)) {
          idpDisabled.push('githubpublic', 'githubbcgov');
        }
      });
    }

    idpDisabled = uniq(idpDisabled);

    if (!isApplied || !devIdps.includes('githubpublic')) idpHidden.push('githubpublic');
  }

  const includeComment = isApplied && isAdmin;

  const tokenFields: any = {};

  const durationAdditionalFields =
    formData?.protocol === 'saml' ? samlDurationAdditionalFields : oidcDurationAdditionalFields;

  for (let x = 0; x < envs.length; x++) {
    const OfflineAccessEnabled = get(formData, `${envs[x]}OfflineAccessEnabled`, false);
    for (let y = 0; y < durationAdditionalFields.length; y++) {
      const minuteOnlyFields = ['SessionIdleTimeout', 'SessionMaxLifespan'];
      let def: any = {
        'ui:widget': minuteOnlyFields.includes(durationAdditionalFields[y]) ? MinutesToSeconds : ClientTokenWidget,
        'ui:label': false,
        'ui:readonly': !isAdmin,
      };

      if (y === 0) def['ui:FieldTemplate'] = FieldAccessTokenLifespan;
      tokenFields[`${envs[x]}${durationAdditionalFields[y]}`] = def;
    }

    tokenFields[`${envs[x]}OfflineAccessEnabled`] = {
      'ui:widget': SwitchWidget,
      'ui:label': false,
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
      'ui:widget': 'radio',
    },
    testDisplayHeaderTitle: {
      'ui:widget': 'radio',
    },
    prodDisplayHeaderTitle: {
      'ui:widget': 'radio',
    },
    devSamlSignAssertions: {
      'ui:widget': 'radio',
    },
    testSamlSignAssertions: {
      'ui:widget': 'radio',
    },
    prodSamlSignAssertions: {
      'ui:widget': 'radio',
    },
    usesTeam: {
      'ui:widget': 'radio',
      'ui:readonly': isApplied && integration?.usesTeam,
    },
    projectLead: {
      'ui:FieldTemplate': FieldRequesterInfo,
      'ui:widget': 'radio',
      'ui:readonly': isApplied,
    },
    newToSso: {
      'ui:widget': 'radio',
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
      'ui:widget': 'radio',
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
    ...tokenFields,
  };
};

export default getUISchema;
