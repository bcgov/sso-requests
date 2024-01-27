import { ITestimonial } from '@app/interfaces/Testimonial';
import { EnvironmentOption, ErrorMessages } from '@app/interfaces/form';

export const createTeamModalId = `create-team-modal`;

export const wikiURL = 'https://mvp.developer.gov.bc.ca/docs/default/component/css-docs';
export const docusaurusURL = 'https://bcgov.github.io/sso-docs';

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
  redirectUris: 'Please enter a valid URI',
  publicAccess: 'Please select an answer',
  newToSso: 'Please select an answer',
  projectName: 'Please enter a project name',
  teamId: 'Please select an existing team',
  devIdps: 'Please select an identity provider',
  samlLogoutPostBindingUri: 'Please enter a valid URI',
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

export const preservedClaims = [
  'exp',
  'iat',
  'auth_time',
  'jti',
  'iss',
  'aud',
  'sub',
  'typ',
  'azp',
  'nonce',
  'session_state',
  'sid',
  'email_verified',
  'name',
  'preferred_username',
  'display_name',
  'given_name',
  'family_name',
  'email',
  'scope',
  'at_hash',
];

export const testimonials: ITestimonial[] = [
  {
    author: {
      name: 'Wim Mulder',
      title: 'Senior Technical Analyst, IM/IT Enterprise Projects',
    },
    body: 'The Common Hosted Single Sign-On (CSS) service has streamlined login access for both Government staff and contractors to our Snow Avalanche Weather System (SAWSx), with its easy integration requiring minimal code. The team provides exceptional customer service, swiftly addressing a critical issue on our end. Grateful for the prompt assistance and seamless experience provided by the team.',
    rating: 5,
  },
  {
    author: {
      name: 'Aditya Sharma',
      title: 'Quality Assurance Lead',
    },
    body: "It was a breeze to integrate our SAAS platform, BrowserStack, with Single Sign-On with the expert assistance of the SSO team.  The CSS app's flexibility eased integration challenges, allowing seamless Dev and Test setups. The responsive support received, especially in overcoming signed assertion hurdles, showcased the team's expertise and contributed to a smooth experience, noticeably enhancing our login process.",
    rating: 5,
  },
  {
    author: {
      name: 'Garry Wong',
      title: 'Senior Product Owner',
    },
    body: 'Having collaborated with the CSS team across multiple projects, their responsiveness to technical inquiries and support during onboarding has been invaluable. The user-friendly CSS Dashboard, technical support via RocketChat, and regular open demo sessions have greatly contributed to our collaborative community. With acknowledgment within 15 minutes and resolutions ranging from 15 minutes to the same day, the service has been consistently solid.',
    rating: 4.5,
  },
  {
    author: {
      name: 'Jessica Wade',
      title: 'Senior Product Manager, Digital Delivery',
    },
    body: 'Our team has had a really positive experience working with the single-sign on keycloak service. We were able to work with Zorin and her team to get us set up in a custom realm which suited the needs at BC Parks. Since then we have been able to integrate BCeID and BC Services Card and are managing roles for up to 5 different products through the tool and enabled easy log ins for our users so they can see what is relevant to them.',
    rating: 4.5,
  },
];
