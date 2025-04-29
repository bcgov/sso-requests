export const applyBcServicesCardBottom = `
<p><strong>*BC Services Card production integration is not approved and not ready to use yet</strong></p>
`;

export const applyBceidBottom = `
<p><strong>*BCeID production integration is not approved and not ready to use yet</strong></p>
`;

export const applyGithubBottom = `
<p><strong>*GitHub production integration is not approved and not ready to use yet</strong></p>
`;

export const applySocialBottom = `
<p><strong>*Social production integration is not approved and not ready to use yet</strong></p>
`;

export const bceidWarning = `
<span>
  We
  <a
    target="_blank"
    rel="noopener"
    href="https://bcgov.github.io/sso-docs/best-practices/dos-donts#do-not-reuse-clients-for-multiple-applications"
    >recommend</a
  >
  only using your client for one application.</span
>
`;

export const bcscClientDetail = `
<strong>SSO Integration ID: </strong>{{integration.id}}<br />
<strong>Client Name: </strong>{{integration.projectName}}<br />
<strong>Submitted by: </strong>{{integration.requester}}<br />
<strong>Privacy Zone: </strong>{{integration.bcscPrivacyZone}}<br />
<strong>Attributes: </strong>{{integration.bcscAttributes}}<br />
`;

export const createBcServicesCardBottom = `
<strong>Next Steps for your integration with BC Services Card:</strong>
<p>
  As you've requested an integration with BC Services Card, any production integration request requires you to work with
  the Identity and Information Management (IDIM) team.
</p>
<ol>
  <li>
    <strong
      >On a best effort basis, the BC Services Card team will endeavour to reach out to you within 2-3 business days to
      schedule an on-boarding meeting.</strong
    >
  </li>
  <li>
    <strong>Please have answers to the questions below, before your meeting with the IDIM team.</strong>
    <ul>
      <li>What is your estimated volume of initial users?</li>
      <li>Do you anticipate your volume of users will grow over the next three years?</li>
      <li>When do you need access to the production environment by?</li>
      <li>When will your end users need access to the production environment?</li>
    </ul>
    <div style="display: none">&nbsp;</div>
  </li>
</ol>
`;

export const createBceidBottom = `
<strong>Next Steps for your integration with BCeID:</strong>
<p>
  As you've requested an integration with BCeID, any production integration request requires you to work with the
  Identity and Information Management (IDIM) team.
</p>
<ol>
  <li>
    <strong
      >On a best effort basis, the BCeID team will endeavour to reach out to you within 2-3 business days to schedule an
      on-boarding meeting.</strong
    >
  </li>
  <li>
    <strong>Please have answers to the questions below, before your meeting with the IDIM team.</strong>
    <ul>
      <li>What is your estimated volume of initial users?</li>
      <li>Do you anticipate your volume of users will grow over the next three years?</li>
      <li>When do you need access to the production environment by?</li>
      <li>When will your end users need access to the production environment?</li>
    </ul>
    <div style="display: none">&nbsp;</div>
  </li>
</ol>
`;

export const createGithubBottom = `
<strong>Next Steps for your integration with GitHub:</strong>
<p>
  As you've requested an integration with GitHub, any production integration request requires you to obtain an exemption
  to the IM/IT standards.
  <a
    href="https://www2.gov.bc.ca/gov/content/governments/services-for-government/policies-procedures/im-it-standards/im-it-standards-faqs"
    title="IM/IT Standards Frequently Asked Questions"
    target="_blank"
    rel="noreferrer"
    >IM/IT Standards Frequently Asked Questions</a
  >
</p>
<ol>
  <li>
    Please proceed to complete this form:
    <a
      href="https://www2.gov.bc.ca/gov/content/governments/services-for-government/policies-procedures/im-it-standards/exemptions"
      title="IIM/IT Standards Exemptions"
      target="_blank"
      rel="noreferrer"
      >IIM/IT Standards Exemptions</a
    >
  </li>
  <li>
    Once the exemption has been granted, please email us with a copy of it and we will happily set you production
    integration with GitHub
  </li>
</ol>
<div style="display: none">&nbsp;</div>
`;

export const createSocialBottom = `
<strong>Next Steps for your integration with Social Login:</strong>
<p>
  As you’ve requested integration with Social Login, any production integration request requires you work with the CDT
  Delivery team.
</p>

<p>
  On a best effort basis, the Delivery team will reach out to you within 2-3 business days to schedule an on-boarding
  meeting.
</p>

<p>
  <strong>Please have the following before your meeting with the Delivery team.</strong>
</p>

<ol>
  <li>
    Answers to the following:
    <ul>
      <li>Details of your use case(s)</li>
      <li>Has your Ministry MISO and MPO approved your use of social login?</li>
      <li>When do you need access to the production environment by?</li>
      <li>When will your end users need access to the production environment?</li>
    </ul>
  </li>
  <li>Complete the attached Self-Assessment.</li>
</ol>

<div style="display: none">&nbsp;</div>
`;

export const createVerifiedCredentialBottom = `
<strong>Next Steps for your integration with Digital Credential:</strong>
<p>
  As you've requested an integration with Digital Credential, any production integration request requires you to work
  with the Digital Identity Trust (DIT) team.
</p>
<p><strong>The DIT will reach out to schedule an on-boarding meeting.</strong></p>
`;

export const dashboardLogin = `
<p>
  Please <a href="{{appUrl}}/my-dashboard/integrations" title="Log in" target="_blank" rel="noreferrer">Log in</a>
  to your dashboard to access JSON Client Installation File. If you are not the requester, this email serves only to
  notify you of the request status.
</p>
`;

export const deleteBcServicesCardBottom = `
<strong>Next Steps for your integration with BC Services Card:</strong>
<p>Please note we've also informed the Identity and Information Management (IDIM) team of this deletion.</p>
<p>
  Please work with the IDIM team on any additional processes as part of this deletion.
  <a
    href="https://www2.gov.bc.ca/gov/content/governments/services-for-government/information-management-technology/identity-and-authentication-services/bc-services-card-authentication-service"
    title="BC Services Card Authentication Service"
    target="_blank"
    rel="noopener noreferrer"
    >BC Services Card Authentication Service</a
  >
</p>
`;

export const deleteBceidBottom = `
<strong>Next Steps for your integration with BCeID:</strong>
<p>Please note we've also informed the Identity and Information Management (IDIM) team of this deletion.</p>
<p>
  Please work with the IDIM team on any additional processes as part of this deletion.
  <a
    href="https://www2.gov.bc.ca/gov/content/governments/services-for-government/information-management-technology/identity-and-authentication-services/bceid-authentication-service"
    title="BCeID Authentication Service"
    target="_blank"
    rel="noreferrer"
    >BCeID Authentication Service</a
  >
</p>
`;

export const deleteGithubBottom = `
<strong>Next Steps for your integration with GitHub:</strong>
<p>
  Please work with your contact at the OCIO as this integration is now deleted.
  <a
    href="https://www2.gov.bc.ca/gov/content/governments/services-for-government/policies-procedures/im-it-standards/exemptions"
    title="IIM/IT Standards Exemptions"
    target="_blank"
    rel="noreferrer"
    >IIM/IT Standards Exemptions</a
  >
</p>
`;

export const digitalCredentialInfoContact = `
<p>
  For all Digital Credential questions please contact
  <a href="mailto:ditrust@gov.bc.ca" title="Digital Trust" target="_blank" rel="noreferrer"> ditrust@gov.bc.ca </a>
</p>
`;

export const footer = `
<p>
  If you have any questions, please contact us by
  <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
    Rocket.Chat
  </a>
  or email at:
  <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer"> bcgov.sso@gov.bc.ca </a>
</p>
<p>Thank you.<br />Pathfinder SSO Team</p>
`;

export const hr = `
<table border="0" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td
      style="background: none; border-bottom: 1px solid #d7dfe3; height: 1px; width: 100%; margin: 0px 0px 0px 0px"
    ></td>
  </tr>
</table>
<br />
`;

export const integrationDetail = `
<strong>Project name: </strong>{{integration.projectName}}<br />
{{#if integration.browserLoginEnabled}}
<strong>Primary End Users: </strong>{{formatPrimaryUsers integration.primaryEndUsers
integration.primaryEndUsersOther}}<br />
<strong>Identity Providers: </strong>{{integration.idpNames}}<br />
{{/if}}{{#if integration.bcscPrivacyZone}}
<strong>Privacy Zone:</strong> {{integration.bcscPrivacyZone}} <br />
{{/if}}
<strong>Environments: </strong>{{integration.envNames}}<br />
<strong>Accountable person(s): </strong>{{integration.accountableEntity}}<br />
<strong>Submitted by: </strong>{{integration.requester}}<br />
{{#if integration.browserLoginEnabled}}
<strong>URIs:</strong>
<ul>
  {{#each integration.redirectUris}}
  <li>
    {{this.name}}:
    <ul>
      {{#each this.uris}}
      <li>{{this}}</li>
      {{/each}}
    </ul>
  </li>
  {{/each}}
</ul>
{{/if}}
`;

export const processingTime = `
<p>
  <strong>The expected processing time is 5 minutes</strong><br />
  Once the request is approved, you will receive another email that your JSON Client Installation is ready. If you are
  not the requester, this email serves only to notify you of the request status.
</p>
`;

export const ssoUpdatesMailingListMessage = `
<p>
  Please join the
  <a
    href="https://digital.gov.bc.ca/sso-notifications/"
    title="SSO Updates Mailing list"
    target="_blank"
    rel="noreferrer"
    >SSO Updates Mailing list</a
  >
  within the DevOps Platform Services Communications to receive important updates on the service and any outages.
</p>
`;
