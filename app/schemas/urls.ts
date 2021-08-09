import { getRedirectUrlPropertyNameByEnv } from 'utils/helpers';
import { urlPattern as pattern } from './shared/providers';

export default function getSchema(env: string | undefined, defaultUrls: string[]) {
  const name = getRedirectUrlPropertyNameByEnv(env);
  return {
    type: 'object',
    properties: {
      [name]: {
        type: 'array',
        title: '',
        items: { type: 'string', pattern },
        additionalItems: { type: 'string', pattern },
        default: defaultUrls,
      },
    },
  };
}
