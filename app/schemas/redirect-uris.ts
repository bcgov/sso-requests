import { JSONSchema6 } from 'json-schema';
import { redirectUriItems, redirectUriTooltipInfo } from './shared/providers';

export default function getSchema(env: string) {
  const schema: any = {
    type: 'object',
    properties: {
      devValidRedirectUris: {
        type: 'array',
        title: 'Development',
        items: redirectUriItems,
        additionalItems: redirectUriItems,
        default: [''],
        addItemText: 'Add another URI',
        ...redirectUriTooltipInfo,
      },
    },
  };

  if (env.includes('test')) {
    schema.properties.testValidRedirectUris = {
      type: 'array',
      title: 'Test',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
      addItemText: 'Add another URI',
    };
  }

  if (env.includes('prod')) {
    schema.properties.prodValidRedirectUris = {
      type: 'array',
      title: 'Production',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
      addItemText: 'Add another URI',
    };
  }

  return schema;
}
