import { isNil } from 'lodash';
import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';
import AddTeamWidget from 'form-components/AddTeamWidget';
import ClientTypeWidget from 'form-components/widgets/ClientTypeWidget';
import { Request } from 'interfaces/Request';

const getUISchema = (request: Request) => {
  const isNew = isNil(request?.id);
  const isApplied = request?.status === 'applied';

  return {
    identityProviders: {
      'ui:widget': 'checkboxes',
      'ui:disabled': 'true',
      'ui:help': 'Currently we only support the onestopauth realm and IDPs cant be changed.',
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
    projectName: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
      'ui:placeholder': 'Project Name',
    },
    usesTeam: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:readonly': isApplied && request?.usesTeam,
    },
    realm: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:default': 'onestopauth',
      'ui:readonly': isApplied,
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
    dev: {
      'ui:readonly': true,
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    test: {
      'ui:readonly': isApplied && request?.test === true,
    },
    prod: {
      'ui:readonly': isApplied && request?.prod === true,
    },
    createTeam: {
      'ui:FieldTemplate': AddTeamWidget,
    },
  };
};

export default getUISchema;
