import FieldTemplateNoTitle from 'form-components/FieldTemplateNoTitle';
import FieldTemplateWithTitle from 'form-components/FieldTemplateWithTitle';

const getUISchema = (created: boolean) => {
  return {
    identityProviders: {
      'ui:widget': 'checkboxes',
      'ui:disabled': 'true',
      'ui:help': 'Currently we only support the onestopauth realm and IDPs cant be changed.',
    },
    environments: {
      'ui:widget': 'checkboxes',
    },
    projectLead: {
      'ui:widget': 'radio',
      'ui:readonly': created,
    },
    newToSso: {
      'ui:widget': 'radio',
    },
    preferredEmail: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
    },
    publicAccess: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
    },
    projectName: {
      'ui:FieldTemplate': FieldTemplateNoTitle,
    },
    realm: {
      'ui:widget': 'radio',
      'ui:FieldTemplate': FieldTemplateWithTitle,
      'ui:enumDisabled': ['bceidbasic', 'bceidbusiness', 'bceidboth'],
    },
  };
};

export default getUISchema;
