import type { EnvironmentOption, ErrorMessages } from 'interfaces/form';

export const environments: EnvironmentOption[] = [
  {
    name: 'dev',
    display: 'Development',
  },
  {
    name: 'test',
    display: 'Test',
  },
  {
    name: 'prod',
    display: 'Production',
  },
];

export const errorMessages: ErrorMessages = {
  agreeWithTerms: 'You must agree to the terms to submit a request.',
  preferredEmail: 'Please enter a valid email address.',
  realm: 'Please select your IDPs.',
  redirectUris: 'Please enter a valid url, including an http:// or https:// prefix.',
  publicAccess: 'Please select an answer',
  newToSso: 'Please select an answer',
  projectName: 'Please enter a project name.',
};
