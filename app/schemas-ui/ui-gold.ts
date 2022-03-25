import { isNil } from 'lodash';
import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';
import AddTeamWidget from 'form-components/AddTeamWidget';
import ClientTypeWidget from 'form-components/widgets/ClientTypeWidget';
import { Request } from 'interfaces/Request';

const getUISchema = (request: Request) => {
  const isNew = isNil(request?.id);
  const isApplied = request?.status === 'applied';

  const envDisabled = isApplied ? request?.environments?.concat() || [] : ['dev'];

  return {
    projectName: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
      'ui:placeholder': 'Project Name',
    },
    usesTeam: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:readonly': isApplied && request?.usesTeam,
    },
    projectLead: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:readonly': !isNew,
    },
    newToSso: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    publicAccess: {
      'ui:widget': ClientTypeWidget,
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    devIdps: {
      'ui:widget': 'checkboxes',
    },
    bceidTo: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
      'ui:readonly': true,
    },
    bceidCc: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
    },
    bceidBody: {
      'ui:widget': 'textarea',
    },
    environments: {
      'ui:widget': 'checkboxes',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:enumDisabled': envDisabled,
    },
    createTeam: {
      'ui:FieldTemplate': AddTeamWidget,
    },
  };
};

export default getUISchema;
