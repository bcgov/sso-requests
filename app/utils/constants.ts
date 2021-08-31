import type { EnvironmentOption, ErrorMessages, Stage } from 'interfaces/form';

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
  agreeWithTerms: 'You must agree to the terms to submit a request',
  preferredEmail: 'Please enter a valid email address',
  realm: 'Please select your IDPs',
  redirectUris: 'Please enter a valid URI, including an http:// or https:// prefix',
  publicAccess: 'Please select an answer',
  newToSso: 'Please select an answer',
  projectName: 'Please enter a project name',
};

export const bceidStages: Stage[] = [
  { title: 'Requester Info', number: 0 },
  { title: 'Providers and URIs', number: 1 },
  { title: 'Terms and conditions', number: 2 },
  { title: 'Review & Submit', number: 3 },
];

export const adminBceidStages: Stage[] = [
  { title: 'Requester Info', number: 0 },
  { title: 'Providers and URIs', number: 1 },
  { title: 'Comment & Submit', number: 2 },
];

export const stageTitlesUsingForms = ['Requester Info', 'Providers and URIs', 'Terms and conditions'];
export const stageTitlesReviewing = ['Comment & Submit', 'Review & Submit'];
