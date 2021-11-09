import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';
import EnvironmentsFieldTemplate from 'form-components/EnvironmentsFieldTemplate';

const getUISchema = (created: boolean) => {
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
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    projectName: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
      'ui:placeholder': 'Project Name',
    },
    realm: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      // 'ui:enumDisabled': ['bceidbasic', 'bceidbusiness', 'bceidboth'],
      'ui:default': 'onestopauth',
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
      'ui:FieldTemplate': EnvironmentsFieldTemplate,
    },
  };
};

export default getUISchema;
