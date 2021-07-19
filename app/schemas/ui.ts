import fieldTemplate from 'form-components/CustomFieldTemplate';
export default {
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
  },
  newToSso: {
    'ui:widget': 'radio',
  },
  preferredEmail: {
    'ui:FieldTemplate': fieldTemplate,
  },
  publicAccess: {
    'ui:widget': 'radio',
  },
  projectName: {
    'ui:FieldTemplate': fieldTemplate,
  },
  realm: {
    'ui:widget': 'radio',
    'ui:enumDisabled': ['bceidbasic', 'bceidbusiness', 'bceidboth'],
  },
};
