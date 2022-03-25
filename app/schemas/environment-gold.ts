import { JSONSchema6 } from 'json-schema';
import { startCase } from 'lodash';
import { Request } from '../interfaces/Request';
import { devValidRedirectUris } from './providers';

export default function getSchemas(formData: Request) {
  return (formData.environments || []).map((env) => {
    const redirectUriField = `${env}ValidRedirectUris`;

    return {
      type: 'object',
      customValidation: [redirectUriField],
      required: [],
      properties: {
        [redirectUriField]: { ...devValidRedirectUris, title: 'Redirect URIs' },
      } as JSONSchema6,
    };
  });
}
