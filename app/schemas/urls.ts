import { getPropertyName } from 'utils/helpers';
import { urlPattern as pattern } from './providers';

export default function getSchema(env: string | undefined, defaultUrls: string[]) {
  const name = getPropertyName(env);
  return {
    type: 'object',
    properties: {
      [name]: {
        type: 'array',
        items: { type: 'string', pattern },
        additionalItems: { type: 'string', pattern },
        default: defaultUrls,
      },
    },
  };
}
