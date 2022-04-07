import { Request } from '../interfaces/Request';
import { devValidRedirectUris } from './providers';
import { Schema } from './index';

export const roles = {
  type: 'array',
  items: { type: 'string', maxLength: 100, placeholder: 'e.g. Administrator' },
  deletableIndex: 0,
  default: [],
  addItemText: 'Add user role',
  description:
    'Add roles your integration, once created, you will have the ability to assign these roles to your users.',
  title: 'User Roles (Optional)',
  tooltip: {
    content:
      '<p>Client roles are an additional attribute you can assign to users at an application level (not a CSS level), to manage access controls.</p><p>Some examples of client roles are: Administrator and Manager</p>',
  },
};

export default function getSchemas(formData: Request) {
  return (formData.environments || []).map((env) => {
    const redirectUriField = `${env}ValidRedirectUris`;
    const roleField = `${env}Roles`;
    let headerText = '';
    let stepText = '';
    if (env === 'prod') {
      headerText = 'Enter Prod integration Info';
      stepText = 'Production';
    } else if (env === 'test') {
      headerText = 'Enter Test integration Info';
      stepText = 'Test';
    } else {
      headerText = 'Enter Dev integration Info';
      stepText = 'Development';
    }

    return {
      type: 'object',
      customValidation: [redirectUriField],
      headerText,
      stepText,
      required: [],
      properties: {
        [redirectUriField]: { ...devValidRedirectUris, title: 'Redirect URIs' },
        [roleField]: roles,
      },
    } as Schema;
  });
}
