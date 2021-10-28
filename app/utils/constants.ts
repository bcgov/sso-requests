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
  additionalEmails: 'Please fill in any additional emails.',
};

export const firstFormPageTitle = 'Requester Info';

export const bceidStages: Stage[] = [
  { title: firstFormPageTitle, number: 0 },
  { title: 'Providers and URIs', number: 1 },
  { title: 'Terms and conditions', number: 2 },
  { title: 'Review & Submit', number: 3 },
];

export const adminBceidStages: Stage[] = [
  { title: firstFormPageTitle, number: 0 },
  { title: 'Providers and URIs', number: 1 },
  { title: 'Comment & Submit', number: 2 },
];

export const stageTitlesUsingForms = [firstFormPageTitle, 'Providers and URIs', 'Terms and conditions'];
export const stageTitlesReviewing = ['Comment & Submit', 'Review & Submit'];

export const bceidBody = `Organization Details (Organization/Division/Branch/Program): \n
Exectutive Sponsor Name, Title, & Email:\n
Project Manager / Business Lead Name, Title, & Email:\n
Technical Lead (if applicable) Name, Title, & Email:\n
Privacy Lead (if applicable) Name, Title, & Email:\n
Security Lead (if applicable) Name, Title, & Email:\n
Communications Lead (if applicable) Name, Title, & Email:\n
Name of service or application:\n
URL of service or application:\n
Estimated volume of initial users:\n
Forecast of anticipated growth over the next three years:\n
Date of release in production environment:\n
Date of first use by citizens or end users:`;
