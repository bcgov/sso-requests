import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';

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
  };
};

export default getUISchema;
