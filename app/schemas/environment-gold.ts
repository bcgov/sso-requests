import { startCase } from 'lodash';
import { Request } from '../interfaces/Request';
import { devValidRedirectUris } from './providers';
import { Schema } from './index';

export default function getSchemas(formData: Request) {
  return (formData.environments || []).map((env) => {
    const redirectUriField = `${env}ValidRedirectUris`;
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
      },
    } as Schema;
  });
}
