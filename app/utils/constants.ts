import type { EnvironmentOption, ErrorMessages } from 'interfaces/form';

export const createTeamModalId = `create-team-modal`;

export const environmentOptions: EnvironmentOption[] = [
  {
    name: 'dev',
    display: 'Development',
    idps: [],
  },
  {
    name: 'test',
    display: 'Test',
    idps: [],
  },
  {
    name: 'prod',
    display: 'Production',
    idps: [],
  },
];

export const errorMessages: ErrorMessages = {
  agreeWithTerms: 'You must agree to the terms to submit a request',
  realm: 'Please select your IDPs',
  redirectUris: 'Please enter a valid URI, including an http:// or https:// prefix',
  publicAccess: 'Please select an answer',
  newToSso: 'Please select an answer',
  projectName: 'Please enter a project name',
  teamId: 'Please select an existing team',
  devIdps: 'Please select an identity provider',
};

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
