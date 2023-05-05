import isNil from 'lodash.isnil';
import FieldProjectTeam from '@app/form-components/FieldProjectTeam';
import ClientTypeWidget from '@app/form-components/widgets/ClientTypeWidget';
import FieldTermsAndConditions from '@app/form-components/FieldTermsAndConditions';
import FieldRequesterInfo from '@app/form-components/FieldRequesterInfo';
import FieldReviewAndSubmit from '@app/form-components/FieldReviewAndSubmit';
import { Integration } from '@app/interfaces/Request';

interface Props {
  integration: Integration;
  isAdmin: boolean;
}

const getUISchema = ({ integration, isAdmin }: Props) => {
  const isNew = isNil(integration?.id);
  const isApplied = integration?.status === 'applied';

  const envDisabled = isApplied ? integration?.environments?.concat() || [] : ['dev'];
  const includeComment = isApplied && isAdmin;

  return {
    projectName: {
      'ui:placeholder': 'Project Name',
      'ui:readonly': !isNew,
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
    realm: {
      'ui:widget': 'radio',
      'ui:default': 'onestopauth',
      'ui:readonly': isApplied,
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
  };
};

export default getUISchema;
