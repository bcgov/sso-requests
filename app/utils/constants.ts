import { isNil } from 'lodash';
import type { EnvironmentOption, ErrorMessages, Stage } from 'interfaces/form';
import { Request, Option } from 'interfaces/Request';
import getConfig from 'next/config';
const { publicRuntimeConfig = {} } = getConfig() || {};
const { enable_gold } = publicRuntimeConfig;

export const createTeamModalId = `create-team-modal`;

export const environmentOptions: EnvironmentOption[] = [
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
  realm: 'Please select your IDPs',
  redirectUris: 'Please enter a valid URI, including an http:// or https:// prefix',
  publicAccess: 'Please select an answer',
  newToSso: 'Please select an answer',
  projectName: 'Please enter a project name',
  teamId: 'Please select an existing team',
  devIdps: 'Please select an identity provider',
};

export const firstFormPageTitle = 'Requester Info';

const headerTitles: any = {
  [firstFormPageTitle]: 'Enter requester information',
  'Providers and URIs': 'Choose providers and provide URIs',
  Providers: 'Choose providers',
  Development: 'Enter Dev integration Info',
  Test: 'Enter Test integration Info',
  Production: 'Enter Prod integration Info',
  'Terms and conditions': 'Terms and Conditions',
  'Review & Submit': 'Review and Submit',
};

const addStage = (stages: any[], ...titles: any[]) => {
  for (let x = 0; x < titles.length; x++) {
    const title = titles[x];
    stages.push({ title: titles[x], header: headerTitles[title], number: stages.length });
  }

  return stages;
};

export const getStages = ({ integration, formData }: { integration?: Request; formData: Request }) => {
  const isApplied = integration?.status === 'applied';
  const isNew = isNil(integration?.id);
  const environments = (formData.environments || []).map((env) => {
    return environmentOptions.find((v) => v.name === env)?.display;
  });

  let stages: any[] = [];

  if (isNew) {
    if (enable_gold) {
      addStage(stages, firstFormPageTitle, 'Providers');
      addStage(stages, ...environments);
      addStage(stages, 'Terms and conditions', 'Review & Submit');
    } else {
      addStage(
        stages,
        firstFormPageTitle,
        'Choose providers and provide URIs',
        'Terms and conditions',
        'Review & Submit',
      );
    }
  } else {
    if (integration?.serviceType === 'gold') {
      if (isApplied) {
        addStage(stages, firstFormPageTitle, 'Providers');
        addStage(stages, ...environments);
        addStage(stages, 'Review & Submit');
      } else {
        addStage(stages, firstFormPageTitle, 'Providers');
        addStage(stages, ...environments);
        addStage(stages, 'Terms and conditions', 'Review & Submit');
      }
    } else {
      if (isApplied) {
        addStage(stages, firstFormPageTitle, 'Choose providers and provide URIs', 'Review & Submit');
      } else {
        addStage(
          stages,
          firstFormPageTitle,
          'Choose providers and provide URIs',
          'Terms and conditions',
          'Review & Submit',
        );
      }
    }
  }

  return stages;
};

export const stageTitlesUsingForms = [
  firstFormPageTitle,
  'Providers',
  'Providers and URIs',
  'Development',
  'Test',
  'Production',
  'Terms and conditions',
];
export const stageTitlesReviewing = ['Review & Submit', 'Review & Submit'];

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
