import { redirectUriItems, redirectUriTooltipInfo } from './shared/providers';
import { EnvironmentOption } from 'interfaces/form';

export default function getSchema(envs: EnvironmentOption[]) {
  const environmentNames = envs.map((env) => env.name);

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

  if (environmentNames.includes('test')) {
    schema.properties.testValidRedirectUris = {
      type: 'array',
      title: 'Test',
      items: redirectUriItems,
      additionalItems: redirectUriItems,
      default: [''],
      addItemText: 'Add another URI',
    };
  }

  if (environmentNames.includes('prod')) {
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
