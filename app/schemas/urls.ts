import { getPropertyName } from 'utils/helpers';

export default function getSchema(env: string | undefined, defaultUrls: string[]) {
  const name = getPropertyName(env);
  return {
    type: 'object',
    properties: {
      [name]: {
        type: 'array',
        items: { type: 'string', format: 'url' },
        additionalItems: { type: 'string' },
        default: defaultUrls,
      },
    },
  };
}
