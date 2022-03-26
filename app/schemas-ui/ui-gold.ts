import { isNil } from 'lodash';
import FieldProjectTeam from '@app/form-components/FieldProjectTeam';
import ClientTypeWidget from '@app/form-components/widgets/ClientTypeWidget';
import FieldTermsAndConditions from '@app/form-components/FieldTermsAndConditions';
import FieldRequesterInfo from '@app/form-components/FieldRequesterInfo';
import FieldReviewAndSubmit from '@app/form-components/FieldReviewAndSubmit';
import { Request } from '@app/interfaces/Request';

interface Props {
  integration: Request;
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
      'ui:label': false,
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
    devIdps: {
      'ui:widget': 'checkboxes',
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
      'ui:label': false,
    },
  };
};

export default getUISchema;
