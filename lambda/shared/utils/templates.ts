import { Data } from '../interfaces';
import { formatUrisForEmail, realmToIDP } from './helpers';

const APP_URL = process.env.APP_URL || '';
const APP_ENV = process.env.APP_ENV || 'development';

export type EmailMessage =
  | 'create-request-submitted'
  | 'create-request-approved'
  | 'uri-change-request-submitted'
  | 'uri-change-request-approved'
  | 'request-deleted'
  | 'request-deleted-notification-to-admin'
  | 'request-limit-exceeded'
  | 'bceid-request-approved'
  | 'bceid-idim-dev-submitted'
  | 'bceid-idim-prod-submitted'
  | 'bceid-idim-deleted';

const footer = `
<p>
    If you have any questions, please contact us by
    <a href="https://chat.developer.gov.bc.ca/channel/sso" target="_blank" title="Rocket Chat" rel="noreferrer">
    Rocket.Chat
    </a>
    or email at:
    <a href="mailto:bcgov.sso@gov.bc.ca" title="Pathfinder SSO" target="_blank" rel="noreferrer">
    bcgov.sso@gov.bc.ca
    </a>
</p>
<p>Thank you.<br />Pathfinder SSO Team</p>`;

export const getEmailBody = (messageType: EmailMessage, Request: Data) => {
  const {
    id,
    projectName,
    idirUserDisplayName,
    realm,
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
  } = Request;
  const devUris = formatUrisForEmail(devValidRedirectUris, 'Development');
  const testUris = formatUrisForEmail(testValidRedirectUris, 'Test');
  const prodUris = formatUrisForEmail(prodValidRedirectUris, 'Production');

  switch (messageType) {
    case 'create-request-submitted':
      return `
        <h1>Your Pathfinder SSO request #${id} is successfully submitted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by: </strong>${idirUserDisplayName}
        </p>
        <p>
            <strong>The expected processing time is 20 minutes</strong><br />
            Once the request is approved, you will receive another email that your JSON Client Installation is ready. If you are
            not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'create-request-approved':
      return `
        <h1>Your Pathfinder SSO request #${id} is approved.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${idirUserDisplayName}
        </p>
        <p>
            ${idirUserDisplayName}, please <a href="${APP_URL}/my-requests" title="Log in" target="_blank" rel="noreferrer">Log in</a>
             to your dashboard to access JSON Client Installation File.
            If you are not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'uri-change-request-submitted':
      return `
        <h1>Your Pathfinder SSO change for request #${id} is successfully submitted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${idirUserDisplayName}
        </p>
        <p>
            <strong>The expected processing time is 20 minutes</strong><br />
            Once the request is approved, you will receive another email once your JSON Client Installation is ready. If you are
            not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'uri-change-request-approved':
      return `
        <h1>Your Pathfinder SSO change for request #${id} is approved.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Submitted by:</strong>${idirUserDisplayName}
        </p>
        <p>
            ${idirUserDisplayName}, please <a href="${APP_URL}/my-requests" title="Log in" target="_blank" rel="noreferrer">Log in</a>
             to your dashboard to access JSON Client Installation File.
            If you are not the requester, this email serves only to notify you of the request status.
        </p>
        ${footer}`;

    case 'request-deleted':
      return `
        <h1>Your Pathfinder SSO request #${id} is deleted.</h1>
        <p>
            <strong>Project name: </strong>${projectName}<br /><strong>Deleted by:</strong>${idirUserDisplayName}
        </p>
        <p>This email serves only to notify you of the request status.</p>
        ${footer}`;

    case 'request-deleted-notification-to-admin':
      return `
        <h1>Pathfinder SSO request #${id} is deleted by ${idirUserDisplayName}</h1>
        <p>
            <strong>Project name: </strong>${projectName}
        </p>`;
    case 'request-limit-exceeded':
      return `
        <h1>Request Limit Exceeded</h1>
        <p>Pathfinder SSO user ${idirUserDisplayName} has exceeded their daily limit</p>
        `;
    case 'bceid-request-approved':
      return `
        <h1>Hello Pathfinder Friend,</h1>
        <p>Your production environment for BCeID <strong>integration request ID ${id}</strong> has been approved.</p>
        <p><strong>Project Name: </strong> ${projectName}</p>
        <p><strong>Submitted By: </strong> ${idirUserDisplayName}</p>

        <p>please <a href="${APP_URL}/my-requests" title="Log in" target="_blank" rel="noreferrer">Log in</a>
             to your dashboard to access JSON Client Installation File.
            If you are not the requester, this email serves only to notify you of the request status.</p>

        <p>For more direction on using your integration, visit our <a href="https://github.com/bcgov/ocp-sso/wiki" title="Log in" target="_blank" rel="noreferrer">Wiki Page</a>
        `;
    case 'bceid-idim-dev-submitted':
      return `
      <h1>Hello IDIM Team,</h1>
      <p>
        We are notifying you that a new dev and/or test integration request has been submitted. The request details are below:
      </p>

      <ul>
        <li><strong>Project name:</strong> ${projectName}</li>
        <li><strong>Accountable person:</strong> ${idirUserDisplayName}</li>
        <li><strong>URIs:</strong>
          <ul>
            ${devUris}
            ${testUris}
          </ul>
        </li>
        <li><strong>Identity Providers Required:</strong> ${realmToIDP(realm)}</li>
      </ul>

      <p>Thank you,</p>

      <p>Pathfinder SSO team.</p>
      `;

    case 'bceid-idim-prod-submitted':
      return `
      <h1>Hello IDIM Team,</h1>
      <p>
      We are notifying you that a new production integration request has been submitted. <strong>Below is a summary of the integration request details.</strong>
      </p>

      <ul>
        <li><strong>Project name:</strong> ${projectName}</li>
        <li><strong>Accountable person:</strong> ${idirUserDisplayName}</li>
        <li><strong>URIs:</strong>
          <ul>
            ${devUris}
            ${testUris}
            ${prodUris}
          </ul>
        </li>
        <li><strong>Identity Providers Required:</strong> ${realmToIDP(realm)}</li>
      </ul>

      <h1>Next Steps</h1>
      <ol>
        <li><strong>On a best effort basis, the BCeID team will endeavour to reach out to you within 2-3 business days to schedule an on-boarding meeting.</strong></li>
        <li><strong>Please have answers to the questions below, before your meeting with the IDIM team.</strong></li>
      </ol>
      <ul>
        <li>What is your estimated volume of initial users?</li>
        <li>Do you anticipate your volume of users will grow over the next three years?</li>
        <li>When do you need access to the production environment by?</li>
        <li>When will your end users need access to the production environment?</li>
      </ul>

      <p>Thank you,</p>

      <p>Pathfinder SSO team.</p>
      `;

    case 'bceid-idim-deleted':
      return `
      <h1>Hello IDIM Team,</h1>
      <p>
        We are notifying you that the client for the following integration request has requested a deletion. The request details are below:
      </p>

      <ul>
        <li><strong>Project name:</strong> ${projectName}</li>
        <li><strong>Accountable person:</strong> ${idirUserDisplayName}</li>
        <li><strong>URIs:</strong>
          <ul>
            ${devUris}
            ${testUris}
            ${prodUris}
          </ul>
        </li>
        <li><strong>Identity Providers Required:</strong> ${realmToIDP(realm)}</li>
      </ul>

      <p>Thank you,</p>

      <p>Pathfinder SSO team.</p>
      `;

    default:
      return '';
  }
};

export const getEmailSubject = (messageType: EmailMessage, id = null) => {
  const prefix = APP_ENV === 'development' ? '[DEV] ' : '';

  switch (messageType) {
    case 'create-request-submitted':
      return `${prefix}Pathfinder SSO request submitted`;
    case 'create-request-approved':
      return `${prefix}Pathfinder SSO request approved`;
    case 'uri-change-request-submitted':
      return `${prefix}Pathfinder SSO change request submitted`;
    case 'uri-change-request-approved':
      return `${prefix}Pathfinder SSO change request approved`;
    case 'request-deleted':
      return `${prefix}Pathfinder SSO request deleted`;
    case 'request-deleted-notification-to-admin':
      return `${prefix}Pathfinder SSO request deleted`;
    case 'request-limit-exceeded':
      return `${prefix}Pathfinder SSO request limit reached`;
    case 'bceid-idim-dev-submitted':
    case 'bceid-idim-prod-submitted':
      return `${prefix}New BCeID Integration Request ID ${id}`;
    case 'bceid-request-approved':
      return `${prefix}BCeID Integration Request ID ${id} Approved`;
    case `bceid-idim-deleted`:
      return `${prefix}BCeID Integration Request ID ${id} Deleted`;
    default:
      return '';
  }
};
