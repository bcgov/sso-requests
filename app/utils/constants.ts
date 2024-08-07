import { ITestimonial } from '@app/interfaces/Testimonial';
import { EnvironmentOption, ErrorMessages } from '@app/interfaces/form';
import { MAX_IDLE_SECONDS, MAX_LIFETIME_SECONDS } from './validate';
import { BcscPrivacyZone } from '@app/interfaces/types';

export const createTeamModalId = `create-team-modal`;

export const deleteTeamModalId = 'delete-team-modal';

export const editTeamNameModalId = 'edit-team-name-modal';

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
  clientMaxLifespan: `Must be ${MAX_LIFETIME_SECONDS / 60} minutes or fewer.`,
  clientIdleTimeout: `Must be ${MAX_IDLE_SECONDS / 60} minutes or fewer.`,
};

export const messages = {
  GET_REQUEST_ERROR: 'There was an error loading the request. Please try again later.',
  ADD_TEAM_MEMBERS_ERROR:
    'Failed to add new members. Please ensure the emails you have entered are valid, and reach out to the SSO team if the problem persists',
  ADD_TEAM_MEMBERS_SUCCESS: 'Invited new members to your team!',
  DELETE_TEAM_MEMBER_ERROR: 'Failed to delete team member',
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
    id: 1,
    title: 'Exceptional Customer Service',
    author: {
      name: 'W.M.',
      title: 'Senior Technical Analyst, IM/IT Enterprise Projects',
    },
    body: 'The Common Hosted Single Sign-On (CSS) service has streamlined login access for both Government staff and contractors to our Snow Avalanche Weather System (SAWSx), with its easy integration requiring minimal code. The team provides exceptional customer service, swiftly addressing a critical issue on our end. Grateful for the prompt assistance and seamless experience provided by the team.',
    rating: 5,
  },
  {
    id: 2,
    title: 'Self Service: Configure Dev and Test',
    author: {
      name: 'A.S.',
      title: 'Quality Assurance Lead',
    },
    body: "It was a breeze to integrate our SAAS platform, BrowserStack, with Single Sign-On with the expert assistance of the SSO team.  The CSS app's flexibility eased integration challenges, allowing seamless Dev and Test setups. The responsive support received, especially in overcoming signed assertion hurdles, showcased the team's expertise and contributed to a smooth experience, noticeably enhancing our login process.",
    rating: 5,
  },
  {
    id: 3,
    title: 'Stable Service and Super Support',
    author: {
      name: 'G.W.',
      title: 'Senior Product Owner',
    },
    body: 'Having collaborated with the CSS team across multiple projects, their responsiveness to technical inquiries and support during onboarding has been invaluable. The user-friendly CSS Dashboard, technical support via RocketChat, and regular open demo sessions have greatly contributed to our collaborative community. With acknowledgment within 15 minutes and resolutions ranging from 15 minutes to the same day, the service has been consistently solid.',
    rating: 4.5,
  },
  {
    title: 'Really Positive Experience',
    id: 4,
    author: {
      name: 'J.W.',
      title: 'Senior Product Manager, Digital Delivery',
    },
    body: 'Our team has had a really positive experience working with the single-sign on keycloak service. We were able to work with the team to get us set up in a custom realm which suited the needs at BC Parks. Since then we have been able to integrate BCeID and BC Services Card and are managing roles for up to 5 different products through the tool and enabled easy log ins for our users so they can see what is relevant to them.',
    rating: 4.5,
  },
];

export const formatWikiURL = (page?: string) =>
  `https://mvp.developer.gov.bc.ca/docs/default/component/css-docs/${
    page ?? ''
  }?utm_source=sso-wiki&utm_medium=web&utm_campaign=retirement-notice-sso`;

export const bcscPrivacyZones = () => {
  return [
    {
      privacy_zone_uri: 'urn:ca:bc:gov:health:mocksit',
      privacy_zone_name: 'Health (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:fin:ctz:pz:sit',
      privacy_zone_name: 'Finance (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:educ:sit',
      privacy_zone_name: 'Education (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:healthprovider:sit',
      privacy_zone_name: 'Health (Provider)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:justice:sit',
      privacy_zone_name: 'Justice (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:nrs:ctz:pz:sit',
      privacy_zone_name: 'Natural Resources (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:bcpsa:ctz:pz:sit',
      privacy_zone_name: 'BC Public Service Agency (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:sbc:ctz:pz:sit',
      privacy_zone_name: "Citizens' Services (Citizen)",
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:tran:pro:pz:sit',
      privacy_zone_name: 'Transportation (Professional)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:social:sit',
      privacy_zone_name: 'Social (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:nrs:pro:sit',
      privacy_zone_name: 'Natural Resources (Professional)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:citz:pro:sit',
      privacy_zone_name: "Citizens' Services (Professional)",
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:buseco:sit',
      privacy_zone_name: 'Business and Economy (Citizen)',
    },
    {
      privacy_zone_uri: 'urn:ca:bc:gov:educprofessional:sit',
      privacy_zone_name: 'Education (Professional)',
    },
  ];
};

export const bcscAttributes = () => {
  return [
    {
      name: 'postal_code',
      user_friendly_name: 'Postal Code',
      user_friendly_description: "The postal code of the individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'user_type',
      user_friendly_name: 'User Type',
      user_friendly_description: "If Assurance Level \u003E=2 set to 'VerifiedIndividual' else set to 'Individual'.",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'birthdate',
      user_friendly_name: 'Date of Birth',
      user_friendly_description: "The individual's documented birth date recorded from valid identification.",
      data_type: 'xs:date',
      scope: 'profile',
    },
    {
      name: 'family_name',
      user_friendly_name: 'Surname',
      user_friendly_description: "The individual's documented surname recorded from valid identification.",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'gender',
      user_friendly_name: 'Sex',
      user_friendly_description:
        "The individual's documented sex recorded from valid identification. Values include male, female, unknown and diverse.",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'address',
      user_friendly_name: 'Address',
      user_friendly_description: "All address lines of the individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'authoritative_party_name',
      user_friendly_name: 'Authoritative Party Name',
      user_friendly_description:
        'The common name of the system or organization that is authoritative for the information provided as identity claims.',
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'locality',
      user_friendly_name: 'City/town',
      user_friendly_description: "The city, municipality or district of an individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'region',
      user_friendly_name: 'State Or Province',
      user_friendly_description: "The province or state code of an individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'authoritative_party_identifier',
      user_friendly_name: 'Authoritative Party Identifier',
      user_friendly_description:
        'A unique identifier of the system or organization that is authoritative for the information provided as identity claims.',
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'authentication_zone_identifier',
      user_friendly_name: 'Authentication Zone Identifier',
      user_friendly_description: 'A unique identifier for the authentication zone this client is in.',
      data_type: 'xs:anyURI',
      scope: 'profile',
    },
    {
      name: 'sector_identifier_uri',
      user_friendly_name: 'Privacy Zone Identifier',
      user_friendly_description:
        'An identifier issued by IAS that represents a privacy zone.Â  A privacy zone is used to distinguish a set of relying parties that have the authority to share user identifiers.',
      data_type: 'xs:anyURI',
      scope: 'profile',
    },
    {
      name: 'display_name',
      user_friendly_name: 'Name',
      user_friendly_description:
        "The individual's name which their preferred name if available or composed of their documented name.",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'identity_assurance_level3',
      user_friendly_name: 'Identity Assurance Level 3',
      user_friendly_description:
        'An indicator that there is high confidence in the identity claims of the individual according to the OCIO Identity Assurance Standard.',
      data_type: 'xs:boolean',
      scope: 'profile',
    },
    {
      name: 'transaction_type',
      user_friendly_name: 'Transaction Type',
      user_friendly_description: 'An indicator of which channel was used to authenticate the individual.',
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'given_name',
      user_friendly_name: 'Given Name',
      user_friendly_description:
        "The individual's documented given name (first name only) recorded from valid identification.",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'identity_assurance_level1',
      user_friendly_name: 'Identity Assurance Level 1',
      user_friendly_description:
        'An indicator that there is low confidence in the identity claims of the individual according to the OCIO Identity Assurance Standard.',
      data_type: 'xs:boolean',
      scope: 'profile',
    },
    {
      name: 'age_19_or_over',
      user_friendly_name: 'Age 19 Or Over',
      user_friendly_description:
        "An indicator of whether the individual's age is 19 years or greater based on the documented birth date recorded from valid identification.",
      data_type: 'xs:boolean',
      scope: 'profile',
    },
    {
      name: 'transaction_identifier',
      user_friendly_name: 'Transaction Identifier',
      user_friendly_description: 'A unique identifier of the transaction that was used to authenticate the individual.',
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'given_names',
      user_friendly_name: 'Given Names',
      user_friendly_description:
        "The individual's documented given  names (first and middle) recorded from valid identification",
      data_type: 'xs:string',
      scope: 'profile',
    },
    {
      name: 'street_address',
      user_friendly_name: 'Street Address',
      user_friendly_description: "The street address lines of an individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'country',
      user_friendly_name: 'Country',
      user_friendly_description: "The country code of an individual's provided residential address.",
      data_type: 'xs:string',
      scope: 'address',
    },
    {
      name: 'age',
      user_friendly_name: 'Age',
      user_friendly_description:
        "The individual's age in years based on the documented birth date recorded from valid identification.",
      data_type: 'xs:integer',
      scope: 'profile',
    },
    {
      name: 'identity_assurance_level2',
      user_friendly_name: 'Identity Assurance Level 2',
      user_friendly_description:
        'An indicator that there is medium confidence in the identity claims of the individual according to the OCIO Identity Assurance Standard.',
      data_type: 'xs:boolean',
      scope: 'profile',
    },
    {
      name: 'identification_level',
      user_friendly_name: 'Identification Level',
      user_friendly_description:
        'The level of confidence in the certainty of the identification of the individual according to the OCIO Evidence of Identity Standard.',
      data_type: 'xs:integer',
      scope: 'profile',
    },
    {
      name: 'email',
      user_friendly_name: 'Email Address',
      user_friendly_description: 'The email address provided by an individual (and verified by IAS)',
      data_type: 'xs:string',
      scope: 'email',
    },
    {
      name: 'identity_assurance_level',
      user_friendly_name: 'Identity Assurance Level',
      user_friendly_description:
        'The level of confidence in the certainty of the identity claims of the individual according to the OCIO Identity Assurance Standard.',
      data_type: 'xs:integer',
      scope: 'profile',
    },
  ];
};
