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
import { Integration } from '@app/interfaces/Request';
import { oidcDurationAdditionalFields, samlDurationAdditionalFields } from '@app/schemas';

interface Props {
  integration: Integration;
  formData?: Integration;
  isAdmin: boolean;
}

const envs = ['dev', 'test', 'prod'];

const getUISchema = ({ integration, formData, isAdmin }: Props) => {
  const isNew = isNil(integration?.id);
  const isApplied = integration?.status === 'applied';
  const idps = integration?.devIdps || [];

  const envDisabled = isApplied ? integration?.environments?.concat() || [] : ['dev'];
  let idpDisabled: string[] = [];
  if (isApplied) {
    idps.forEach((idp) => {
      if (idp.startsWith('bceid')) {
        if (idp === 'bceidbasic') idpDisabled.push('bceidbasic', 'bceidboth');
        else if (idp === 'bceidbusiness') idpDisabled.push('bceidbusiness', 'bceidboth');
        else if (idp === 'bceidboth') idpDisabled.push('bceidbasic', 'bceidbusiness', 'bceidboth');
      } else if (idp === 'githubbcgov') {
        idpDisabled.push('githubbcgov');
      }
    });
  }
  idpDisabled = uniq(idpDisabled);

  const includeComment = isApplied && isAdmin;

  const tokenFields: any = {};

  const durationAdditionalFields =
    formData?.protocol === 'saml' ? samlDurationAdditionalFields : oidcDurationAdditionalFields;

  for (let x = 0; x < envs.length; x++) {
    for (let y = 0; y < durationAdditionalFields.length; y++) {
      const def: any = {
        'ui:widget': ClientTokenWidget,
        'ui:label': false,
        'ui:readonly': !isAdmin,
      };

      if (y === 0) def['ui:FieldTemplate'] = FieldAccessTokenLifespan;
      tokenFields[`${envs[x]}${durationAdditionalFields[y]}`] = def;
    }
  }

  return {
    projectName: {
      'ui:placeholder': 'Project Name',
    },
    devLoginTitle: {
      'ui:placeholder': 'Keycloak Login Page Name',
    },
    testLoginTitle: {
      'ui:placeholder': 'Keycloak Login Page Name',
    },
    prodLoginTitle: {
      'ui:placeholder': 'Keycloak Login Page Name',
    },
    usesTeam: {
      'ui:widget': 'radio',
      'ui:readonly': isApplied && integration?.usesTeam,
    },
    projectLead: {
      'ui:FieldTemplate': FieldRequesterInfo,
      'ui:widget': 'radio',
      'ui:readonly': !isNew,
    },
    newToSso: {
      'ui:widget': 'radio',
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
