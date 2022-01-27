import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';
import AddTeamWidget from 'form-components/AddTeamWidget';
import ClientTypeWidget from 'form-components/widgets/ClientTypeWidget';

const getUISchema = (created: boolean, applied: boolean = false) => {
  return {
    identityProviders: {
      'ui:widget': 'checkboxes',
      'ui:disabled': 'true',
      'ui:help': 'Currently we only support the onestopauth realm and IDPs cant be changed.',
    },
    projectLead: {
      'ui:widget': 'radio',
      'ui:readonly': created,
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    newToSso: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    preferredEmail: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
      'ui:readonly': true,
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
      'ui:readonly': created,
    },
    realm: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:default': 'onestopauth',
      'ui:readonly': applied,
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
    createTeam: {
      'ui:FieldTemplate': AddTeamWidget,
    },
  };
};

export default getUISchema;
